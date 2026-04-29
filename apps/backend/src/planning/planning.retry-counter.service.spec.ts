import { InMemoryPlanningPersistence } from './planning.persistence'
import { PlanningRetryCounterService } from './planning.retry-counter.service'

const config = {
  port: 3001,
  frontendOrigin: 'http://localhost:5173',
  redisUrl: null,
  planningSessionTtlSeconds: 60,
  planningIdempotencyTtlSeconds: 60,
  planningAuditTtlSeconds: 60,
  planningMaxGenerationRetries: 5,
  rateLimitTtlMs: 60000,
  rateLimitMaxRequests: 120,
  openAiApiKey: null,
  openAiModel: 'gpt-test',
  openAiTimeoutMs: 30000,
  openAiMaxAttempts: 2
}

describe('PlanningRetryCounterService', () => {
  it('blocks operations after configured retry limits', async () => {
    const service = new PlanningRetryCounterService(new InMemoryPlanningPersistence(config))

    await expect(service.incrementOrThrow('session_test', 'generate_mermaid')).resolves.toBe(1)
    await expect(service.incrementOrThrow('session_test', 'generate_mermaid')).resolves.toBe(2)
    await expect(service.incrementOrThrow('session_test', 'generate_mermaid')).resolves.toBe(3)
    await expect(service.incrementOrThrow('session_test', 'generate_mermaid')).resolves.toBe(4)
    await expect(service.incrementOrThrow('session_test', 'generate_mermaid')).resolves.toBe(5)
    await expect(service.incrementOrThrow('session_test', 'generate_mermaid')).rejects.toThrow('Planning operation retry limit was exceeded.')
  })
})
