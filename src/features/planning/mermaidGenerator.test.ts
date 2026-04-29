import { describe, expect, test } from 'vitest'
import { analyzePlanningInput } from './planningAnalyzer'
import { generateMermaidFlow } from './mermaidGenerator'
import type { LogicGapSuggestion } from './planningSchema'

function createSufficientAnalysis() {
  return analyzePlanningInput(`
    주요 사용자: PM, 개발자, QA
    문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
    핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.
    상태: 입력 완료, 분석 성공, 오류
  `)
}

function withStatus(suggestions: readonly LogicGapSuggestion[], id: string, status: LogicGapSuggestion['status']) {
  return suggestions.map((suggestion) => {
    if (suggestion.id !== id) {
      return suggestion
    }

    return {
      ...suggestion,
      status
    }
  })
}

describe('generateMermaidFlow', () => {
  test('generates flowchart code from sufficient analysis and accepted suggestions', () => {
    const analysis = createSufficientAnalysis()
    const suggestions = withStatus(analysis.suggestions, 'edge-data-sync-failure', 'accepted')
    const result = generateMermaidFlow({ analysis, suggestions })

    expect(result.renderStatus).toBe('generated')
    expect(result.code.startsWith('flowchart TD')).toBe(true)
    expect(result.code).toContain('subgraph input_group["Input"]')
    expect(result.code).toContain('PM, 개발자, QA')
    expect(result.code).toContain('입력 완료, 분석 성공, 오류')
    expect(result.code).toContain('Exception: Data sync failure')
    expect(result.isHappyPathBiased).toBe(false)
  })

  test('does not include rejected suggestions as exception nodes', () => {
    const analysis = createSufficientAnalysis()
    const suggestions = withStatus(
      withStatus(analysis.suggestions, 'edge-data-sync-failure', 'accepted'),
      'edge-multi-persona-notification',
      'rejected'
    )
    const result = generateMermaidFlow({ analysis, suggestions })

    expect(result.code).toContain('Exception: Data sync failure')
    expect(result.code).not.toContain('Exception: Multi-persona notification gap')
  })

  test('marks the diagram as happy-path biased when every suggestion is rejected', () => {
    const analysis = createSufficientAnalysis()
    const suggestions = analysis.suggestions.map((suggestion) => ({
      ...suggestion,
      status: 'rejected' as const
    }))
    const result = generateMermaidFlow({ analysis, suggestions })

    expect(result.isHappyPathBiased).toBe(true)
    expect(result.code).toContain('Warning: no exception paths accepted')
  })

  test('blocks generation when a blocking contradiction exists', () => {
    const analysis = analyzePlanningInput(`
      사용자: 구매자
      문제: 로그인 없이 구매해야 하지만 회원 전용 혜택도 제공해야 한다.
      핵심 기능: 사용자가 상품을 선택하고 주문을 생성한다.
    `)
    const result = generateMermaidFlow({ analysis, suggestions: analysis.suggestions })

    expect(result.renderStatus).toBe('blocked')
    expect(result.code).toBe('')
    expect(result.blockedReason).toContain('Guest purchase conflicts with member-only benefit')
  })

  test('escapes labels with quotes, brackets, parentheses, and Korean text', () => {
    const analysis = analyzePlanningInput(`
      사용자: PM "리드" [검토자]
      문제: 요구사항(초안)이 서로 다르게 해석되어 재작업이 발생한다.
      핵심 기능: 사용자가 "노드"를 입력하면 시스템이 [조건](초안)을 생성한다.
    `)
    const result = generateMermaidFlow({ analysis, suggestions: analysis.suggestions })

    expect(result.code).toContain('PM &quot;리드&quot; [검토자]')
    expect(result.code).toContain('[조건](초안)')
    expect(result.code).not.toContain('PM "리드"')
  })
})
