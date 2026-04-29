import { ZodError, ZodIssue, ZodType } from 'zod'

export interface SafeParseSuccess<TValue> {
  ok: true
  value: TValue
}

export interface SafeParseFailure {
  ok: false
  errors: string[]
}

export type SafeParseResult<TValue> = SafeParseSuccess<TValue> | SafeParseFailure

export function safeParseWithMessages<TValue>(schema: ZodType<TValue>, input: unknown): SafeParseResult<TValue> {
  const result = schema.safeParse(input)

  if (result.success) {
    return {
      ok: true,
      value: result.data
    }
  }

  return {
    ok: false,
    errors: formatZodIssues(result.error)
  }
}

export function formatZodIssues(error: ZodError): string[] {
  return error.issues.map(formatZodIssue)
}

function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
  return `${path}: ${issue.message}`
}
