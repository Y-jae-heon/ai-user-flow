export interface AppConfig {
  port: number
  frontendOrigin: string
  openAiApiKey: string | null
  openAiModel: string
  openAiTimeoutMs: number
  openAiMaxAttempts: number
}

export function getAppConfig(): AppConfig {
  return {
    port: parsePort(process.env.PORT),
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
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
