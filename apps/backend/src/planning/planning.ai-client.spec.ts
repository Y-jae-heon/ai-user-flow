import { OpenAIPlanningAiClient, PlanningAiClientUnavailableError } from './planning.ai-client'

describe('OpenAIPlanningAiClient', () => {
  it('does not require a real OpenAI API key until extraction is invoked', async () => {
    const client = new OpenAIPlanningAiClient({
      port: 3001,
      frontendOrigin: 'http://localhost:5173',
      openAiApiKey: null,
      openAiModel: 'gpt-5.2-chat-latest',
      openAiTimeoutMs: 1000,
      openAiMaxAttempts: 1
    })

    await expect(
      client.extractPlanningLogic({
        sessionId: 'session_test',
        input: {
          rawText: '사용자: PM\n문제: 재작업\n기능: 분석 결과 생성'
        }
      })
    ).rejects.toBeInstanceOf(PlanningAiClientUnavailableError)
  })
})
