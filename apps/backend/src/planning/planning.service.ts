import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { createSuccessEnvelope } from '../common/api-envelope'
import { safeParseWithMessages } from '../common/validation/zod-validation'
import {
  mermaidDocumentSchema,
  mermaidGenerationRequestSchema,
  mermaidValidationRequestSchema,
  planningAnalysisRequestSchema,
  planningInputSchema,
  planningSessionSnapshotSchema,
  type MermaidDocument,
  type MermaidValidationRequest,
  type MissingField,
  type PlanningCompleteness,
  type PlanningInput,
  type PlanningSessionSnapshot,
  type PlanningValidationReport
} from './dto/planning.dto'
import { PlanningExtractionService } from './planning.extraction.service'
import { MermaidSyntaxService } from './mermaid-syntax.service'
import { createFailedReport, createPassedReport, PlanningValidator } from './planning.validator'
import { PlanningStateMachineService } from './planning.state-machine.service'
import { PlanningMermaidGeneratorService } from './planning.mermaid-generator.service'
import { PlanningIdempotencyService } from './planning.idempotency.service'
import { PLANNING_PERSISTENCE, requirePlanningSession, type PlanningPersistence } from './planning.persistence'
import { PlanningRetryCounterService } from './planning.retry-counter.service'
import { PlanningAuditService } from './planning.audit.service'

const CONTRACT_VERSION = '2026-04-29'

const GUIDANCE_BY_FIELD: Record<MissingField, string> = {
  user: '주요 사용자가 누구인지 최소 1개 이상 적어주세요.',
  problem: '사용자가 겪는 문제나 현재 대안의 한계를 적어주세요.',
  actions: '사용자가 수행하는 핵심 액션이나 주요 시나리오를 적어주세요.'
}

@Injectable()
export class PlanningService {
  constructor(
    private readonly planningValidator: PlanningValidator,
    private readonly mermaidSyntaxService: MermaidSyntaxService,
    private readonly planningExtractionService?: PlanningExtractionService,
    private readonly planningStateMachineService?: PlanningStateMachineService,
    private readonly planningMermaidGeneratorService?: PlanningMermaidGeneratorService,
    @Optional() @Inject(PLANNING_PERSISTENCE) private readonly persistence?: PlanningPersistence,
    @Optional() private readonly planningIdempotencyService?: PlanningIdempotencyService,
    @Optional() private readonly planningRetryCounterService?: PlanningRetryCounterService,
    @Optional() private readonly planningAuditService?: PlanningAuditService
  ) {}

  async createPlanningSession(input: unknown, idempotencyKey?: string | null) {
    return this.runIdempotently({
      idempotencyKey,
      method: 'POST',
      path: '/api/planning-sessions',
      requestBody: input,
      execute: async () => this.createPlanningSessionOnce(input)
    })
  }

  async getPlanningSession(sessionId: string) {
    const snapshot = await this.requireStoredSession(sessionId)
    await this.recordAudit({
      sessionId,
      type: 'session_loaded',
      status: 'success',
      summary: 'Planning session loaded.'
    })

    return createSuccessEnvelope(snapshot)
  }

  private async createPlanningSessionOnce(input: unknown) {
    const parsedInput = safeParseWithMessages(planningInputSchema, input)
    if (!parsedInput.ok) {
      throwValidationError(parsedInput.errors)
    }

    const normalizedInput = normalizePlanningInput(parsedInput.value)
    const validation = this.planningValidator.mergeValidationReports([
      this.planningValidator.validatePlanningInput(input),
      this.planningValidator.validatePromptInjection(normalizedInput)
    ])
    const completeness = calculateCompleteness(normalizedInput)
    const snapshot = createSessionSnapshot(normalizedInput, completeness, validation)

    await this.persistence?.saveSession(snapshot)
    await this.recordAudit({
      sessionId: snapshot.id,
      type: 'session_created',
      status: validation.promptInjectionCheck === 'failed' ? 'blocked' : 'success',
      summary: 'Planning session created.',
      validation: snapshot.validation
    })

    return createSuccessEnvelope(snapshot)
  }

  async analyzePlanningSession(sessionId: string, request: unknown, idempotencyKey?: string | null) {
    return this.runIdempotently({
      idempotencyKey,
      method: 'POST',
      path: `/api/planning-sessions/${sessionId}/analyze`,
      sessionId,
      requestBody: request ?? {},
      execute: async () => this.analyzePlanningSessionOnce(sessionId, request ?? {})
    })
  }

