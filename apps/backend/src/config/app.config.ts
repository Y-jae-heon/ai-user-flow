interface AppConfig {
  port: number
  frontendOrigin: string
}

export function getAppConfig(): AppConfig {
  return {
    port: parsePort(process.env.PORT),
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
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
