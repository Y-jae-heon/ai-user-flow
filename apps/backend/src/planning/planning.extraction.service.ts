import { Inject, Injectable } from '@nestjs/common'
import { safeParseWithMessages } from '../common/validation/zod-validation'
import {
  planningExtractionResultSchema,
  planningSessionSnapshotSchema,
  type DependencyAnalysisItem,
  type PlanningAnalysis,
  type PlanningCompleteness,
  type PlanningEntityMapping,
  type PlanningExtractionResult,
  type PlanningInput,
  type PlanningSessionSnapshot,
  type PlanningValidationReport
} from './dto/planning.dto'
import { PLANNING_AI_CLIENT, PlanningAiClient } from './planning.ai-client'
import { createFailedReport, createPassedReport, PlanningValidator } from './planning.validator'
import { PlanningWorkflow } from './planning.workflow'

const MAX_ITEMS_PER_GROUP = 8

@Injectable()
export class PlanningExtractionService {
  constructor(
    private readonly planningValidator: PlanningValidator,
    private readonly planningWorkflow: PlanningWorkflow,
    @Inject(PLANNING_AI_CLIENT) private readonly planningAiClient: PlanningAiClient
  ) {}

  async analyzeSession(snapshot: PlanningSessionSnapshot): Promise<PlanningSessionSnapshot> {
    const promptInjectionReport = this.planningValidator.validatePromptInjection(snapshot.input)
    const validation = this.planningValidator.mergeValidationReports([
      snapshot.validation ?? createPassedReport({ jsonSchema: 'passed' }),
      promptInjectionReport
    ])

    if (validation.promptInjectionCheck === 'failed' || !getCompleteness(snapshot).isSufficient) {
      return planningSessionSnapshotSchema.parse({
        ...snapshot,
        status: 'needs_clarification',
        validation
      })
    }

    const workflowResult = await this.planningWorkflow.run({
      sessionId: snapshot.id,
      input: snapshot.input,
      extract: (input) => this.planningAiClient.extractPlanningLogic(input)
    })

    const parsedExtraction = safeParseWithMessages(planningExtractionResultSchema, workflowResult.extraction)
    const parseError = parsedExtraction.ok ? null : parsedExtraction.errors.join('; ')
    const extraction =
      parsedExtraction.ok && workflowResult.error === null
        ? parsedExtraction.value
        : createFallbackExtraction(snapshot.input, workflowResult.error ?? parseError ?? 'AI extraction failed.')
    const extractionReport =
      parsedExtraction.ok && workflowResult.error === null
        ? createPassedReport({ jsonSchema: 'passed' })
        : createPassedReport({
            jsonSchema: 'passed',
            errors: ['AI extraction unavailable; deterministic fallback used.']
          })
    const nextValidation = this.planningValidator.mergeValidationReports([validation, extractionReport])
    const nextStatus = getSnapshotStatus(extraction, nextValidation)

    return planningSessionSnapshotSchema.parse({
      ...snapshot,
      status: nextStatus,
      analysis: extraction.analysis,
      dependencyAnalysis: extraction.dependencyAnalysis,
      entities: extraction.entities,
      validation: nextValidation
    })
  }
}

function getCompleteness(snapshot: PlanningSessionSnapshot): PlanningCompleteness {
  if (snapshot.analysis) {
    return snapshot.analysis.completeness
  }

  return {
    isSufficient: snapshot.status === 'input_received',
    score: snapshot.status === 'input_received' ? 100 : 0,
    missingFields: [],
    guidance: []
  }
}

function getSnapshotStatus(
  extraction: PlanningExtractionResult,
  validation: PlanningValidationReport
): PlanningSessionSnapshot['status'] {
  const hasBlockingContradiction = extraction.analysis.contradictions.some(
    (contradiction) => contradiction.severity === 'blocking'
  )

  if (
    validation.promptInjectionCheck === 'failed' ||
    !extraction.analysis.completeness.isSufficient ||
    hasBlockingContradiction ||
    extraction.statusRecommendation === 'needs_clarification'
  ) {
    return 'needs_clarification'
  }

  return 'ready_for_generation'
}