  private async analyzePlanningSessionOnce(sessionId: string, request: unknown) {
    if (!this.planningExtractionService) {
      throwValidationError(['Planning extraction service is not configured.'])
    }

    const parsedRequest = safeParseWithMessages(planningAnalysisRequestSchema, request)
    if (!parsedRequest.ok) {
      throwValidationError(parsedRequest.errors)
    }

    const snapshot = parsedRequest.value.session ?? (parsedRequest.value.input ? createSessionSnapshotFromInput(sessionId, parsedRequest.value.input) : await this.requireStoredSession(sessionId))
    if (snapshot.id !== sessionId) {
      throwValidationError(['Route sessionId must match the supplied session id.'])
    }

    const analyzedSnapshot = await this.planningExtractionService.analyzeSession(snapshot)
    await this.persistence?.saveSession(analyzedSnapshot)
    await this.recordAudit({
      sessionId,
      type: 'analysis_completed',
      status: analyzedSnapshot.status === 'needs_clarification' ? 'blocked' : 'success',
      summary: 'Planning analysis completed.',
      validation: analyzedSnapshot.validation
    })

    return createSuccessEnvelope(analyzedSnapshot)
  }

  async validateMermaid(sessionId: string, request: unknown, idempotencyKey?: string | null) {
    return this.runIdempotently({
      idempotencyKey,
      method: 'POST',
      path: `/api/planning-sessions/${sessionId}/mermaid/validate`,
      sessionId,
      requestBody: request,
      execute: async () => this.validateMermaidOnce(sessionId, request)
    })
  }

  private async validateMermaidOnce(sessionId: string, request: unknown) {
    const parsedRequest = safeParseWithMessages(mermaidValidationRequestSchema, request)
    if (!parsedRequest.ok) {
      throwValidationError(parsedRequest.errors)
    }

    await this.planningRetryCounterService?.incrementOrThrow(sessionId, 'validate_mermaid')
    const safetyReport = this.planningValidator.validateMermaidSafety(parsedRequest.value.code)
    const syntaxReport =
      safetyReport.mermaidSyntax === 'failed'
        ? createPassedReport({ mermaidSyntax: 'skipped' })
        : await this.mermaidSyntaxService.validateSyntax(parsedRequest.value.code)
    const validation = this.planningValidator.mergeValidationReports([safetyReport, syntaxReport])
    const mermaidDocument = createMermaidValidationDocument(parsedRequest.value, validation)

    await this.recordAudit({
      sessionId,
      type: 'mermaid_validated',
      status: validation.mermaidSyntax === 'failed' ? 'failed' : 'success',
      summary: 'Mermaid code validated.',
      validation,
      retryCount: validation.retryCount
    })

    return createSuccessEnvelope({
      mermaidDocument,
      validation
    })
  }

  async generateMermaid(sessionId: string, request: unknown, idempotencyKey?: string | null) {
    return this.runIdempotently({
      idempotencyKey,
      method: 'POST',
      path: `/api/planning-sessions/${sessionId}/mermaid`,
      sessionId,
      requestBody: request ?? {},
      execute: async () => this.generateMermaidOnce(sessionId, request ?? {})
    })
  }

  private async generateMermaidOnce(sessionId: string, request: unknown) {
    if (!this.planningStateMachineService || !this.planningMermaidGeneratorService) {
      throwValidationError(['Planning Mermaid generation service is not configured.'])
    }

    const parsedRequest = safeParseWithMessages(mermaidGenerationRequestSchema, request)
    if (!parsedRequest.ok) {
      throwValidationError(parsedRequest.errors)
    }

    const snapshot = parsedRequest.value.session ?? (await this.requireStoredSession(sessionId))
    if (snapshot.id !== sessionId) {
      throwValidationError(['Route sessionId must match the supplied session id.'])
    }

    await this.planningRetryCounterService?.incrementOrThrow(sessionId, 'generate_mermaid')
    const stateMachine = this.planningStateMachineService.buildStateMachine(snapshot)
    const generation = await this.planningMermaidGeneratorService.generate(snapshot, stateMachine)
    const nextStatus = getGenerationSnapshotStatus(generation.mermaidDocument, generation.validation)

    const nextSnapshot = planningSessionSnapshotSchema.parse({
      ...snapshot,
      status: nextStatus,
      stateMachine,
      flowDraft: generation.flowDraft,
      mermaidDocument: generation.mermaidDocument,
      validation: generation.validation
    })

    await this.persistence?.saveSession(nextSnapshot)
    await this.recordAudit({
      sessionId,
      type: 'mermaid_generated',
      status: generation.mermaidDocument.renderStatus === 'blocked' ? 'blocked' : generation.validation.mermaidSyntax === 'failed' ? 'failed' : 'success',
      summary: 'Mermaid generation completed.',
      validation: generation.validation,
      retryCount: generation.validation.retryCount
    })

    return createSuccessEnvelope(nextSnapshot)
  }

  private async requireStoredSession(sessionId: string): Promise<PlanningSessionSnapshot> {
    if (!this.persistence) {
      throwValidationError(['Planning session persistence is not configured.'])
    }

    return requirePlanningSession(this.persistence, sessionId)
  }

