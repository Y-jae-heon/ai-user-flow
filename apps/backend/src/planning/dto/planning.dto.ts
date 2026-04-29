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

const safeIdSchema = z.string().regex(/^[a-z][a-z0-9_]*$/)
const safeTextSchema = z.string().min(1).max(240)

export const suggestionStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export const logicGapCategorySchema = z.enum(['onboarding', 'permission', 'data', 'export', 'quality', 'fallback'])
export const confidenceLevelSchema = z.enum(['high', 'medium', 'low'])
export const contradictionSeveritySchema = z.enum(['warning', 'blocking'])
export const riskLevelSchema = z.enum(['high', 'medium', 'low'])

export const qaHandoffSchema = z
  .object({
    scenario: safeTextSchema,
    precondition: safeTextSchema,
    trigger: safeTextSchema,
    expectedBehavior: safeTextSchema,
    riskLevel: riskLevelSchema
  })
  .strict()

export const logicGapSuggestionSchema = z
  .object({
    id: safeIdSchema,
    category: logicGapCategorySchema,
    title: safeTextSchema,
    description: safeTextSchema,
    rationale: safeTextSchema,
    qaHandoff: qaHandoffSchema,
    status: suggestionStatusSchema
  })
  .strict()

export const planningAssumptionSchema = z
  .object({
    id: safeIdSchema,
    confidence: confidenceLevelSchema,
    statement: safeTextSchema,
    followUpPrompt: safeTextSchema
  })
  .strict()

export const contradictionSchema = z
  .object({
    id: safeIdSchema,
    severity: contradictionSeveritySchema,
    title: safeTextSchema,
    description: safeTextSchema,
    signals: z.array(safeTextSchema),
    resolutionPrompt: safeTextSchema
  })
  .strict()

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

export const dependencyAnalysisItemSchema = z
  .object({
    from: planningElementKeySchema,
    to: planningElementKeySchema,
    type: dependencyTypeSchema,
    rationale: safeTextSchema
  })
  .strict()

export const planningActorSchema = z
  .object({
    id: safeIdSchema,
    name: safeTextSchema,
    sourceElement: planningElementKeySchema.nullable(),
    confidence: confidenceLevelSchema
  })
  .strict()

export const planningObjectSchema = z
  .object({
    id: safeIdSchema,
    name: safeTextSchema,
    storageTarget: safeIdSchema,
    confidence: confidenceLevelSchema
  })
  .strict()

export const planningActionSchema = z
  .object({
    id: safeIdSchema,
    actorId: safeIdSchema,
    objectId: safeIdSchema,
    verb: safeTextSchema,
    preconditions: z.array(safeTextSchema),
    postconditions: z.array(safeTextSchema)
  })
  .strict()

export const businessRuleSchema = z
  .object({
    id: safeIdSchema,
    title: safeTextSchema,
    description: safeTextSchema,
    sourceElement: planningElementKeySchema.nullable(),
    severity: contradictionSeveritySchema
  })
  .strict()

export const exceptionPathSchema = z
  .object({
    id: safeIdSchema,
    title: safeTextSchema,
    trigger: safeTextSchema,
    expectedBehavior: safeTextSchema,
    recoveryAction: safeTextSchema,
    riskLevel: riskLevelSchema
  })
  .strict()

export const planningEntityMappingSchema = z
  .object({
    actors: z.array(planningActorSchema),
    objects: z.array(planningObjectSchema),
    actions: z.array(planningActionSchema),
    businessRules: z.array(businessRuleSchema),
    exceptionPaths: z.array(exceptionPathSchema)
  })
  .strict()

export const planningStateSchema = z.object({
  id: safeIdSchema,
  label: safeTextSchema,
  description: safeTextSchema.optional(),
  isTerminal: z.boolean().optional()
})

export const planningStateTransitionSchema = z.object({
  from: safeIdSchema,
  to: safeIdSchema,
  condition: safeTextSchema,
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
  dependencyAnalysis: z.array(dependencyAnalysisItemSchema),
  entities: planningEntityMappingSchema,
  stateMachine: planningStateMachineSchema.nullable(),
  validation: planningValidationReportSchema.nullable(),
  flowDraft: flowDraftSchema.nullable(),
  mermaidDocument: mermaidDocumentSchema.nullable()
})

export const planningExtractionResultSchema = z
  .object({
    analysis: planningAnalysisSchema,
    dependencyAnalysis: z.array(dependencyAnalysisItemSchema),
    entities: planningEntityMappingSchema,
    statusRecommendation: z.enum(['ready_for_generation', 'needs_clarification']),
    blockingReasons: z.array(safeTextSchema),
    modelMetadata: z
      .object({
        provider: z.literal('openai'),
        model: safeTextSchema,
        usedFallback: z.boolean()
      })
      .strict()
  })
  .strict()

export const planningAnalysisRequestSchema = z
  .object({
    session: planningSessionSnapshotSchema.optional(),
    input: planningInputSchema.optional()
  })
  .strict()
  .refine((value) => value.session !== undefined || value.input !== undefined, {
    message: 'Either session or input is required.'
  })

export const mermaidGenerationRequestSchema = z
  .object({
    session: planningSessionSnapshotSchema
  })
  .strict()

export const mermaidGenerationResponseSchema = z
  .object({
    flowDraft: flowDraftSchema,
    mermaidDocument: mermaidDocumentSchema,
    validation: planningValidationReportSchema
  })
  .strict()

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
export type PlanningAnalysis = z.infer<typeof planningAnalysisSchema>
export type PlanningExtractionResult = z.infer<typeof planningExtractionResultSchema>
export type PlanningAnalysisRequest = z.infer<typeof planningAnalysisRequestSchema>
export type MermaidGenerationRequest = z.infer<typeof mermaidGenerationRequestSchema>
export type MermaidGenerationResponse = z.infer<typeof mermaidGenerationResponseSchema>
export type PlanningSessionSnapshot = z.infer<typeof planningSessionSnapshotSchema>
export type FlowDraft = z.infer<typeof flowDraftSchema>
export type FlowEdge = z.infer<typeof flowEdgeSchema>
export type FlowNode = z.infer<typeof flowNodeSchema>
export type PlanningStateMachine = z.infer<typeof planningStateMachineSchema>
export type MermaidDocument = z.infer<typeof mermaidDocumentSchema>
export type MermaidValidationRequest = z.infer<typeof mermaidValidationRequestSchema>
export type DependencyAnalysisItem = z.infer<typeof dependencyAnalysisItemSchema>
export type PlanningEntityMapping = z.infer<typeof planningEntityMappingSchema>
