import { z } from 'zod'

export const missingFieldSchema = z.enum(['user', 'problem', 'actions'])

const nonEmptyStringSchema = z.string().min(1)

export const planningElementKeySchema = z.enum([
  'mvpDefinition',
  'targetUser',
  'problem',
  'coreScenario',
  'successResult',
  'dataDependency',
  'exceptionCase',
  'policyConstraint',
  'exportNeed'
])

export const planningElementsSchema = z
  .object({
    mvpDefinition: z.string().optional(),
    targetUser: z.string().optional(),
    problem: z.string().optional(),
    coreScenario: z.string().optional(),
    successResult: z.string().optional(),
    dataDependency: z.string().optional(),
    exceptionCase: z.string().optional(),
    policyConstraint: z.string().optional(),
    exportNeed: z.string().optional()
  })
  .strict()

export const planningInputSchema = z.object({
  rawText: z.string(),
  elements: planningElementsSchema.optional()
})

export const planningCompletenessSchema = z.object({
  isSufficient: z.boolean(),
  score: z.number().min(0).max(100),
  missingFields: z.array(missingFieldSchema),
  guidance: z.array(z.string())
})

export const suggestionStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export const logicGapCategorySchema = z.enum(['onboarding', 'permission', 'data', 'export', 'quality', 'fallback'])
export const confidenceLevelSchema = z.enum(['high', 'medium', 'low'])
export const riskLevelSchema = z.enum(['high', 'medium', 'low'])

export const qaHandoffSchema = z.object({
  scenario: z.string(),
  precondition: z.string(),
  trigger: z.string(),
  expectedBehavior: z.string(),
  riskLevel: riskLevelSchema
})

export const logicGapSuggestionSchema = z.object({
  id: z.string(),
  category: logicGapCategorySchema,
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  qaHandoff: qaHandoffSchema,
  status: suggestionStatusSchema
})

export const planningAssumptionSchema = z.object({
  id: z.string(),
  confidence: confidenceLevelSchema,
  statement: z.string(),
  followUpPrompt: z.string()
})

export const contradictionSeveritySchema = z.enum(['warning', 'blocking'])

export const contradictionSchema = z.object({
  id: z.string(),
  severity: contradictionSeveritySchema,
  title: z.string(),
  description: z.string(),
  signals: z.array(z.string()),
  resolutionPrompt: z.string()
})

export const mermaidRenderStatusSchema = z.enum([
  'idle',
  'blocked',
  'generated',
  'rendering',
  'rendered',
  'correcting',
  'fallback'
])

export const mermaidDocumentSchema = z.object({
  code: z.string(),
  renderStatus: mermaidRenderStatusSchema,
  retryCount: z.number().int().min(0),
  renderError: z.string().nullable(),
  svg: z.string().nullable(),
  isHappyPathBiased: z.boolean(),
  blockedReason: z.string().nullable()
})

export const flowNodeShapeSchema = z.enum(['rectangle', 'decision', 'terminal'])

export const flowNodeSchema = z.object({
  id: z.string(),
  sectionId: z.string().nullable(),
  label: z.string(),
  shape: flowNodeShapeSchema,
  editable: z.boolean()
})

export const flowEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().nullable()
})

export const flowSectionSchema = z.object({
  id: z.string(),
  label: z.string()
})

export const flowDraftSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  sections: z.array(flowSectionSchema),
  isHappyPathBiased: z.boolean()
})

export const exportActionSchema = z.enum(['copy', 'svg', 'png'])
export const exportStatusSchema = z.object({
  status: z.enum(['idle', 'working', 'success', 'failed']),
  action: exportActionSchema.nullable(),
  message: z.string().nullable()
})

export const planningAnalysisSchema = z.object({
  rawText: z.string(),
  personas: z.array(z.string()),
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  states: z.array(z.string()),
  assumptions: z.array(planningAssumptionSchema),
  suggestions: z.array(logicGapSuggestionSchema),
  contradictions: z.array(contradictionSchema),
  completeness: planningCompletenessSchema
})