  private async runIdempotently<TData>(input: {
    idempotencyKey?: string | null
    method: string
    path: string
    sessionId?: string
    requestBody: unknown
    execute: () => Promise<ReturnType<typeof createSuccessEnvelope<TData>>>
  }) {
    if (!this.planningIdempotencyService) {
      return input.execute()
    }

    const response = await this.planningIdempotencyService.run({
      key: input.idempotencyKey,
      scope: {
        method: input.method,
        path: input.path,
        sessionId: input.sessionId
      },
      requestBody: input.requestBody,
      execute: input.execute
    })

    if (input.idempotencyKey && input.sessionId) {
      await this.recordAudit({
        sessionId: input.sessionId,
        type: 'idempotency_replayed',
        status: 'replayed',
        summary: 'Idempotent response returned or stored.'
      })
    }

    return response
  }

  private async recordAudit(input: {
    sessionId: string
    type: Parameters<PlanningAuditService['record']>[0]['type']
    status: Parameters<PlanningAuditService['record']>[0]['status']
    summary: string
    validation?: PlanningValidationReport | null
    retryCount?: number | null
  }): Promise<void> {
    await this.planningAuditService?.record(input)
  }
}

function normalizePlanningInput(input: PlanningInput): PlanningInput {
  const normalizedEntries = Object.entries(input.elements ?? {})
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0)
  const normalizedElements = normalizedEntries.length > 0 ? Object.fromEntries(normalizedEntries) : undefined

  return planningInputSchema.parse({
    rawText: input.rawText.trim(),
    ...(normalizedElements && { elements: normalizedElements })
  })
}

function calculateCompleteness(input: PlanningInput): PlanningCompleteness {
  const searchableText = [input.rawText, ...Object.values(input.elements ?? {})].join('\n').toLowerCase()
  const missingFields: MissingField[] = []

  if (!input.elements?.targetUser && !/(사용자|페르소나|persona|customer|actor|planner|pm|po|qa|기획자)/i.test(searchableText)) {
    missingFields.push('user')
  }

  if (!input.elements?.problem && !/(문제|pain|problem|해결|불편|낭비|rework|재작업)/i.test(searchableText)) {
    missingFields.push('problem')
  }

  if (!input.elements?.coreScenario && !/(시나리오|action|flow|기능|입력|생성|출력|수정|검토|export|generate)/i.test(searchableText)) {
    missingFields.push('actions')
  }

  const presentFieldCount = 3 - missingFields.length
  const lengthScore = searchableText.trim().length >= 40 ? 10 : 0

  return {
    isSufficient: missingFields.length === 0,
    score: presentFieldCount * 30 + lengthScore,
    missingFields,
    guidance: missingFields.map((field) => GUIDANCE_BY_FIELD[field])
  }
}

function createSessionSnapshot(
  input: PlanningInput,
  completeness: PlanningCompleteness,
  validation: PlanningValidationReport
): PlanningSessionSnapshot {
  return planningSessionSnapshotSchema.parse({
    id: `session_${randomUUID()}`,
    version: CONTRACT_VERSION,
    status: completeness.isSufficient && validation.promptInjectionCheck !== 'failed' ? 'input_received' : 'needs_clarification',
    input,
    analysis: null,
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
      ...validation,
      jsonSchema: validation.jsonSchema === 'skipped' ? 'passed' : validation.jsonSchema
    },
    flowDraft: null,
    mermaidDocument: null
  })
}

function createSessionSnapshotFromInput(sessionId: string, input: PlanningInput | undefined): PlanningSessionSnapshot {
  if (!input) {
    throwValidationError(['Either session or input is required.'])
  }

  const normalizedInput = normalizePlanningInput(input)
  const validation = createPassedReport({ jsonSchema: 'passed', promptInjectionCheck: 'passed' })
  return planningSessionSnapshotSchema.parse({
    ...createSessionSnapshot(normalizedInput, calculateCompleteness(normalizedInput), validation),
    id: sessionId
  })
}

function createMermaidValidationDocument(
  request: MermaidValidationRequest,
  validation: PlanningValidationReport
): MermaidDocument {
  return mermaidDocumentSchema.parse({
    code: request.code,
    renderStatus: validation.errors.length > 0 ? 'fallback' : 'generated',
    retryCount: validation.retryCount,
    renderError: validation.errors[0] ?? null,
    svg: null,
    isHappyPathBiased: false,
    blockedReason: null
  })
}

function getGenerationSnapshotStatus(
  mermaidDocument: MermaidDocument,
  validation: PlanningValidationReport
): PlanningSessionSnapshot['status'] {
  if (mermaidDocument.renderStatus === 'blocked') {
    return 'needs_clarification'
  }

  if (validation.jsonSchema === 'failed' || validation.cycleCheck === 'failed') {
    return 'failed'
  }

  if (mermaidDocument.renderStatus === 'generated') {
    return 'ready'
  }

  return 'failed'
}

function throwValidationError(errors: readonly string[]): never {
  throw new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: 'Request body could not be validated.',
    retryable: true,
    details: {
      errors
    }
  })
}
