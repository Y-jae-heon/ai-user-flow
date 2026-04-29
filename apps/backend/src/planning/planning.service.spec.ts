import { PlanningService } from './planning.service'
import { MermaidSyntaxService } from './mermaid-syntax.service'
import { PlanningValidator } from './planning.validator'

describe('PlanningService', () => {
  const validator = new PlanningValidator()
  const mermaidSyntaxService = {
    validateSyntax: jest.fn(async () => ({
      jsonSchema: 'skipped',
      mermaidSyntax: 'passed',
      cycleCheck: 'skipped',
      promptInjectionCheck: 'skipped',
      retryCount: 0,
      errors: []
    }))
  } as unknown as MermaidSyntaxService
  const service = new PlanningService(validator, mermaidSyntaxService)

  it('creates a normalized planning session snapshot', () => {
    const response = service.createPlanningSession({
      rawText: '  사용자: PM\n문제: 재작업\n기능: 분석 결과 생성  ',
      elements: {
        targetUser: '  Product planner  ',
        exceptionCase: '   '
      }
    })

    expect(response.success).toBe(true)
    expect(response.data.id).toMatch(/^session_/)
    expect(response.data.input.rawText).toBe('사용자: PM\n문제: 재작업\n기능: 분석 결과 생성')
    expect(response.data.input.elements).toEqual({
      targetUser: 'Product planner'
    })
    expect(response.data.validation?.jsonSchema).toBe('passed')
  })

  it('throws validation errors for unknown fields', () => {
    expect(() =>
      service.createPlanningSession({
        rawText: 'input',
        elements: {
          unsupportedElement: 'nope'
        }
      })
    ).toThrow()
  })
})
