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
  })
})

