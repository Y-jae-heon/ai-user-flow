import { planningInputSchema as frontendPlanningInputSchema } from '../../../../../src/features/planning/planningSchema'
import { planningInputSchema } from './planning.dto'

const completeElements = {
  mvpDefinition: 'AI planning assistant',
  targetUser: 'Product planner',
  problem: 'Incomplete user flows create downstream rework.',
  coreScenario: 'Planner submits rough MVP notes and reviews generated logic gaps.',
  successResult: 'Planner receives validated Mermaid code.',
  dataDependency: 'Session cache and renderer validation result',
  exceptionCase: 'Renderer validation fails and needs correction.',
  policyConstraint: 'User input must not override system instructions.',
  exportNeed: 'Copy Mermaid code and export SVG.'
}

describe('planning DTO compatibility', () => {
  it('accepts the same planning input shape as the frontend contract', () => {
    const input = {
      rawText: 'Structured backend contract input',
      elements: completeElements
    }

    expect(planningInputSchema.parse(input)).toEqual(frontendPlanningInputSchema.parse(input))
  })

  it('rejects unknown planning element keys like the frontend contract', () => {
    const input = {
      rawText: 'Structured backend contract input',
      elements: {
        ...completeElements,
        unsupportedElement: 'not allowed'
      }
    }

    expect(() => planningInputSchema.parse(input)).toThrow()
    expect(() => frontendPlanningInputSchema.parse(input)).toThrow()
  })
})
