import { describe, expect, test, vi } from 'vitest'
import {
  correctMermaidSyntax,
  renderMermaidDocument,
  unavailableMermaidAdapter,
  type MermaidAdapter
} from './mermaidRenderer'
import { analyzePlanningInput } from './planningAnalyzer'
import { generateMermaidFlow } from './mermaidGenerator'

function createAdapter(options: {
  parseResults?: readonly ('pass' | 'fail' | Error)[]
  renderResults?: readonly (string | Error)[]
}): MermaidAdapter {
  const parseResults = [...(options.parseResults ?? ['pass'])]
  const renderResults = [...(options.renderResults ?? ['<svg data-test="diagram"></svg>'])]

  return {
    initialize: vi.fn(),
    parse: vi.fn(async () => {
      const result = parseResults.shift() ?? 'pass'
      if (result instanceof Error) {
        throw result
      }

      return result !== 'fail'
    }),
    render: vi.fn(async () => {
      const result = renderResults.shift() ?? '<svg data-test="diagram"></svg>'
      if (result instanceof Error) {
        throw result
      }

      return { svg: result }
    })
  }
}

describe('renderMermaidDocument', () => {
  test('renders valid Mermaid code through the official renderer by default', async () => {
    const result = await renderMermaidDocument('flowchart TD\n  a["Start"] --> b["End"]')

    expect(result.renderStatus).toBe('rendered')
    expect(result.retryCount).toBe(0)
    expect(result.svg).toContain('<svg')
    expect(result.renderError).toBeNull()
  })

  test('renders generated planner flowcharts through the official renderer', async () => {
    const analysis = analyzePlanningInput(`
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
사용자: PM, 개발자, QA 엔지니어
행동: MVP 메모 입력, 예외 제안 검토, Mermaid 코드 생성
데이터: 분석 결과, 예외 제안, Mermaid 문서 상태
성공: 공식 Mermaid preview와 복사 가능한 코드가 함께 제공된다.
`)
    const generatedDocument = generateMermaidFlow({
      analysis,
      suggestions: analysis.suggestions
    })

    const result = await renderMermaidDocument(generatedDocument.code)

    expect(result.renderStatus).toBe('rendered')
    expect(result.svg).toContain('<svg')
    expect(result.code).toContain('flowchart TD')
  })

  test('falls back instead of claiming a rendered preview when Mermaid is unavailable', async () => {
    const result = await renderMermaidDocument('flowchart TD\n  a["Start"]', { adapter: unavailableMermaidAdapter })

    expect(result.renderStatus).toBe('fallback')
    expect(result.retryCount).toBe(1)
    expect(result.svg).toBeNull()
    expect(result.renderError).toContain('Official Mermaid renderer is not configured')
  })

  test('does not mark invalid Mermaid code as rendered', async () => {
    const result = await renderMermaidDocument('notMermaid\n  a --> b')

    expect(result.renderStatus).toBe('fallback')
    expect(result.retryCount).toBe(1)
    expect(result.svg).toBeNull()
    expect(result.renderError).toBeTruthy()
  })

  test('returns rendered status for valid Mermaid code', async () => {
    const adapter = createAdapter({
      renderResults: ['<svg><g>ok</g></svg>']
    })
    const result = await renderMermaidDocument('flowchart TD\n  a["Start"]', { adapter })

    expect(result.renderStatus).toBe('rendered')
    expect(result.svg).toBe('<svg><g>ok</g></svg>')
    expect(result.retryCount).toBe(0)
    expect(adapter.render).toHaveBeenCalledTimes(1)
  })

  test('runs exactly one correction attempt and succeeds when corrected code renders', async () => {
    const adapter = createAdapter({
      parseResults: [new Error('bad syntax'), 'pass'],
      renderResults: ['<svg><g>fixed</g></svg>']
    })
    const result = await renderMermaidDocument('graph TD\n  a[Start]', { adapter })

    expect(result.renderStatus).toBe('rendered')
    expect(result.retryCount).toBe(1)
    expect(result.code).toBe('flowchart TD\n  a["Start"]')
    expect(result.svg).toBe('<svg><g>fixed</g></svg>')
    expect(adapter.parse).toHaveBeenCalledTimes(2)
    expect(adapter.render).toHaveBeenCalledTimes(1)
  })

  test('falls back after one failed correction attempt', async () => {
    const adapter = createAdapter({
      parseResults: [new Error('first failure'), new Error('second failure')]
    })
    const result = await renderMermaidDocument('graph TD\n  a[Start]', { adapter })

    expect(result.renderStatus).toBe('fallback')
    expect(result.retryCount).toBe(1)
    expect(result.renderError).toBe('second failure')
    expect(result.code).toBe('flowchart TD\n  a["Start"]')
    expect(result.svg).toBeNull()
    expect(adapter.parse).toHaveBeenCalledTimes(2)
  })
})

describe('correctMermaidSyntax', () => {
  test('normalizes common Mermaid syntax mistakes', () => {
    const corrected = correctMermaidSyntax(`graph TD


  start[Start]
  next["Already quoted"]`)

    expect(corrected).toBe(`flowchart TD

  start["Start"]
  next["Already quoted"]`)
  })
})
