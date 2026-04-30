import { InMemoryPlanningPersistence, requirePlanningSession } from './planning.persistence'
import { createPassedReport } from './planning.validator'
import { type PlanningSessionSnapshot } from './dto/planning.dto'

const config = {
  port: 3001,
  frontendOrigin: 'http://localhost:5173',
  redisUrl: null,
  planningSessionTtlSeconds: 60,
  planningIdempotencyTtlSeconds: 60,
  planningAuditTtlSeconds: 60,
  planningMaxGenerationRetries: 2,
  rateLimitTtlMs: 60000,
  rateLimitMaxRequests: 120,
  openAiApiKey: null,
  openAiModel: 'gpt-test',
  openAiTimeoutMs: 30000,
  openAiMaxAttempts: 2
}

describe('InMemoryPlanningPersistence', () => {
  it('saves, reads, and requires validated planning sessions', async () => {
    const persistence = new InMemoryPlanningPersistence(config)
    const snapshot = createSnapshot()

    await persistence.saveSession(snapshot)

    await expect(persistence.getSession('session_test')).resolves.toEqual(snapshot)
    await expect(requirePlanningSession(persistence, 'session_test')).resolves.toEqual(snapshot)
    await expect(requirePlanningSession(persistence, 'missing')).rejects.toThrow('Planning session was not found or has expired.')
  })

  it('claims idempotency once and completes replay records', async () => {
    const persistence = new InMemoryPlanningPersistence(config)
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + 60_000)
    const record = {
      schemaVersion: '2026-04-29' as const,
      key: 'client-key',
      scope: 'POST:/api/planning-sessions/session_test/analyze',
      requestHash: 'a'.repeat(64),
      status: 'in_progress' as const,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      response: null
    }

    await expect(persistence.claimIdempotency(record)).resolves.toBe(true)
    await expect(persistence.claimIdempotency(record)).resolves.toBe(false)

    await persistence.completeIdempotency(record.scope, record.key, { success: true })

    await expect(persistence.getIdempotencyRecord(record.scope, record.key)).resolves.toMatchObject({
      status: 'completed',
      response: { success: true }
    })
  })

  it('increments retry counters and stores bounded audit events', async () => {
    const persistence = new InMemoryPlanningPersistence(config)

    await expect(persistence.incrementRetry('session_test', 'generate_mermaid')).resolves.toBe(1)
    await expect(persistence.incrementRetry('session_test', 'generate_mermaid')).resolves.toBe(2)

    await persistence.appendAuditEvent({
      eventId: 'event_1',
      sessionId: 'session_test',
      type: 'mermaid_generated',
      createdAt: '2026-04-30T00:00:00.000Z',
      status: 'success',
      summary: 'Mermaid generated.',
      validation: null,
      retryCount: 1,
      modelMetadata: null
    })

    await expect(persistence.listAuditEvents('session_test')).resolves.toHaveLength(1)
  })
})

function createSnapshot(): PlanningSessionSnapshot {
  return {
    id: 'session_test',
    version: '2026-04-29',
    status: 'input_received',
    input: {
      rawText: '사용자: PM\n문제: 재작업\n기능: 분석'
    },
    analysis: null,
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
    mermaidDocument: null
  }
}
