export interface AppConfig {
  port: number
  frontendOrigin: string
  redisUrl: string | null
  planningSessionTtlSeconds: number
  planningIdempotencyTtlSeconds: number
  planningAuditTtlSeconds: number
  planningMaxGenerationRetries: number
  rateLimitTtlMs: number
  rateLimitMaxRequests: number
  openAiApiKey: string | null
  openAiModel: string
  openAiTimeoutMs: number
  openAiMaxAttempts: number
}

export function getAppConfig(): AppConfig {
  return {
    port: parsePort(process.env.PORT),
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    redisUrl: parseOptionalUrl(process.env.REDIS_URL, 'REDIS_URL'),
    planningSessionTtlSeconds: parsePositiveInteger(process.env.PLANNING_SESSION_TTL_SECONDS, 86_400, 'PLANNING_SESSION_TTL_SECONDS'),
    planningIdempotencyTtlSeconds: parsePositiveInteger(process.env.PLANNING_IDEMPOTENCY_TTL_SECONDS, 3_600, 'PLANNING_IDEMPOTENCY_TTL_SECONDS'),
    planningAuditTtlSeconds: parsePositiveInteger(process.env.PLANNING_AUDIT_TTL_SECONDS, 86_400, 'PLANNING_AUDIT_TTL_SECONDS'),
    planningMaxGenerationRetries: parsePositiveInteger(process.env.PLANNING_MAX_GENERATION_RETRIES, 5, 'PLANNING_MAX_GENERATION_RETRIES'),
    rateLimitTtlMs: parsePositiveInteger(process.env.RATE_LIMIT_TTL_MS, 60_000, 'RATE_LIMIT_TTL_MS'),
    rateLimitMaxRequests: parsePositiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 120, 'RATE_LIMIT_MAX_REQUESTS'),
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
    openAiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-5.2-chat-latest',
    openAiTimeoutMs: parsePositiveInteger(process.env.OPENAI_TIMEOUT_MS, 30_000, 'OPENAI_TIMEOUT_MS'),
    openAiMaxAttempts: parsePositiveInteger(process.env.OPENAI_MAX_ATTEMPTS, 2, 'OPENAI_MAX_ATTEMPTS')
  }
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3001
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.')
  }

  return parsed
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`)
  }

  return parsed
}

function parseOptionalUrl(value: string | undefined, name: string): string | null {
  const trimmedValue = value?.trim()
  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    if (!['redis:', 'rediss:'].includes(parsedUrl.protocol)) {
      throw new Error()
    }

    return parsedUrl.toString()
  } catch {
    throw new Error(`${name} must be a valid redis:// or rediss:// URL.`)
  }
}
