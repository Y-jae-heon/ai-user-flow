import { z } from 'zod'

export const missingFieldSchema = z.enum(['user', 'problem', 'actions'])

export const planningInputSchema = z.object({
  rawText: z.string()
})

export const planningCompletenessSchema = z.object({
  isSufficient: z.boolean(),
  score: z.number().min(0).max(100),
  missingFields: z.array(missingFieldSchema),
  guidance: z.array(z.string())
})

export const suggestionStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export const logicGapCategorySchema = z.enum(['onboarding', 'permission', 'data', 'export', 'quality', 'fallback'])

export const logicGapSuggestionSchema = z.object({
  id: z.string(),
  category: logicGapCategorySchema,
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  status: suggestionStatusSchema
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

export const planningAnalysisSchema = z.object({
  rawText: z.string(),
  personas: z.array(z.string()),
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  states: z.array(z.string()),
  assumptions: z.array(z.string()),
  suggestions: z.array(logicGapSuggestionSchema),
  contradictions: z.array(contradictionSchema),
  completeness: planningCompletenessSchema
})

export type MissingField = z.infer<typeof missingFieldSchema>
export type PlanningInput = z.infer<typeof planningInputSchema>
export type PlanningCompleteness = z.infer<typeof planningCompletenessSchema>
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>
export type LogicGapCategory = z.infer<typeof logicGapCategorySchema>
export type LogicGapSuggestion = z.infer<typeof logicGapSuggestionSchema>
export type ContradictionSeverity = z.infer<typeof contradictionSeveritySchema>
export type Contradiction = z.infer<typeof contradictionSchema>
export type MermaidRenderStatus = z.infer<typeof mermaidRenderStatusSchema>
export type MermaidDocument = z.infer<typeof mermaidDocumentSchema>
export type PlanningAnalysis = z.infer<typeof planningAnalysisSchema>
