import {
  apiFailureEnvelopeSchema,
  apiSuccessEnvelopeSchema,
  planningInputSchema,
  planningSessionSnapshotSchema,
  type ApiError,
  type ApiFailureEnvelope,
  type ApiSuccessEnvelope,
  type PlanningAnalysis,
  type PlanningInput,
  type PlanningSessionSnapshot,
  type PlanningSessionStatus
} from './planningSchema'

const CONTRACT_VERSION = '2026-04-29'
const LOCAL_SESSION_ID = 'session_local_contract'

export function normalizePlanningSessionInput(input: PlanningInput): PlanningInput {
  const parsedInput = planningInputSchema.parse(input)
  const normalizedElements = parsedInput.elements ? normalizeElements(parsedInput.elements) : undefined

  return planningInputSchema.parse({
    rawText: parsedInput.rawText.trim(),
    ...(normalizedElements && { elements: normalizedElements })
  })
}

export function createPlanningSessionSnapshot(
  input: PlanningInput,
  analysis: PlanningAnalysis | null = null
): PlanningSessionSnapshot {
  const normalizedInput = normalizePlanningSessionInput(input)

  return planningSessionSnapshotSchema.parse({
    id: LOCAL_SESSION_ID,
    version: CONTRACT_VERSION,
    status: getSessionStatus(analysis),
    input: normalizedInput,
    analysis,
    dependencyAnalysis: [],
    entities: {
      actors: [],
      objects: [],
      actions: [],
      businessRules: [],
      exceptionPaths: []
    },
    stateMachine: null,
    validation: null,
    flowDraft: null,
    mermaidDocument: null
  })
}

export function createSuccessEnvelope<TData>(data: TData): ApiSuccessEnvelope {
  return apiSuccessEnvelopeSchema.parse({
    success: true,
    data,
    error: null
  })
}

export function createFailureEnvelope(error: ApiError): ApiFailureEnvelope {
  return apiFailureEnvelopeSchema.parse({
    success: false,
    data: null,
    error
  })
}

function normalizeElements(elements: PlanningInput['elements']): PlanningInput['elements'] | undefined {
  if (!elements) {
    return undefined
  }

  const normalizedEntries = Object.entries(elements)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0)

  if (normalizedEntries.length === 0) {
    return undefined
  }

  return Object.fromEntries(normalizedEntries) as PlanningInput['elements']
}

function getSessionStatus(analysis: PlanningAnalysis | null): PlanningSessionStatus {
  if (!analysis) {
    return 'input_received'
  }

  const hasBlockingContradiction = analysis.contradictions.some((contradiction) => contradiction.severity === 'blocking')

  if (!analysis.completeness.isSufficient || hasBlockingContradiction) {
    return 'needs_clarification'
  }

  return 'ready_for_generation'
}