function createFallbackExtraction(input: PlanningInput, reason: string): PlanningExtractionResult {
  const normalizedText = normalizeText([input.rawText, ...Object.values(input.elements ?? {})].join('\n'))
  const personas = uniqueLimited(extractValues(input, ['targetUser'], ['사용자', 'persona', 'planner', 'pm', 'po', 'qa']))
  const entities = uniqueLimited(extractValues(input, ['dataDependency'], ['db', 'database', 'session', 'mermaid', 'ai']))
  const actions = uniqueLimited(extractValues(input, ['coreScenario', 'successResult'], ['생성', '분석', '검토', 'export']))
  const states = uniqueLimited(extractValues(input, ['exceptionCase', 'policyConstraint'], ['fail', 'error', '완료', '실패']))
  const completeness = calculateFallbackCompleteness(input, normalizedText, personas, actions)
  const analysis: PlanningAnalysis = {
    rawText: normalizedText,
    personas,
    entities,
    actions,
    states,
    assumptions: [
      {
        id: 'assumption_ai_fallback',
        confidence: 'low',
        statement: 'AI extraction failed, so backend used deterministic fallback extraction.',
        followUpPrompt: 'Review extracted actors, actions, and exception paths before Mermaid generation.'
      }
    ],
    suggestions: completeness.isSufficient
      ? [
          {
            id: 'suggestion_recovery_path',
            category: 'fallback',
            title: 'Recovery path review',
            description: 'Confirm what users should do when analysis or generation fails.',
            rationale: 'Fallback extraction cannot infer every domain-specific recovery path.',
            qaHandoff: {
              scenario: 'AI extraction fallback used',
              precondition: 'Planning input was accepted by the backend.',
              trigger: reason.slice(0, 160) || 'AI extraction failed.',
              expectedBehavior: 'System returns safe structured output and asks the user to review recovery behavior.',
              riskLevel: 'medium'
            },
            status: 'pending'
          }
        ]
      : [],
    contradictions: detectContradictions(normalizedText),
    completeness
  }
  const actorId = 'actor_primary_user'
  const objectId = 'object_planning_session'
  const mappedEntities: PlanningEntityMapping = {
    actors: [
      {
        id: actorId,
        name: personas[0] ?? 'Primary User',
        sourceElement: input.elements?.targetUser ? 'targetUser' : null,
        confidence: personas.length > 0 ? 'medium' : 'low'
      }
    ],
    objects: [
      {
        id: objectId,
        name: entities[0] ?? 'Planning Session',
        storageTarget: 'planning_sessions',
        confidence: entities.length > 0 ? 'medium' : 'low'
      }
    ],
    actions: [
      {
        id: 'action_submit_planning_input',
        actorId,
        objectId,
        verb: actions[0] ?? 'submit planning input',
        preconditions: ['session_available'],
        postconditions: ['input_received']
      }
    ],
    businessRules: input.elements?.policyConstraint
      ? [
          {
            id: 'rule_policy_constraint',
            title: 'Policy constraint',
            description: input.elements.policyConstraint,
            sourceElement: 'policyConstraint',
            severity: 'warning'
          }
        ]
      : [],
    exceptionPaths: input.elements?.exceptionCase
      ? [
          {
            id: 'exception_known_case',
            title: 'Known exception case',
            trigger: input.elements.exceptionCase,
            expectedBehavior: 'System provides a safe recovery path.',
            recoveryAction: 'Return clarification or retry guidance.',
            riskLevel: 'medium'
          }
        ]
      : []
  }

  return planningExtractionResultSchema.parse({
    analysis,
    dependencyAnalysis: createDependencyAnalysis(input),
    entities: mappedEntities,
    statusRecommendation: completeness.isSufficient && analysis.contradictions.length === 0 ? 'ready_for_generation' : 'needs_clarification',
    blockingReasons: completeness.guidance,
    modelMetadata: {
      provider: 'openai',
      model: 'deterministic_fallback',
      usedFallback: true
    }
  })
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
}

function extractValues(input: PlanningInput, elementKeys: readonly (keyof NonNullable<PlanningInput['elements']>)[], keywords: readonly string[]): string[] {
  const explicitValues = elementKeys.flatMap((key) => {
    const value = input.elements?.[key]
    return value ? [value] : []
  })
  const lines = normalizeText(input.rawText)
    .split(/\n|(?<=[.!?。])\s+/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
  const keywordValues = lines.filter((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase())))

  return [...explicitValues, ...keywordValues].map(cleanLabel)
}

function calculateFallbackCompleteness(
  input: PlanningInput,
  normalizedText: string,
  personas: readonly string[],
  actions: readonly string[]
): PlanningCompleteness {
  const missingFields: PlanningCompleteness['missingFields'] = []

  if (!input.elements?.targetUser && personas.length === 0) {
    missingFields.push('user')
  }

  if (!input.elements?.problem && !/(문제|pain|problem|해결|불편|rework|재작업)/i.test(normalizedText)) {
    missingFields.push('problem')
  }

  if (!input.elements?.coreScenario && actions.length === 0) {
    missingFields.push('actions')
  }

  return {
    isSufficient: missingFields.length === 0,
    score: (3 - missingFields.length) * 30 + (normalizedText.length >= 40 ? 10 : 0),
    missingFields,
    guidance: missingFields.map((field) => {
      if (field === 'user') {
        return '주요 사용자가 누구인지 최소 1개 이상 적어주세요.'
      }

      if (field === 'problem') {
        return '사용자가 겪는 문제나 현재 대안의 한계를 적어주세요.'
      }

      return '사용자가 수행하는 핵심 액션이나 주요 시나리오를 적어주세요.'
    })
  }
}

function detectContradictions(text: string): PlanningAnalysis['contradictions'] {
  if (!/(무료|free)/i.test(text) || !/(결제 필수|구독 필수|payment required|subscription required)/i.test(text)) {
    return []
  }

  return [
    {
      id: 'conflict_free_vs_required_payment',
      severity: 'blocking',
      title: 'Free usage conflicts with required payment',
      description: '무료 사용 조건과 결제 또는 구독 필수 조건이 함께 있어 과금 정책이 충돌합니다.',
      signals: ['무료', '결제 필수'],
      resolutionPrompt: '무료 범위와 결제 또는 구독이 필요한 시점을 분리해 정의하세요.'
    }
  ]
}

function createDependencyAnalysis(input: PlanningInput): DependencyAnalysisItem[] {
  const dependencies: DependencyAnalysisItem[] = []

  if (input.elements?.targetUser && input.elements?.coreScenario) {
    dependencies.push({
      from: 'targetUser',
      to: 'coreScenario',
      type: 'requires',
      rationale: 'A scenario must be owned by at least one actor.'
    })
  }

  if (input.elements?.dataDependency && input.elements?.exceptionCase) {
    dependencies.push({
      from: 'dataDependency',
      to: 'exceptionCase',
      type: 'creates_failure_path',
      rationale: 'Data dependency failures should produce a recovery path.'
    })
  }

  return dependencies
}

function cleanLabel(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[가-힣A-Za-z ]+[:：]\s*/, '').trim().slice(0, 200)
}

function uniqueLimited(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, MAX_ITEMS_PER_GROUP)
}
