import { Injectable } from '@nestjs/common'
import {
  flowDraftSchema,
  planningInputSchema,
  planningSessionSnapshotSchema,
  planningStateMachineSchema,
  planningValidationReportSchema,
  type FlowDraft,
  type FlowEdge,
  type PlanningInput,
  type PlanningStateMachine,
  type PlanningValidationReport
} from './dto/planning.dto'
import { formatZodIssues } from '../common/validation/zod-validation'

const NODE_ID_PATTERN = /^[a-z][a-z0-9_]*$/
const MAX_LABEL_LENGTH = 160
const SAFE_RETRY_EDGE_KEYS = new Set([
  'completeness->input_text',
  'contradiction_check->input_text',
  'render_check->generate_code'
])
const SAFE_RETRY_STATES = new Set(['input_received', 'validating_output', 'generating_mermaid'])

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt/i,
  /developer\s+message/i,
  /이전\s*지시를\s*무시/i
]

const UNSAFE_MERMAID_PATTERNS = [
  /%%\s*\{\s*init/i,
  /<\s*script/i,
  /<\s*\/?\s*[a-z][^>]*>/i,
  /\son[a-z]+\s*=/i,
  /securityLevel/i,
  /htmlLabels/i
]

@Injectable()
export class PlanningValidator {
  validatePlanningInput(input: unknown): PlanningValidationReport {
    const parsed = planningInputSchema.safeParse(input)
    if (!parsed.success) {
      return createFailedReport('jsonSchema', formatZodIssues(parsed.error))
    }

    return createPassedReport({
      jsonSchema: 'passed'
    })
  }

  validatePlanningSessionSnapshot(snapshot: unknown): PlanningValidationReport {
    const parsed = planningSessionSnapshotSchema.safeParse(snapshot)
    if (!parsed.success) {
      return createFailedReport('jsonSchema', formatZodIssues(parsed.error))
    }

    return createPassedReport({
      jsonSchema: 'passed'
    })
  }

  validatePromptInjection(input: PlanningInput): PlanningValidationReport {
    const searchableText = [input.rawText, ...Object.values(input.elements ?? {})].join('\n')
    const matchedPattern = PROMPT_INJECTION_PATTERNS.find((pattern) => pattern.test(searchableText))

    if (!matchedPattern) {
      return createPassedReport({
        promptInjectionCheck: 'passed'
      })
    }

    return createFailedReport('promptInjectionCheck', ['Planning input contains instruction override language.'])
  }

  validateMermaidSafety(code: string): PlanningValidationReport {
    const matchedPattern = UNSAFE_MERMAID_PATTERNS.find((pattern) => pattern.test(code))

    if (!matchedPattern) {
      return createPassedReport({
        mermaidSyntax: 'skipped'
      })
    }

    return createFailedReport('mermaidSyntax', ['Mermaid code contains unsafe directives or markup.'])
  }

  validateFlowDraftShape(draft: unknown): PlanningValidationReport {
    const parsed = flowDraftSchema.safeParse(draft)
    if (!parsed.success) {
      return createFailedReport('jsonSchema', formatZodIssues(parsed.error))
    }

    const errors = getFlowDraftShapeErrors(parsed.data)
    if (errors.length > 0) {
      return createFailedReport('cycleCheck', errors)
    }

    return this.validateGraphCycles(parsed.data)
  }

  validateGraphCycles(value: FlowDraft | PlanningStateMachine): PlanningValidationReport {
    const flowDraft = flowDraftSchema.safeParse(value)
    if (flowDraft.success) {
      return validateEdgesForCycles(flowDraft.data.edges, (edge) => SAFE_RETRY_EDGE_KEYS.has(`${edge.from}->${edge.to}`))
    }

    const stateMachine = planningStateMachineSchema.safeParse(value)
    if (stateMachine.success) {
      const retryEdges = new Set(
        stateMachine.data.transitions
          .filter((transition) => transition.isRetry === true && SAFE_RETRY_STATES.has(transition.to))
          .map((transition) => `${transition.from}->${transition.to}`)
      )
      return validateEdgesForCycles(
        stateMachine.data.transitions.map((transition) => ({
          from: transition.from,
          to: transition.to,
          label: transition.condition
        })),
        (edge) => retryEdges.has(`${edge.from}->${edge.to}`)
      )
    }

    return createFailedReport('jsonSchema', ['Graph value is not a valid flow draft or state machine.'])
  }

  mergeValidationReports(reports: readonly PlanningValidationReport[]): PlanningValidationReport {
    return planningValidationReportSchema.parse({
      jsonSchema: mergeStatus(reports.map((report) => report.jsonSchema)),
      mermaidSyntax: mergeStatus(reports.map((report) => report.mermaidSyntax)),
      cycleCheck: mergeStatus(reports.map((report) => report.cycleCheck)),
      promptInjectionCheck: mergeStatus(reports.map((report) => report.promptInjectionCheck)),
      retryCount: Math.max(0, ...reports.map((report) => report.retryCount)),
      errors: reports.flatMap((report) => report.errors)
    })
  }
}

export function createPassedReport(overrides: Partial<PlanningValidationReport> = {}): PlanningValidationReport {
  return planningValidationReportSchema.parse({
    jsonSchema: 'skipped',
    mermaidSyntax: 'skipped',
    cycleCheck: 'skipped',
    promptInjectionCheck: 'skipped',
    retryCount: 0,
    errors: [],
    ...overrides
  })
}

export function createFailedReport(
  check: Exclude<keyof PlanningValidationReport, 'retryCount' | 'errors'>,
  errors: readonly string[],
  retryCount = 0
): PlanningValidationReport {
  return planningValidationReportSchema.parse({
    jsonSchema: 'skipped',
    mermaidSyntax: 'skipped',
    cycleCheck: 'skipped',
    promptInjectionCheck: 'skipped',
    [check]: 'failed',
    retryCount,
    errors: errors.map(limitErrorMessage)
  })
}

function getFlowDraftShapeErrors(draft: FlowDraft): string[] {
  const nodeIds = new Set(draft.nodes.map((node) => node.id))
  const sectionIds = new Set(draft.sections.map((section) => section.id))
  const errors: string[] = []

  for (const section of draft.sections) {
    if (!NODE_ID_PATTERN.test(section.id)) {
      errors.push(`Invalid section id: ${section.id}`)
    }

    if (!isSafeLabel(section.label)) {
      errors.push(`Unsafe section label: ${section.id}`)
    }
  }

  for (const node of draft.nodes) {
    if (!NODE_ID_PATTERN.test(node.id)) {
      errors.push(`Invalid node id: ${node.id}`)
    }

    if (node.sectionId !== null && !sectionIds.has(node.sectionId)) {
      errors.push(`Node references missing section: ${node.id}`)
    }

    if (!isSafeLabel(node.label)) {
      errors.push(`Unsafe node label: ${node.id}`)
    }
  }

  for (const edge of draft.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(`Edge references missing node: ${edge.from}->${edge.to}`)
    }

    if (edge.label !== null && !isSafeLabel(edge.label)) {
      errors.push(`Unsafe edge label: ${edge.from}->${edge.to}`)
    }
  }

  return errors
}

