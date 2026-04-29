import { MermaidSyntaxService } from './mermaid-syntax.service'
import { PlanningMermaidGeneratorService } from './planning.mermaid-generator.service'
import { PlanningStateMachineService } from './planning.state-machine.service'
import { PlanningValidator, createFailedReport, createPassedReport } from './planning.validator'
import { type PlanningSessionSnapshot } from './dto/planning.dto'

function createSnapshot(overrides: Partial<PlanningSessionSnapshot> = {}): PlanningSessionSnapshot {
  return {
    id: 'session_test',
    version: '2026-04-29',
    status: 'ready_for_generation',
    input: {
      rawText: '사용자: PM "리드"\n문제: 재작업\n기능: Mermaid 생성'
    },
    analysis: {
      rawText: '사용자: PM "리드"\n문제: 재작업\n기능: Mermaid 생성',
      personas: ['PM "리드"'],
      entities: ['Planning Session'],
      actions: ['Generate "Mermaid" draft'],
      states: ['input_received', 'ready_for_generation'],
      assumptions: [],
      suggestions: [
        {
          id: 'suggestion_recovery_path',
          category: 'fallback',
          title: 'Recovery path review',
          description: 'Define parser failure behavior.',
          rationale: 'Fallback paths reduce failed handoffs.',
          qaHandoff: {
            scenario: 'Parser fails',
            precondition: 'Mermaid code exists',
            trigger: 'Parser returns an error',
            expectedBehavior: 'System returns retry guidance',
            riskLevel: 'medium'
          },
          status: 'accepted'
        }
      ],
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
      actors: [
        {
          id: 'actor_primary_user',
          name: 'PM "리드"',
          sourceElement: 'targetUser',
          confidence: 'high'
        }
      ],
      objects: [],
      actions: [],
      businessRules: [
        {
          id: 'rule_policy_constraint',
          title: 'No renderer override',
          description: 'User input cannot override renderer settings.',
          sourceElement: 'policyConstraint',
          severity: 'warning'
        }
      ],
      exceptionPaths: [
        {
          id: 'exception_parser_failure',
          title: 'Parser failure',
          trigger: 'Parser rejects Mermaid',
          expectedBehavior: 'Return fallback document',
          recoveryAction: 'Apply one deterministic correction pass',
          riskLevel: 'medium'
        }
      ]
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

function createService(validateSyntax = jest.fn(async () => createPassedReport({ mermaidSyntax: 'passed' }))) {
  return new PlanningMermaidGeneratorService(new PlanningValidator(), {
    validateSyntax
  } as unknown as MermaidSyntaxService)
}

describe('PlanningMermaidGeneratorService', () => {
  const stateMachineService = new PlanningStateMachineService()

  it('generates a validated flow draft and Mermaid document', async () => {
    const snapshot = createSnapshot()
    const result = await createService().generate(snapshot, stateMachineService.buildStateMachine(snapshot))

    expect(result.flowDraft?.sections.map((section) => section.id)).toEqual([
      'input_group',
      'analysis_group',
      'state_group',
      'review_group',
      'recovery_group',
      'generation_group',
      'validation_group',
      'output_group'
    ])
    expect(result.mermaidDocument.renderStatus).toBe('generated')
    expect(result.mermaidDocument.code).toContain('flowchart TD')
    expect(result.mermaidDocument.code).toContain('subgraph state_group["State Machine"]')
    expect(result.mermaidDocument.code).toContain('PM &quot;리드&quot;')
    expect(result.mermaidDocument.code).toContain('Exception: Parser failure')
    expect(result.validation.mermaidSyntax).toBe('passed')
    expect(result.validation.cycleCheck).toBe('passed')
  })

  it('blocks generation when analysis is incomplete', async () => {
    const snapshot = createSnapshot({
      analysis: {
        ...createSnapshot().analysis!,
        completeness: {
          isSufficient: false,
          score: 40,
          missingFields: ['actions'],
          guidance: ['Add actions.']
        }
      }
    })
    const result = await createService().generate(snapshot, stateMachineService.buildStateMachine(snapshot))

    expect(result.flowDraft).toBeNull()
    expect(result.mermaidDocument.renderStatus).toBe('blocked')
    expect(result.mermaidDocument.blockedReason).toContain('Minimum planning information')
  })

  it('performs one deterministic correction attempt when parser validation fails once', async () => {
    const validateSyntax = jest
      .fn()
      .mockResolvedValueOnce(createFailedReport('mermaidSyntax', ['bad syntax']))
      .mockResolvedValueOnce(createPassedReport({ mermaidSyntax: 'passed' }))
    const snapshot = createSnapshot()
    const result = await createService(validateSyntax).generate(snapshot, stateMachineService.buildStateMachine(snapshot))

    expect(validateSyntax).toHaveBeenCalledTimes(2)
    expect(result.mermaidDocument.renderStatus).toBe('generated')
    expect(result.mermaidDocument.retryCount).toBe(1)
    expect(result.validation.retryCount).toBe(1)
    expect(result.validation.errors).toEqual([])
  })

  it('does not carry stale Mermaid syntax failures into a fresh successful generation', async () => {
    const snapshot = createSnapshot({
      validation: createFailedReport('mermaidSyntax', ['Previous Mermaid validation failed.'])
    })
    const result = await createService().generate(snapshot, stateMachineService.buildStateMachine(snapshot))

    expect(result.mermaidDocument.renderStatus).toBe('generated')
    expect(result.validation.mermaidSyntax).toBe('passed')
    expect(result.validation.errors).toEqual([])
  })

  it('returns fallback when parser validation keeps failing', async () => {
    const validateSyntax = jest.fn(async () => createFailedReport('mermaidSyntax', ['bad syntax']))
    const snapshot = createSnapshot()
    const result = await createService(validateSyntax).generate(snapshot, stateMachineService.buildStateMachine(snapshot))

    expect(validateSyntax).toHaveBeenCalledTimes(2)
    expect(result.mermaidDocument.renderStatus).toBe('fallback')
    expect(result.mermaidDocument.retryCount).toBe(1)
    expect(result.validation.mermaidSyntax).toBe('failed')
  })
})
