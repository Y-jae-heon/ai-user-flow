import { createSuccessEnvelope } from '../common/api-envelope'
import { InMemoryPlanningPersistence } from './planning.persistence'
import { PlanningIdempotencyService } from './planning.idempotency.service'

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

describe('PlanningIdempotencyService', () => {
  it('replays completed responses for duplicate request hashes', async () => {
    const service = new PlanningIdempotencyService(new InMemoryPlanningPersistence(config))
    const execute = jest.fn(async () => createSuccessEnvelope({ value: 'created' }))
    const options = {
      key: 'client-key-1',
      scope: {
        method: 'POST',
        path: '/api/planning-sessions/session_test/analyze',
        sessionId: 'session_test'
      },
      requestBody: {
        input: {
          rawText: 'same'
        }
      },
      execute
    }

    await expect(service.run(options)).resolves.toEqual(createSuccessEnvelope({ value: 'created' }))
    await expect(service.run(options)).resolves.toEqual(createSuccessEnvelope({ value: 'created' }))
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('rejects the same key with a different request hash', async () => {
    const service = new PlanningIdempotencyService(new InMemoryPlanningPersistence(config))

    await service.run({
      key: 'client-key-2',
      scope: {
        method: 'POST',
        path: '/api/planning-sessions'
      },
      requestBody: {
        rawText: 'first'
      },
      execute: async () => createSuccessEnvelope({ id: 'session_1' })
    })

    await expect(
      service.run({
        key: 'client-key-2',
        scope: {
          method: 'POST',
          path: '/api/planning-sessions'
        },
        requestBody: {
          rawText: 'second'
        },
        execute: async () => createSuccessEnvelope({ id: 'session_2' })
      })
    ).rejects.toThrow('Idempotency key was already used with a different request.')
  })

  it('handles undefined request bodies with a stable idempotency hash', async () => {
    const service = new PlanningIdempotencyService(new InMemoryPlanningPersistence(config))
    const execute = jest.fn(async () => createSuccessEnvelope({ value: 'validated later' }))
    const options = {
      key: 'client-key-3',
      scope: {
        method: 'POST',
        path: '/api/planning-sessions/session_test/mermaid',
        sessionId: 'session_test'
      },
      requestBody: undefined,
      execute
    }

    await expect(service.run(options)).resolves.toEqual(createSuccessEnvelope({ value: 'validated later' }))
    await expect(service.run(options)).resolves.toEqual(createSuccessEnvelope({ value: 'validated later' }))
    expect(execute).toHaveBeenCalledTimes(1)
  })
})
