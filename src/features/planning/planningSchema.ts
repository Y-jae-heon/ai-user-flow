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

export const planningAnalysisSchema = z.object({
  rawText: z.string(),
  personas: z.array(z.string()),
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  states: z.array(z.string()),
  assumptions: z.array(z.string()),
  completeness: planningCompletenessSchema
})

export type MissingField = z.infer<typeof missingFieldSchema>
export type PlanningInput = z.infer<typeof planningInputSchema>
export type PlanningCompleteness = z.infer<typeof planningCompletenessSchema>
export type PlanningAnalysis = z.infer<typeof planningAnalysisSchema>

