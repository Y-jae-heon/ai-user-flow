import { z } from 'zod'
import {
  apiFailureEnvelopeSchema,
  mermaidGenerationResponseSchema,
  mermaidValidationResponseSchema,
  planningInputSchema,
  planningSessionResponseSchema,
  planningSessionSnapshotSchema,
  type ApiError,
  type MermaidDocument,
  type PlanningInput,
  type PlanningSessionSnapshot,
  type PlanningValidationReport
} from './planningSchema'

const DEFAULT_API_BASE_URL = 'http://localhost:3001'
const JSON_HEADERS = {
  'Content-Type': 'application/json'
}

let idempotencyCounter = 0

export interface PlanningApiRequestOptions {
  signal?: AbortSignal
}

export interface PlanningAnalysisRequest {
  session?: PlanningSessionSnapshot
  input?: PlanningInput
}

export interface MermaidGenerationRequest {
  session?: PlanningSessionSnapshot
}

export interface MermaidValidationRequest {
  code: string
}

export interface MermaidValidationResult {
  mermaidDocument: MermaidDocument
  validation: PlanningValidationReport
}

export class PlanningApiClientError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly details?: unknown

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'PlanningApiClientError'
    this.code = error.code
    this.retryable = error.retryable
    this.details = error.details
  }
}

export function getPlanningApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_PLANNING_API_BASE_URL?.trim()
  return trimTrailingSlash(configuredUrl && configuredUrl.length > 0 ? configuredUrl : DEFAULT_API_BASE_URL)
}

export async function createPlanningSession(
  input: PlanningInput,
  options: PlanningApiRequestOptions = {}
): Promise<PlanningSessionSnapshot> {
  const parsedInput = planningInputSchema.parse(input)
  const response = await requestPlanningApi({
    path: '/api/planning-sessions',
    body: parsedInput,
    idempotencyPrefix: 'create_session',
    responseSchema: planningSessionResponseSchema,
    signal: options.signal
  })

  return response.data
}

export async function analyzePlanningSession(
  sessionId: string,
  request: PlanningAnalysisRequest = {},
  options: PlanningApiRequestOptions = {}
): Promise<PlanningSessionSnapshot> {
  const response = await requestPlanningApi({
    path: `/api/planning-sessions/${encodeURIComponent(sessionId)}/analyze`,
    body: parsePlanningAnalysisRequest(request),
    idempotencyPrefix: 'analyze_session',
    responseSchema: planningSessionResponseSchema,
    signal: options.signal
  })

  return response.data
}

export async function generatePlanningMermaid(
  sessionId: string,
  request: MermaidGenerationRequest = {},
  options: PlanningApiRequestOptions = {}
): Promise<PlanningSessionSnapshot> {
  const response = await requestPlanningApi({
    path: `/api/planning-sessions/${encodeURIComponent(sessionId)}/mermaid`,
    body: parseMermaidGenerationRequest(request),
    idempotencyPrefix: 'generate_mermaid',
    responseSchema: mermaidGenerationResponseSchema,
    signal: options.signal
  })

  return response.data
}

export async function validatePlanningMermaid(
  sessionId: string,
  request: MermaidValidationRequest,
  options: PlanningApiRequestOptions = {}
): Promise<MermaidValidationResult> {
  const response = await requestPlanningApi({
    path: `/api/planning-sessions/${encodeURIComponent(sessionId)}/mermaid/validate`,
    body: z.object({ code: z.string().min(1) }).parse(request),
    idempotencyPrefix: 'validate_mermaid',
    responseSchema: mermaidValidationResponseSchema,
    signal: options.signal
  })

  return response.data
}

function parsePlanningAnalysisRequest(request: PlanningAnalysisRequest): PlanningAnalysisRequest {
  return z
    .object({
      session: planningSessionSnapshotSchema.optional(),
      input: planningInputSchema.optional()
    })
    .strict()
    .parse(request)
}

function parseMermaidGenerationRequest(request: MermaidGenerationRequest): MermaidGenerationRequest {
  return z
    .object({
      session: planningSessionSnapshotSchema.optional()
    })
    .strict()
    .parse(request)
}

async function requestPlanningApi<TResponse>(input: {
  path: string
  body: unknown
  idempotencyPrefix: string
  responseSchema: z.ZodType<TResponse>
  signal?: AbortSignal
}): Promise<TResponse> {
  let response: Response

  try {
    response = await fetch(`${getPlanningApiBaseUrl()}${input.path}`, {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        'Idempotency-Key': createIdempotencyKey(input.idempotencyPrefix)
      },
      body: JSON.stringify(input.body),
      signal: input.signal
    })
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw new PlanningApiClientError({
        code: 'REQUEST_ABORTED',
        message: 'Request was cancelled.',
        retryable: true
      })
    }

    throw new PlanningApiClientError({
      code: 'NETWORK_ERROR',
      message: 'Planning API request failed.',
      retryable: true
    })
  }

  const payload = await parseJsonResponse(response)
  const failureEnvelope = apiFailureEnvelopeSchema.safeParse(payload)
  if (failureEnvelope.success) {
    throw new PlanningApiClientError(failureEnvelope.data.error)
  }

  const parsedResponse = input.responseSchema.safeParse(payload)
  if (!parsedResponse.success) {
    throw new PlanningApiClientError({
      code: 'INVALID_API_RESPONSE',
      message: 'Planning API returned an invalid response.',
      retryable: true,
      details: parsedResponse.error.flatten()
    })
  }

  return parsedResponse.data
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new PlanningApiClientError({
      code: response.ok ? 'INVALID_API_RESPONSE' : 'HTTP_ERROR',
      message: response.ok ? 'Planning API returned invalid JSON.' : `Planning API request failed with status ${response.status}.`,
      retryable: response.status >= 500
    })
  }
}

function createIdempotencyKey(prefix: string): string {
  idempotencyCounter += 1
  const uniquePart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${idempotencyCounter}`

  return `${prefix}_${uniquePart}`
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
