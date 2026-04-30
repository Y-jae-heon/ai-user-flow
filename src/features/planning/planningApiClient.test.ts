import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  analyzePlanningSession,
  createPlanningSession,
  generatePlanningMermaid,
  getPlanningApiBaseUrl,
  PlanningApiClientError,
  validatePlanningMermaid
} from './planningApiClient'
import type { PlanningInput, PlanningSessionSnapshot } from './planningSchema'

const planningInput: PlanningInput = {
  rawText: '사용자: PM\n문제: Mermaid 재작업\n기능: 분석하고 생성한다.'
}

function createSnapshot(overrides: Partial<PlanningSessionSnapshot> = {}): PlanningSessionSnapshot {
  return {
    id: 'session_test',
    version: '2026-04-29',
    status: 'ready_for_generation',
    input: planningInput,
    analysis: {
      rawText: planningInput.rawText,
      personas: ['PM'],
      entities: ['Planning Session'],
      actions: ['Analyze notes'],
      states: ['ready_for_generation'],
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
      actors: [],
      objects: [],
      actions: [],
      businessRules: [],
      exceptionPaths: []
    },
    stateMachine: null,
    validation: {
      jsonSchema: 'passed',
      mermaidSyntax: 'passed',
      cycleCheck: 'passed',
      promptInjectionCheck: 'passed',
      retryCount: 0,
      errors: []
    },
    flowDraft: null,
    mermaidDocument: null,
    ...overrides
  }
}

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => body)
  } as unknown as Response
}

function getFetchCall(): Parameters<typeof fetch>[1] {
  const fetchMock = vi.mocked(fetch)
  return fetchMock.mock.calls[0]?.[1]
}

describe('planningApiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  test('uses the default backend base URL and trims configured trailing slashes', () => {
    expect(getPlanningApiBaseUrl()).toBe('http://localhost:3001')

    vi.stubEnv('VITE_PLANNING_API_BASE_URL', 'http://localhost:4000///')

    expect(getPlanningApiBaseUrl()).toBe('http://localhost:4000')
  })

  test('creates a planning session with JSON body and idempotency header', async () => {
    const snapshot = createSnapshot({ status: 'input_received', analysis: null })
    vi.stubGlobal('fetch', vi.fn(async () => mockJsonResponse({ success: true, data: snapshot, error: null })))

    await expect(createPlanningSession(planningInput)).resolves.toEqual(snapshot)

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/planning-sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(planningInput)
      })
    )
    expect(getFetchCall()?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Idempotency-Key': expect.stringMatching(/^create_session_/)
    })
  })

  test('analyzes a persisted planning session', async () => {
    const snapshot = createSnapshot()
    vi.stubGlobal('fetch', vi.fn(async () => mockJsonResponse({ success: true, data: snapshot, error: null })))

    await expect(analyzePlanningSession('session_test', {})).resolves.toEqual(snapshot)

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/planning-sessions/session_test/analyze',
      expect.objectContaining({
        body: '{}'
      })
    )
    expect(getFetchCall()?.headers).toMatchObject({
      'Idempotency-Key': expect.stringMatching(/^analyze_session_/)
    })
  })

  test('generates Mermaid from a full session snapshot response', async () => {
    const snapshot = createSnapshot({
      status: 'ready',
      mermaidDocument: {
        code: 'flowchart TD\n  start["Start"]',
        renderStatus: 'generated',
        retryCount: 0,
        renderError: null,
        svg: null,
        isHappyPathBiased: false,
        blockedReason: null
      }
    })
    vi.stubGlobal('fetch', vi.fn(async () => mockJsonResponse({ success: true, data: snapshot, error: null })))

    await expect(generatePlanningMermaid('session_test', { session: createSnapshot() })).resolves.toEqual(snapshot)

    expect(getFetchCall()?.headers).toMatchObject({
      'Idempotency-Key': expect.stringMatching(/^generate_mermaid_/)
    })
  })

  test('validates Mermaid code and returns validation payload', async () => {
    const result = {
      mermaidDocument: {
        code: 'flowchart TD\n  a --> b',
        renderStatus: 'generated',
        retryCount: 0,
        renderError: null,
        svg: null,
        isHappyPathBiased: false,
        blockedReason: null
      },
      validation: {
        jsonSchema: 'passed',
        mermaidSyntax: 'passed',
        cycleCheck: 'passed',
        promptInjectionCheck: 'passed',
        retryCount: 0,
        errors: []
      }
    }
    vi.stubGlobal('fetch', vi.fn(async () => mockJsonResponse({ success: true, data: result, error: null })))

    await expect(validatePlanningMermaid('session_test', { code: result.mermaidDocument.code })).resolves.toEqual(result)

    expect(getFetchCall()?.headers).toMatchObject({
      'Idempotency-Key': expect.stringMatching(/^validate_mermaid_/)
    })
  })

  test('throws typed errors for API failure envelopes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        mockJsonResponse({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Request body could not be validated.',
            retryable: true
          }
        })
      )
    )

    await expect(createPlanningSession(planningInput)).rejects.toMatchObject({
      name: 'PlanningApiClientError',
      code: 'VALIDATION_FAILED',
      message: 'Request body could not be validated.',
      retryable: true
    })
  })

  test('rejects malformed success payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockJsonResponse({ success: true, data: { id: '' }, error: null })))

    await expect(createPlanningSession(planningInput)).rejects.toMatchObject({
      code: 'INVALID_API_RESPONSE',
      message: 'Planning API returned an invalid response.'
    })
  })

  test('converts network failures and aborts into typed errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))

    await expect(createPlanningSession(planningInput)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true
    })

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new DOMException('aborted', 'AbortError'))))

    await expect(createPlanningSession(planningInput)).rejects.toMatchObject({
      code: 'REQUEST_ABORTED',
      retryable: true
    })
  })

  test('uses HTTP status when the API returns invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: vi.fn(async () => Promise.reject(new Error('not json')))
      }))
    )

    await expect(createPlanningSession(planningInput)).rejects.toBeInstanceOf(PlanningApiClientError)
    await expect(createPlanningSession(planningInput)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      retryable: true
    })
  })
})