export const dependencyTypeSchema = z.enum(['requires', 'creates_failure_path', 'blocks', 'informs'])

export const dependencyAnalysisItemSchema = z.object({
  from: planningElementKeySchema,
  to: planningElementKeySchema,
  type: dependencyTypeSchema,
  rationale: nonEmptyStringSchema
})

export const planningActorSchema = z.object({
  id: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  sourceElement: planningElementKeySchema.nullable(),
  confidence: confidenceLevelSchema
})

export const planningObjectSchema = z.object({
  id: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  storageTarget: nonEmptyStringSchema,
  confidence: confidenceLevelSchema
})

export const planningActionSchema = z.object({
  id: nonEmptyStringSchema,
  actorId: nonEmptyStringSchema,
  objectId: nonEmptyStringSchema,
  verb: nonEmptyStringSchema,
  preconditions: z.array(nonEmptyStringSchema),
  postconditions: z.array(nonEmptyStringSchema)
})

export const businessRuleSchema = z.object({
  id: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  sourceElement: planningElementKeySchema.nullable(),
  severity: contradictionSeveritySchema
})

export const exceptionPathSchema = z.object({
  id: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  trigger: nonEmptyStringSchema,
  expectedBehavior: nonEmptyStringSchema,
  recoveryAction: nonEmptyStringSchema,
  riskLevel: riskLevelSchema
})

export const planningEntityMappingSchema = z.object({
  actors: z.array(planningActorSchema),
  objects: z.array(planningObjectSchema),
  actions: z.array(planningActionSchema),
  businessRules: z.array(businessRuleSchema),
  exceptionPaths: z.array(exceptionPathSchema)
})

export const planningStateSchema = z.object({
  id: nonEmptyStringSchema,
  label: nonEmptyStringSchema,
  description: z.string().optional(),
  isTerminal: z.boolean().optional()
})

export const planningStateTransitionSchema = z.object({
  from: nonEmptyStringSchema,
  to: nonEmptyStringSchema,
  condition: nonEmptyStringSchema,
  isRetry: z.boolean().optional()
})

export const planningStateMachineSchema = z.object({
  initialState: nonEmptyStringSchema,
  states: z.array(planningStateSchema),
  transitions: z.array(planningStateTransitionSchema)
})

export const validationCheckStatusSchema = z.enum(['passed', 'failed', 'skipped'])

export const planningValidationReportSchema = z.object({
  jsonSchema: validationCheckStatusSchema,
  mermaidSyntax: validationCheckStatusSchema,
  cycleCheck: validationCheckStatusSchema,
  promptInjectionCheck: validationCheckStatusSchema,
  retryCount: z.number().int().min(0),
  errors: z.array(z.string())
})

export const planningSessionStatusSchema = z.enum([
  'input_received',
  'parsing',
  'needs_clarification',
  'mapping_logic',
  'ready_for_generation',
  'generating_mermaid',
  'validating_output',
  'self_correcting',
  'ready',
  'failed'
])

export const planningSessionSnapshotSchema = z.object({
  id: nonEmptyStringSchema,
  version: nonEmptyStringSchema,
  status: planningSessionStatusSchema,
  input: planningInputSchema,
  analysis: planningAnalysisSchema.nullable(),
  dependencyAnalysis: z.array(dependencyAnalysisItemSchema),
  entities: planningEntityMappingSchema,
  stateMachine: planningStateMachineSchema.nullable(),
  validation: planningValidationReportSchema.nullable(),
  flowDraft: flowDraftSchema.nullable(),
  mermaidDocument: mermaidDocumentSchema.nullable()
})

export const apiErrorSchema = z.object({
  code: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  retryable: z.boolean(),
  details: z.unknown().optional()
})

export const apiSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  error: z.null()
})

export const apiFailureEnvelopeSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: apiErrorSchema
})

