import { PlanningStateMachineService } from './planning.state-machine.service'
import { PlanningValidator, createPassedReport } from './planning.validator'
import { type PlanningSessionSnapshot } from './dto/planning.dto'

function createSnapshot(overrides: Partial<PlanningSessionSnapshot> = {}): PlanningSessionSnapshot {
  return {
    id: 'session_test',
    version: '2026-04-29',
    status: 'ready_for_generation',
    input: {
      rawText: '사용자: PM\n문제: 재작업\n기능: Mermaid 생성'
    },
    analysis: {
      rawText: '사용자: PM\n문제: 재작업\n기능: Mermaid 생성',
      personas: ['PM'],
      entities: ['Planning Session'],
      actions: ['Generate Mermaid'],
      states: ['ready_for_generation'],
      assumptions: [],
      suggestions: [],
      contradictions: [],
      completeness: {
        isSufficient: true,
        score: 100,
        missingFields: [],
        guidance: []
      }
    },
    dependencyAnalysis: [],
    entities: {
      actors: [],
      objects: [],
      actions: [],
      businessRules: [],
      exceptionPaths: []
    },
    stateMachine: null,
    validation: createPassedReport({
      jsonSchema: 'passed',
      promptInjectionCheck: 'passed'
    }),
    flowDraft: null,
    mermaidDocument: null,
    ...overrides
  }
}

describe('PlanningStateMachineService', () => {
  const service = new PlanningStateMachineService()
  const validator = new PlanningValidator()

  it('builds a valid bounded generation state machine', () => {
    const stateMachine = service.buildStateMachine(createSnapshot())

    expect(stateMachine.initialState).toBe('input_received')
    expect(stateMachine.states.map((state) => state.id)).toContain('validating_output')
    expect(stateMachine.transitions).toContainEqual({
      from: 'self_correcting',
      to: 'validating_output',
      condition: 'deterministic_correction_applied',
      isRetry: true
    })
    expect(validator.validateGraphCycles(stateMachine).cycleCheck).toBe('passed')
  })

  it('routes blocking contradictions to needs clarification', () => {
    const stateMachine = service.buildStateMachine(
      createSnapshot({
        analysis: {
          ...createSnapshot().analysis!,
          contradictions: [
            {
              id: 'conflict_payment_policy',
              severity: 'blocking',
              title: 'Payment policy conflict',
              description: 'Free and paid requirements conflict.',
              signals: ['free', 'paid'],
              resolutionPrompt: 'Separate free and paid behavior.'
            }
          ]
        }
      })
    )

    expect(stateMachine.transitions).toContainEqual({
      from: 'parsing',
      to: 'needs_clarification',
      condition: 'blocking_issue_found'
    })
    expect(validator.validateGraphCycles(stateMachine).cycleCheck).toBe('passed')
  })
})
