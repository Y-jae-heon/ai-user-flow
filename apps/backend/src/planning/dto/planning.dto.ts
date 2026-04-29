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

export const validationCheckStatusSchema = z.enum(['passed', 'failed', 'skipped'])

export const planningValidationReportSchema = z.object({
  jsonSchema: validationCheckStatusSchema,
  mermaidSyntax: validationCheckStatusSchema,
  cycleCheck: validationCheckStatusSchema,
  promptInjectionCheck: validationCheckStatusSchema,
  retryCount: z.number().int().min(0),
  errors: z.array(z.string())
})

export const planningCompletenessSchema = z.object({
  isSufficient: z.boolean(),
  score: z.number().min(0).max(100),
  missingFields: z.array(missingFieldSchema),
  guidance: z.array(z.string())
})

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low'])
export const contradictionSeveritySchema = z.enum(['warning', 'blocking'])
export const riskLevelSchema = z.enum(['high', 'medium', 'low'])

export const planningAnalysisSchema = z.object({
  rawText: z.string(),
  personas: z.array(z.string()),
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  states: z.array(z.string()),
  assumptions: z.array(z.unknown()),
  suggestions: z.array(z.unknown()),
  contradictions: z.array(z.unknown()),
  completeness: planningCompletenessSchema
})

export const planningEntityMappingSchema = z.object({
  actors: z.array(z.unknown()),
  objects: z.array(z.unknown()),
  actions: z.array(z.unknown()),
  businessRules: z.array(z.unknown()),
  exceptionPaths: z.array(z.unknown())
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

export const flowNodeSchema = z.object({
  id: z.string(),
  sectionId: z.string().nullable(),
  label: z.string(),
  shape: z.enum(['rectangle', 'decision', 'terminal']),
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

export const mermaidDocumentSchema = z.object({
  code: z.string(),
  renderStatus: z.enum(['idle', 'blocked', 'generated', 'rendering', 'rendered', 'correcting', 'fallback']),
  retryCount: z.number().int().min(0),
  renderError: z.string().nullable(),
  svg: z.string().nullable(),
  isHappyPathBiased: z.boolean(),
  blockedReason: z.string().nullable()
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
  dependencyAnalysis: z.array(z.unknown()),
  entities: planningEntityMappingSchema,
  stateMachine: planningStateMachineSchema.nullable(),
  validation: planningValidationReportSchema.nullable(),
  flowDraft: flowDraftSchema.nullable(),
  mermaidDocument: mermaidDocumentSchema.nullable()
})

export const mermaidValidationRequestSchema = z
  .object({
    code: z.string().min(1)
  })
  .strict()

export type MissingField = z.infer<typeof missingFieldSchema>
export type PlanningElements = z.infer<typeof planningElementsSchema>
export type PlanningInput = z.infer<typeof planningInputSchema>
export type PlanningCompleteness = z.infer<typeof planningCompletenessSchema>
export type PlanningValidationReport = z.infer<typeof planningValidationReportSchema>
export type PlanningSessionSnapshot = z.infer<typeof planningSessionSnapshotSchema>
export type FlowDraft = z.infer<typeof flowDraftSchema>
export type FlowEdge = z.infer<typeof flowEdgeSchema>
export type PlanningStateMachine = z.infer<typeof planningStateMachineSchema>
export type MermaidDocument = z.infer<typeof mermaidDocumentSchema>
export type MermaidValidationRequest = z.infer<typeof mermaidValidationRequestSchema>