export const planningSessionResponseSchema = z.object({
  success: z.literal(true),
  data: planningSessionSnapshotSchema,
  error: z.null()
})

export const planningAnalysisResponseSchema = z.object({
  success: z.literal(true),
  data: planningAnalysisSchema,
  error: z.null()
})

export const mermaidGenerationResponseSchema = z.object({
  success: z.literal(true),
  data: planningSessionSnapshotSchema,
  error: z.null()
})

export const mermaidValidationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    mermaidDocument: mermaidDocumentSchema,
    validation: planningValidationReportSchema
  }),
  error: z.null()
})

export type MissingField = z.infer<typeof missingFieldSchema>
export type PlanningElementKey = z.infer<typeof planningElementKeySchema>
export type PlanningElements = z.infer<typeof planningElementsSchema>
export type PlanningInput = z.infer<typeof planningInputSchema>
export type PlanningCompleteness = z.infer<typeof planningCompletenessSchema>
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>
export type LogicGapCategory = z.infer<typeof logicGapCategorySchema>
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>
export type RiskLevel = z.infer<typeof riskLevelSchema>
export type QAHandoff = z.infer<typeof qaHandoffSchema>
export type LogicGapSuggestion = z.infer<typeof logicGapSuggestionSchema>
export type PlanningAssumption = z.infer<typeof planningAssumptionSchema>
export type ContradictionSeverity = z.infer<typeof contradictionSeveritySchema>
export type Contradiction = z.infer<typeof contradictionSchema>
export type MermaidRenderStatus = z.infer<typeof mermaidRenderStatusSchema>
export type MermaidDocument = z.infer<typeof mermaidDocumentSchema>
export type FlowNodeShape = z.infer<typeof flowNodeShapeSchema>
export type FlowNode = z.infer<typeof flowNodeSchema>
export type FlowEdge = z.infer<typeof flowEdgeSchema>
export type FlowSection = z.infer<typeof flowSectionSchema>
export type FlowDraft = z.infer<typeof flowDraftSchema>
export type ExportAction = z.infer<typeof exportActionSchema>
export type ExportStatus = z.infer<typeof exportStatusSchema>
export type PlanningAnalysis = z.infer<typeof planningAnalysisSchema>
export type DependencyType = z.infer<typeof dependencyTypeSchema>
export type DependencyAnalysisItem = z.infer<typeof dependencyAnalysisItemSchema>
export type PlanningActor = z.infer<typeof planningActorSchema>
export type PlanningObject = z.infer<typeof planningObjectSchema>
export type PlanningAction = z.infer<typeof planningActionSchema>
export type BusinessRule = z.infer<typeof businessRuleSchema>
export type ExceptionPath = z.infer<typeof exceptionPathSchema>
export type PlanningEntityMapping = z.infer<typeof planningEntityMappingSchema>
export type PlanningState = z.infer<typeof planningStateSchema>
export type PlanningStateTransition = z.infer<typeof planningStateTransitionSchema>
export type PlanningStateMachine = z.infer<typeof planningStateMachineSchema>
export type ValidationCheckStatus = z.infer<typeof validationCheckStatusSchema>
export type PlanningValidationReport = z.infer<typeof planningValidationReportSchema>
export type PlanningSessionStatus = z.infer<typeof planningSessionStatusSchema>
export type PlanningSessionSnapshot = z.infer<typeof planningSessionSnapshotSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
export type ApiSuccessEnvelope = z.infer<typeof apiSuccessEnvelopeSchema>
export type ApiFailureEnvelope = z.infer<typeof apiFailureEnvelopeSchema>
export type PlanningSessionResponse = z.infer<typeof planningSessionResponseSchema>
export type PlanningAnalysisResponse = z.infer<typeof planningAnalysisResponseSchema>
export type MermaidGenerationResponse = z.infer<typeof mermaidGenerationResponseSchema>
export type MermaidValidationResponse = z.infer<typeof mermaidValidationResponseSchema>