function isSafeLabel(label: string): boolean {
  const trimmedLabel = label.trim()
  return (
    trimmedLabel.length > 0 &&
    trimmedLabel.length <= MAX_LABEL_LENGTH &&
    !/[\r\n]/.test(trimmedLabel) &&
    !UNSAFE_MERMAID_PATTERNS.some((pattern) => pattern.test(trimmedLabel))
  )
}

function validateEdgesForCycles(
  edges: readonly Pick<FlowEdge, 'from' | 'to'>[],
  isAllowedRetry: (edge: Pick<FlowEdge, 'from' | 'to'>) => boolean
): PlanningValidationReport {
  const unsafeEdges = edges.filter((edge) => !isAllowedRetry(edge))
  const adjacency = new Map<string, string[]>()

  for (const edge of unsafeEdges) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to])
    adjacency.set(edge.to, adjacency.get(edge.to) ?? [])
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()

  for (const nodeId of adjacency.keys()) {
    if (hasCycle(nodeId, adjacency, visiting, visited)) {
      return createFailedReport('cycleCheck', ['Flow graph contains an unsafe cycle.'])
    }
  }

  return createPassedReport({
    cycleCheck: 'passed'
  })
}

function hasCycle(
  nodeId: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
  visiting: Set<string>,
  visited: Set<string>
): boolean {
  if (visited.has(nodeId)) {
    return false
  }

  if (visiting.has(nodeId)) {
    return true
  }

  visiting.add(nodeId)

  for (const nextNodeId of adjacency.get(nodeId) ?? []) {
    if (hasCycle(nextNodeId, adjacency, visiting, visited)) {
      return true
    }
  }

  visiting.delete(nodeId)
  visited.add(nodeId)
  return false
}

function mergeStatus(statuses: readonly PlanningValidationReport['jsonSchema'][]): PlanningValidationReport['jsonSchema'] {
  if (statuses.includes('failed')) {
    return 'failed'
  }

  if (statuses.includes('passed')) {
    return 'passed'
  }

  return 'skipped'
}

function limitErrorMessage(message: string): string {
  return message.length > 160 ? `${message.slice(0, 157)}...` : message
}
