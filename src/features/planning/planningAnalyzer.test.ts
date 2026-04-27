import { describe, expect, test } from 'vitest'
import { analyzePlanningInput } from './planningAnalyzer'

describe('analyzePlanningInput', () => {
  test('returns insufficient guidance for empty input', () => {
    const result = analyzePlanningInput('')

    expect(result.completeness.isSufficient).toBe(false)
    expect(result.completeness.missingFields).toEqual(['user', 'problem', 'actions'])
    expect(result.completeness.guidance).toContain('주요 사용자가 누구인지 최소 1개 이상 적어주세요.')
  })

  test('returns insufficient guidance for very short vague input', () => {
    const result = analyzePlanningInput('아이디어 앱')

    expect(result.completeness.isSufficient).toBe(false)
    expect(result.completeness.score).toBe(0)
    expect(result.completeness.guidance).toHaveLength(3)
  })

  test('marks input sufficient when it includes user, problem, and actions', () => {
    const result = analyzePlanningInput(`
      사용자: 초기 창업가와 제품 기획자
      문제: 해피 패스만 정리해 예외 상황을 놓치고 개발 재작업이 발생한다.
      핵심 기능: MVP 메모를 입력하면 AI가 페르소나와 액션을 분석하고 구조화된 결과를 생성한다.
      상태: 입력 완료, 분석 성공, 오류
    `)

    expect(result.completeness.isSufficient).toBe(true)
    expect(result.personas).toContain('초기 창업가와 제품 기획자')
    expect(result.actions).toContain('MVP 메모를 입력하면 AI가 페르소나와 액션을 분석하고 구조화된 결과를 생성한다.')
    expect(result.states).toContain('입력 완료, 분석 성공, 오류')
  })

  test('generates pending logic gap suggestions for sufficient input', () => {
    const result = analyzePlanningInput(`
      주요 사용자: PM, 개발자, QA
      문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
      핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.
    `)

    expect(result.suggestions.length).toBeGreaterThanOrEqual(3)
    expect(result.suggestions.every((suggestion) => suggestion.status === 'pending')).toBe(true)
    expect(result.suggestions.map((suggestion) => suggestion.id)).toEqual(
      expect.arrayContaining(['edge-data-sync-failure', 'edge-multi-persona-notification', 'edge-onboarding-exit'])
    )
  })

  test('does not generate suggestions for insufficient input', () => {
    const result = analyzePlanningInput('아이디어 앱')

    expect(result.completeness.isSufficient).toBe(false)
    expect(result.suggestions).toEqual([])
  })

  test('detects guest purchase and member-only benefit contradiction', () => {
    const result = analyzePlanningInput(`
      사용자: 구매자
      문제: 로그인 없이 구매하고 싶지만 회원 전용 혜택도 제공해야 한다.
      핵심 기능: 사용자가 상품을 선택하고 주문을 생성한다.
    `)

    expect(result.contradictions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'conflict-auth-required-vs-guest',
          severity: 'blocking'
        })
      ])
    )
  })

  test('detects free usage and required payment contradiction', () => {
    const result = analyzePlanningInput(`
      사용자: 창업가
      문제: 무료 플랜으로 시작하지만 결제 필수 조건도 필요하다.
      핵심 기능: 사용자가 프로젝트를 만들고 구독 상태를 확인한다.
    `)

    expect(result.contradictions.map((contradiction) => contradiction.id)).toContain(
      'conflict-free-vs-required-payment'
    )
  })

  test('detects anonymous and real-name verification contradiction', () => {
    const result = analyzePlanningInput(`
      사용자: 커뮤니티 사용자
      문제: 익명으로 제보하지만 실명 인증 필수 정책도 포함된다.
      핵심 기능: 사용자가 제보를 입력하고 관리자가 검토한다.
    `)

    expect(result.contradictions.map((contradiction) => contradiction.id)).toContain(
      'conflict-anonymous-vs-real-name'
    )
  })

  test('does not report contradictions for normal sufficient input', () => {
    const result = analyzePlanningInput(`
      사용자: PM
      문제: 기획서가 다르게 해석되어 재작업이 발생한다.
      핵심 기능: 사용자가 MVP 메모를 입력하고 시스템이 분석 결과를 생성한다.
    `)

    expect(result.completeness.isSufficient).toBe(true)
    expect(result.contradictions).toEqual([])
  })

  test('recognizes Korean planning labels', () => {
    const result = analyzePlanningInput(`
      주요 사용자: PM, 개발자, QA
      해결하려는 문제: 텍스트 기획서가 사람마다 다르게 해석된다.
      주요 시나리오: 사용자가 초안을 입력하고 시스템이 누락 정보를 분석한다.
    `)

    expect(result.completeness.isSufficient).toBe(true)
    expect(result.personas[0]).toBe('PM, 개발자, QA')
    expect(result.actions[0]).toBe('사용자가 초안을 입력하고 시스템이 누락 정보를 분석한다.')
  })

  test('returns new arrays across calls', () => {
    const text = `
      사용자: PM
      문제: 예외 케이스가 누락된다.
      기능: 사용자가 기획안을 입력하고 시스템이 분석 결과를 생성한다.
    `

    const firstResult = analyzePlanningInput(text)
    const secondResult = analyzePlanningInput(text)

    expect(firstResult.actions).toEqual(secondResult.actions)
    expect(firstResult.actions).not.toBe(secondResult.actions)
    expect(firstResult.completeness.missingFields).not.toBe(secondResult.completeness.missingFields)
    expect(firstResult.suggestions).not.toBe(secondResult.suggestions)
  })
})
