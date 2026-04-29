import { getAppConfig } from './app.config'

const ORIGINAL_ENV = process.env

describe('getAppConfig', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_TIMEOUT_MS
    delete process.env.OPENAI_MAX_ATTEMPTS
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

  it('rejects invalid OpenAI numeric configuration', () => {
    process.env.OPENAI_TIMEOUT_MS = '0'

    expect(() => getAppConfig()).toThrow('OPENAI_TIMEOUT_MS must be a positive integer.')
  })
})
