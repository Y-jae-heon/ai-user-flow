import { getAppConfig } from './app.config'

const ORIGINAL_ENV = process.env

describe('getAppConfig', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_TIMEOUT_MS
    delete process.env.OPENAI_MAX_ATTEMPTS
    delete process.env.REDIS_URL
    delete process.env.PLANNING_SESSION_TTL_SECONDS
    delete process.env.PLANNING_IDEMPOTENCY_TTL_SECONDS
    delete process.env.PLANNING_AUDIT_TTL_SECONDS
    delete process.env.PLANNING_MAX_GENERATION_RETRIES
    delete process.env.RATE_LIMIT_TTL_MS
    delete process.env.RATE_LIMIT_MAX_REQUESTS
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('uses OpenAI defaults without requiring an API key at startup', () => {
    const config = getAppConfig()

    expect(config.openAiApiKey).toBeNull()
    expect(config.openAiModel).toBe('gpt-5.2-chat-latest')
    expect(config.openAiTimeoutMs).toBe(30000)
    expect(config.openAiMaxAttempts).toBe(2)
  })

  it('parses OpenAI environment overrides', () => {
    process.env.OPENAI_API_KEY = ' test-key '
    process.env.OPENAI_MODEL = ' gpt-test '
    process.env.OPENAI_TIMEOUT_MS = '1000'
    process.env.OPENAI_MAX_ATTEMPTS = '3'

    expect(getAppConfig()).toMatchObject({
      openAiApiKey: 'test-key',
      openAiModel: 'gpt-test',
      openAiTimeoutMs: 1000,
      openAiMaxAttempts: 3
    })
  })

  it('uses local resilience defaults without requiring Redis at startup', () => {
    const config = getAppConfig()

    expect(config.redisUrl).toBeNull()
    expect(config.planningSessionTtlSeconds).toBe(86400)
    expect(config.planningIdempotencyTtlSeconds).toBe(3600)
    expect(config.planningAuditTtlSeconds).toBe(86400)
    expect(config.planningMaxGenerationRetries).toBe(5)
    expect(config.rateLimitTtlMs).toBe(60000)
    expect(config.rateLimitMaxRequests).toBe(120)
  })

  it('parses resilience environment overrides', () => {
    process.env.REDIS_URL = ' redis://localhost:6379/1 '
    process.env.PLANNING_SESSION_TTL_SECONDS = '120'
    process.env.PLANNING_IDEMPOTENCY_TTL_SECONDS = '60'
    process.env.PLANNING_AUDIT_TTL_SECONDS = '180'
    process.env.PLANNING_MAX_GENERATION_RETRIES = '2'
    process.env.RATE_LIMIT_TTL_MS = '1000'
    process.env.RATE_LIMIT_MAX_REQUESTS = '5'

    expect(getAppConfig()).toMatchObject({
      redisUrl: 'redis://localhost:6379/1',
      planningSessionTtlSeconds: 120,
      planningIdempotencyTtlSeconds: 60,
      planningAuditTtlSeconds: 180,
      planningMaxGenerationRetries: 2,
      rateLimitTtlMs: 1000,
      rateLimitMaxRequests: 5
    })
  })

  it('rejects invalid OpenAI numeric configuration', () => {
    process.env.OPENAI_TIMEOUT_MS = '0'

    expect(() => getAppConfig()).toThrow('OPENAI_TIMEOUT_MS must be a positive integer.')
  })

  it('rejects invalid Redis URLs and resilience numeric configuration', () => {
    process.env.REDIS_URL = 'https://example.com'
    expect(() => getAppConfig()).toThrow('REDIS_URL must be a valid redis:// or rediss:// URL.')

    process.env.REDIS_URL = 'redis://localhost:6379'
    process.env.PLANNING_SESSION_TTL_SECONDS = '0'
    expect(() => getAppConfig()).toThrow('PLANNING_SESSION_TTL_SECONDS must be a positive integer.')
  })
})
