import { PlanningService } from './planning.service'
import { MermaidSyntaxService } from './mermaid-syntax.service'
import { PlanningValidator, createPassedReport } from './planning.validator'
import { PlanningStateMachineService } from './planning.state-machine.service'
import { PlanningMermaidGeneratorService } from './planning.mermaid-generator.service'
import { type PlanningSessionSnapshot } from './dto/planning.dto'
import { InMemoryPlanningPersistence } from './planning.persistence'
import { PlanningIdempotencyService } from './planning.idempotency.service'
import { PlanningRetryCounterService } from './planning.retry-counter.service'
import { PlanningAuditService } from './planning.audit.service'

const config = {
  port: 3001,
  frontendOrigin: 'http://localhost:5173',
  redisUrl: null,
  planningSessionTtlSeconds: 60,
  planningIdempotencyTtlSeconds: 60,
  planningAuditTtlSeconds: 60,
  planningMaxGenerationRetries: 10,
  rateLimitTtlMs: 60000,
  rateLimitMaxRequests: 120,
  openAiApiKey: null,
  openAiModel: 'gpt-test',
  openAiTimeoutMs: 30000,
  openAiMaxAttempts: 2
}

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
  const stateMachineService = new PlanningStateMachineService()
  const mermaidGeneratorService = new PlanningMermaidGeneratorService(validator, mermaidSyntaxService)
  let persistence: InMemoryPlanningPersistence
  let service: PlanningService

  beforeEach(() => {
    jest.mocked(mermaidSyntaxService.validateSyntax).mockClear()
    persistence = new InMemoryPlanningPersistence(config)
    service = new PlanningService(
      validator,
      mermaidSyntaxService,
      undefined,
      stateMachineService,
      mermaidGeneratorService,
      persistence,
      new PlanningIdempotencyService(persistence),
      new PlanningRetryCounterService(persistence),
      new PlanningAuditService(persistence)
    )
  })

  it('creates and persists a normalized planning session snapshot', async () => {
    const response = await service.createPlanningSession({
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
    await expect(persistence.getSession(response.data.id)).resolves.toMatchObject({
      id: response.data.id,
      input: response.data.input
    })
  })

  it('throws validation errors for unknown fields', async () => {
    await expect(
      service.createPlanningSession({
        rawText: 'input',
        elements: {
          unsupportedElement: 'nope'
        }
      })
    ).rejects.toThrow()
  })

  it('loads a persisted planning session', async () => {
    const createResponse = await service.createPlanningSession({
      rawText: '사용자: PM\n문제: 재작업\n기능: 분석 결과 생성'
    })

    await expect(service.getPlanningSession(createResponse.data.id)).resolves.toMatchObject({
      success: true,
      data: {
        id: createResponse.data.id
      }
    })
  })

  it('generates Mermaid and updates the planning session snapshot', async () => {
    const snapshot = createReadySnapshot()
    const response = await service.generateMermaid('session_test', {
      session: snapshot
    })

    expect(response.success).toBe(true)
    expect(response.data.status).toBe('ready')
    expect(response.data.stateMachine?.initialState).toBe('input_received')
    expect(response.data.flowDraft?.nodes.some((node) => node.id === 'generate_code')).toBe(true)
    expect(response.data.mermaidDocument?.renderStatus).toBe('generated')
    expect(response.data.mermaidDocument?.code).toContain('flowchart TD')
    expect(response.data.validation?.mermaidSyntax).toBe('passed')
  })

  it('generates Mermaid from a persisted snapshot when the body is empty', async () => {
    await persistence.saveSession(createReadySnapshot())

    const response = await service.generateMermaid('session_test', {})

    expect(response.success).toBe(true)
    expect(response.data.status).toBe('ready')
    await expect(persistence.getSession('session_test')).resolves.toMatchObject({
      status: 'ready',
      mermaidDocument: {
        renderStatus: 'generated'
      }
    })
  })

  it('replays idempotent Mermaid generation without rerunning parser validation', async () => {
    await persistence.saveSession(createReadySnapshot())

    await service.generateMermaid('session_test', {}, 'client-key-1')
    await service.generateMermaid('session_test', {}, 'client-key-1')

    expect(mermaidSyntaxService.validateSyntax).toHaveBeenCalledTimes(1)
  })

  it('throws validation errors when route and body session ids differ', async () => {
    await expect(
      service.generateMermaid('session_route', {
        session: createReadySnapshot()
      })
    ).rejects.toThrow()
  })
})

function createReadySnapshot(): PlanningSessionSnapshot {
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
      states: ['input_received', 'ready_for_generation'],
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
      actors: [
        {
          id: 'actor_primary_user',
          name: 'PM',
          sourceElement: 'targetUser',
          confidence: 'high'
        }
      ],
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
    mermaidDocument: null
  }
}
