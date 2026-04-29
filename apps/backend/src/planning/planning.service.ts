import { BadRequestException, Injectable } from '@nestjs/common'
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
    private readonly planningMermaidGeneratorService?: PlanningMermaidGeneratorService
  ) {}

  createPlanningSession(input: unknown) {
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

    return createSuccessEnvelope(snapshot)
  }

  async analyzePlanningSession(sessionId: string, request: unknown) {
    if (!this.planningExtractionService) {
      throwValidationError(['Planning extraction service is not configured.'])
    }

    const parsedRequest = safeParseWithMessages(planningAnalysisRequestSchema, request)
    if (!parsedRequest.ok) {
      throwValidationError(parsedRequest.errors)
    }

    const snapshot = parsedRequest.value.session ?? createSessionSnapshotFromInput(sessionId, parsedRequest.value.input)
    if (snapshot.id !== sessionId) {
      throwValidationError(['Route sessionId must match the supplied session id.'])
    }

    return createSuccessEnvelope(await this.planningExtractionService.analyzeSession(snapshot))
  }

  async validateMermaid(request: unknown) {
    const parsedRequest = safeParseWithMessages(mermaidValidationRequestSchema, request)
    if (!parsedRequest.ok) {
      throwValidationError(parsedRequest.errors)
    }

    const safetyReport = this.planningValidator.validateMermaidSafety(parsedRequest.value.code)
    const syntaxReport =
      safetyReport.mermaidSyntax === 'failed'
        ? createPassedReport({ mermaidSyntax: 'skipped' })
        : await this.mermaidSyntaxService.validateSyntax(parsedRequest.value.code)
    const validation = this.planningValidator.mergeValidationReports([safetyReport, syntaxReport])
    const mermaidDocument = createMermaidValidationDocument(parsedRequest.value, validation)

    return createSuccessEnvelope({
      mermaidDocument,
      validation
    })
  }

  async generateMermaid(sessionId: string, request: unknown) {
    if (!this.planningStateMachineService || !this.planningMermaidGeneratorService) {
      throwValidationError(['Planning Mermaid generation service is not configured.'])
    }

    const parsedRequest = safeParseWithMessages(mermaidGenerationRequestSchema, request)
    if (!parsedRequest.ok) {
      throwValidationError(parsedRequest.errors)
    }

    const snapshot = parsedRequest.value.session
    if (snapshot.id !== sessionId) {
      throwValidationError(['Route sessionId must match the supplied session id.'])
    }

    const stateMachine = this.planningStateMachineService.buildStateMachine(snapshot)
    const generation = await this.planningMermaidGeneratorService.generate(snapshot, stateMachine)
    const nextStatus = getGenerationSnapshotStatus(generation.mermaidDocument, generation.validation)

    return createSuccessEnvelope(
      planningSessionSnapshotSchema.parse({
        ...snapshot,
        status: nextStatus,
        stateMachine,
        flowDraft: generation.flowDraft,
        mermaidDocument: generation.mermaidDocument,
        validation: generation.validation
      })
    )
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
