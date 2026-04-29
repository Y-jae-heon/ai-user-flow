import { Injectable } from '@nestjs/common'
import { MermaidSyntaxService } from './mermaid-syntax.service'
import {
  flowDraftSchema,
  mermaidDocumentSchema,
  type FlowDraft,
  type FlowEdge,
  type FlowNode,
  type MermaidDocument,
  type PlanningSessionSnapshot,
  type PlanningStateMachine,
  type PlanningValidationReport
} from './dto/planning.dto'
import { createPassedReport, PlanningValidator } from './planning.validator'

const MAX_MERMAID_CORRECTION_ATTEMPTS = 1
const MAX_LIST_ITEMS = 8
const MAX_LABEL_LENGTH = 150

interface GenerateMermaidResult {
  flowDraft: FlowDraft | null
  mermaidDocument: MermaidDocument
  validation: PlanningValidationReport
}

@Injectable()
export class PlanningMermaidGeneratorService {
  constructor(
    private readonly planningValidator: PlanningValidator,
    private readonly mermaidSyntaxService: MermaidSyntaxService
  ) {}

  async generate(snapshot: PlanningSessionSnapshot, stateMachine: PlanningStateMachine): Promise<GenerateMermaidResult> {
    const blockedReason = getBlockedReason(snapshot)
    if (blockedReason) {
      const validation = this.planningValidator.mergeValidationReports([
        createGenerationBaseValidation(snapshot.validation),
        this.planningValidator.validateGraphCycles(stateMachine)
      ])

      return {
        flowDraft: null,
        mermaidDocument: createBlockedDocument(blockedReason),
        validation
      }
    }

    const flowDraft = createMermaidDraft(snapshot, stateMachine)
    const stateMachineReport = this.planningValidator.validateGraphCycles(stateMachine)
    const draftReport = this.planningValidator.validateFlowDraftShape(flowDraft)
    const preSerializationValidation = this.planningValidator.mergeValidationReports([
      createGenerationBaseValidation(snapshot.validation),
      stateMachineReport,
      draftReport
    ])

    if (preSerializationValidation.cycleCheck === 'failed' || preSerializationValidation.jsonSchema === 'failed') {
      return {
        flowDraft,
        mermaidDocument: createFallbackDocument('', preSerializationValidation.errors[0] ?? 'Flow draft validation failed.', 0, flowDraft.isHappyPathBiased),
        validation: preSerializationValidation
      }
    }

    return this.validateSerializedDraft(flowDraft, preSerializationValidation)
  }

  private async validateSerializedDraft(
    flowDraft: FlowDraft,
    baseValidation: PlanningValidationReport
  ): Promise<GenerateMermaidResult> {
    const code = serializeMermaidDraft(flowDraft)
    const safetyReport = this.planningValidator.validateMermaidSafety(code)
    const firstSyntaxReport =
      safetyReport.mermaidSyntax === 'failed'
        ? createPassedReport({ mermaidSyntax: 'skipped' })
        : await this.mermaidSyntaxService.validateSyntax(code)

    if (safetyReport.mermaidSyntax === 'failed' || firstSyntaxReport.mermaidSyntax === 'passed') {
      const validation = this.planningValidator.mergeValidationReports([baseValidation, safetyReport, firstSyntaxReport])
      return {
        flowDraft,
        mermaidDocument:
          validation.mermaidSyntax === 'passed'
            ? createGeneratedDocument(code, validation.retryCount, flowDraft.isHappyPathBiased)
            : createFallbackDocument(code, validation.errors[0] ?? 'Mermaid validation failed.', validation.retryCount, flowDraft.isHappyPathBiased),
        validation
      }
    }

    const correctedDraft = normalizeFlowDraftLabels(flowDraft)
    const correctedCode = serializeMermaidDraft(correctedDraft)
    const correctedSafetyReport = this.planningValidator.validateMermaidSafety(correctedCode)
    const correctedSyntaxReport =
      correctedSafetyReport.mermaidSyntax === 'failed'
        ? createPassedReport({ mermaidSyntax: 'skipped' })
        : await this.mermaidSyntaxService.validateSyntax(correctedCode)
    const retryReport = createPassedReport({
      retryCount: MAX_MERMAID_CORRECTION_ATTEMPTS
    })
    const validation = this.planningValidator.mergeValidationReports([
      baseValidation,
      correctedSafetyReport,
      correctedSyntaxReport,
      retryReport
    ])

    return {
      flowDraft: correctedDraft,
      mermaidDocument:
        validation.mermaidSyntax === 'passed'
          ? createGeneratedDocument(correctedCode, validation.retryCount, correctedDraft.isHappyPathBiased)
          : createFallbackDocument(
              correctedCode,
              validation.errors[0] ?? 'Mermaid parser rejected the diagram.',
              validation.retryCount,
              correctedDraft.isHappyPathBiased
            ),
      validation
    }
  }
}

function getBlockedReason(snapshot: PlanningSessionSnapshot): string | null {
  if (!snapshot.analysis) {
    return 'Planning analysis is required before Mermaid generation.'
  }

  if (!snapshot.analysis.completeness.isSufficient) {
    return 'Minimum planning information is required before Mermaid generation.'
  }

  if (snapshot.validation?.promptInjectionCheck === 'failed') {
    return 'Resolve unsafe instruction override language before Mermaid generation.'
  }

  const blockingContradiction = snapshot.analysis.contradictions.find((contradiction) => contradiction.severity === 'blocking')
  if (blockingContradiction) {
    return `Resolve blocking contradiction first: ${blockingContradiction.title}`
  }

  if (!['ready_for_generation', 'ready'].includes(snapshot.status)) {
    return 'Planning session is not ready for Mermaid generation.'
  }

  return null
}

function createGenerationBaseValidation(validation: PlanningValidationReport | null): PlanningValidationReport {
  if (!validation) {
    return createPassedReport({ jsonSchema: 'passed' })
  }

  const preserveErrors = validation.jsonSchema === 'failed' || validation.promptInjectionCheck === 'failed'

  return createPassedReport({
    jsonSchema: validation.jsonSchema,
    promptInjectionCheck: validation.promptInjectionCheck,
    errors: preserveErrors ? validation.errors : []
  })
}

function createMermaidDraft(snapshot: PlanningSessionSnapshot, stateMachine: PlanningStateMachine): FlowDraft {
  if (!snapshot.analysis) {
    throw new Error('Planning analysis is required before Mermaid generation.')
  }

  const acceptedSuggestions = snapshot.analysis.suggestions.filter((suggestion) => suggestion.status === 'accepted')
  const isHappyPathBiased =
    snapshot.analysis.suggestions.length > 0 && snapshot.analysis.suggestions.every((suggestion) => suggestion.status === 'rejected')
  const nodes: FlowNode[] = [
    createNode('start', null, 'Request received', 'terminal', false),
    createNode('input_text', 'input_group', 'MVP planning text received', 'rectangle', true),
    createNode('completeness', 'input_group', 'Minimum information sufficient?', 'decision', true),
    createNode('parse', 'analysis_group', 'Extract personas, entities, actions, and states', 'rectangle', true),
    createNode('contradiction_check', 'analysis_group', 'Blocking contradiction found?', 'decision', true),
    ...buildListNodes('actor', 'Actor', snapshot.entities.actors.map((actor) => actor.name), 'analysis_group'),
    ...buildListNodes('action', 'Action', snapshot.analysis.actions, 'analysis_group'),
    ...buildListNodes('state', 'State', snapshot.analysis.states, 'state_group'),
    ...buildListNodes('rule', 'Rule', snapshot.entities.businessRules.map((rule) => rule.title), 'state_group'),
    createNode('state_machine', 'state_group', 'Build allowed states and transitions', 'rectangle', true),
    ...buildListNodes('transition', 'Transition', stateMachine.transitions.map((transition) => `${transition.from} to ${transition.to}`), 'state_group'),
    createNode('suggestion_review', 'review_group', 'Accepted suggestions ready?', 'decision', true),
    ...buildRecoveryNodes(snapshot, acceptedSuggestions, isHappyPathBiased),
    createNode('merge_logic', 'generation_group', 'Merge accepted planning logic', 'rectangle', true),
    createNode('generate_code', 'generation_group', 'Generate Mermaid flowchart code', 'rectangle', true),
    createNode('render_check', 'validation_group', 'Mermaid parser accepts code?', 'decision', true),
    createNode('preview', 'output_group', 'Return flow draft and Mermaid code', 'rectangle', true)
  ]
  const edges: FlowEdge[] = [
    createEdge('start', 'input_text'),
    createEdge('input_text', 'completeness'),
    createEdge('completeness', 'parse', 'Yes'),
    createEdge('completeness', 'input_text', 'No'),
    createEdge('parse', 'contradiction_check'),
    createEdge('contradiction_check', 'suggestion_review', 'No'),
    createEdge('contradiction_check', 'input_text', 'Yes'),
    ...buildListEdges('parse', 'actor', snapshot.entities.actors.map((actor) => actor.name)),
    ...buildListEdges('parse', 'action', snapshot.analysis.actions),
    createEdge('contradiction_check', 'state_machine'),
    ...buildListEdges('state_machine', 'state', snapshot.analysis.states),
    ...buildListEdges('state_machine', 'rule', snapshot.entities.businessRules.map((rule) => rule.title)),
    ...buildListEdges('state_machine', 'transition', stateMachine.transitions),
    ...buildRecoveryEdges(snapshot, acceptedSuggestions, isHappyPathBiased),
    createEdge('suggestion_review', 'merge_logic'),
    createEdge('merge_logic', 'generate_code'),
    createEdge('generate_code', 'render_check'),
    createEdge('render_check', 'preview', 'Yes'),
    createEdge('render_check', 'generate_code', 'No')
  ]

  return flowDraftSchema.parse({
    nodes: dedupeNodes(nodes.map(normalizeNode)),
    edges,
    sections: [
      { id: 'input_group', label: 'Input' },
      { id: 'analysis_group', label: 'Analysis' },
      { id: 'state_group', label: 'State Machine' },
      { id: 'review_group', label: 'Review' },
      { id: 'recovery_group', label: 'Recovery Paths' },
      { id: 'generation_group', label: 'Generation' },
      { id: 'validation_group', label: 'Validation' },
      { id: 'output_group', label: 'Output' }
    ],
    isHappyPathBiased
  })
}

function buildRecoveryNodes(
  snapshot: PlanningSessionSnapshot,
  acceptedSuggestions: NonNullable<PlanningSessionSnapshot['analysis']>['suggestions'],
  isHappyPathBiased: boolean
): FlowNode[] {
  const exceptionNodes = snapshot.entities.exceptionPaths.slice(0, MAX_LIST_ITEMS).map((exceptionPath, index) => {
    return createNode(`exception_${index + 1}`, 'recovery_group', `Exception: ${exceptionPath.title} - ${exceptionPath.recoveryAction}`, 'rectangle', true)
  })

  if (acceptedSuggestions.length > 0) {
    return [
      ...exceptionNodes,
      ...acceptedSuggestions.slice(0, MAX_LIST_ITEMS).map((suggestion, index) => {
        return createNode(`suggestion_${index + 1}`, 'recovery_group', `Suggestion: ${suggestion.title} - ${suggestion.description}`, 'rectangle', true)
      })
    ]
  }

  if (exceptionNodes.length > 0) {
    return exceptionNodes
  }

  if (isHappyPathBiased) {
    return [createNode('happy_path_warning', 'recovery_group', 'Warning: no exception paths accepted', 'rectangle', true)]
  }

  return [createNode('recovery_placeholder', 'recovery_group', 'No accepted recovery paths yet', 'rectangle', true)]
}

function buildRecoveryEdges(
  snapshot: PlanningSessionSnapshot,
  acceptedSuggestions: NonNullable<PlanningSessionSnapshot['analysis']>['suggestions'],
  isHappyPathBiased: boolean
): FlowEdge[] {
  const exceptionEdges = snapshot.entities.exceptionPaths.slice(0, MAX_LIST_ITEMS).map((_, index) => createEdge('suggestion_review', `exception_${index + 1}`))
  const suggestionEdges = acceptedSuggestions.slice(0, MAX_LIST_ITEMS).map((_, index) => createEdge('suggestion_review', `suggestion_${index + 1}`))

  if (exceptionEdges.length > 0 || suggestionEdges.length > 0) {
    return [...exceptionEdges, ...suggestionEdges]
  }

  if (isHappyPathBiased) {
    return [createEdge('suggestion_review', 'happy_path_warning')]
  }

  return [createEdge('suggestion_review', 'recovery_placeholder')]
}

function buildListNodes(prefix: string, label: string, values: readonly unknown[], sectionId: string): FlowNode[] {
  return values.slice(0, MAX_LIST_ITEMS).map((value, index) => {
    return createNode(`${prefix}_${index + 1}`, sectionId, `${label}: ${String(value)}`, 'rectangle', true)
  })
}

function buildListEdges(sourceId: string, prefix: string, values: readonly unknown[]): FlowEdge[] {
  return values.slice(0, MAX_LIST_ITEMS).map((_, index) => createEdge(sourceId, `${prefix}_${index + 1}`))
}

function createNode(
  id: string,
  sectionId: string | null,
  label: string,
  shape: FlowNode['shape'],
  editable: boolean
): FlowNode {
  return {
    id,
    sectionId,
    label,
    shape,
    editable
  }
}

function createEdge(from: string, to: string, label: string | null = null): FlowEdge {
  return {
    from,
    to,
    label
  }
}

function serializeMermaidDraft(draft: FlowDraft): string {
  const ungroupedNodes = draft.nodes.filter((node) => node.sectionId === null)
  const lines = ['flowchart TD', ...ungroupedNodes.map((node) => `  ${serializeNode(node)}`)]

  for (const section of draft.sections) {
    const sectionNodes = draft.nodes.filter((node) => node.sectionId === section.id)
    if (sectionNodes.length === 0) {
      continue
    }

    lines.push('', `  subgraph ${section.id}["${escapeMermaidLabel(section.label)}"]`)
    lines.push(...sectionNodes.map((node) => `    ${serializeNode(node)}`))
    lines.push('  end')
  }

  lines.push('', ...draft.edges.map(serializeEdge))

  return lines.join('\n')
}

function serializeNode(node: FlowNode): string {
  const label = escapeMermaidLabel(node.label)

  if (node.shape === 'terminal') {
    return `${node.id}([${label}])`
  }

  if (node.shape === 'decision') {
    return `${node.id}{"${label}"}`
  }

  return `${node.id}["${label}"]`
}

function serializeEdge(edge: FlowEdge): string {
  if (edge.label) {
    return `  ${edge.from} -- "${escapeMermaidLabel(edge.label)}" --> ${edge.to}`
  }

  return `  ${edge.from} --> ${edge.to}`
}

function normalizeFlowDraftLabels(draft: FlowDraft): FlowDraft {
  return flowDraftSchema.parse({
    ...draft,
    nodes: draft.nodes.map(normalizeNode),
    edges: draft.edges.map((edge) => ({
      ...edge,
      label: edge.label ? normalizeLabel(edge.label) : null
    })),
    sections: draft.sections.map((section) => ({
      ...section,
      label: normalizeLabel(section.label)
    }))
  })
}

function normalizeNode(node: FlowNode): FlowNode {
  return {
    ...node,
    label: normalizeLabel(node.label)
  }
}

function normalizeLabel(value: string): string {
  const normalizedValue = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[{};]/g, ' ')
    .replace(/\b(end|graph|flowchart|subgraph)\b/gi, '$1 item')
    .replace(/\s+/g, ' ')
    .trim()
  const safeValue = normalizedValue.length > 0 ? normalizedValue : 'Untitled item'
  return safeValue.length > MAX_LABEL_LENGTH ? safeValue.slice(0, MAX_LABEL_LENGTH).trim() : safeValue
}

function escapeMermaidLabel(value: string): string {
  return normalizeLabel(value).replace(/\\/g, '\\\\').replace(/"/g, '&quot;')
}

function dedupeNodes(nodes: readonly FlowNode[]): FlowNode[] {
  const seen = new Set<string>()
  return nodes.filter((node) => {
    if (seen.has(node.id)) {
      return false
    }

    seen.add(node.id)
    return true
  })
}

function createGeneratedDocument(code: string, retryCount: number, isHappyPathBiased: boolean): MermaidDocument {
  return mermaidDocumentSchema.parse({
    code,
    renderStatus: 'generated',
    retryCount,
    renderError: null,
    svg: null,
    isHappyPathBiased,
    blockedReason: null
  })
}

function createBlockedDocument(blockedReason: string): MermaidDocument {
  return mermaidDocumentSchema.parse({
    code: '',
    renderStatus: 'blocked',
    retryCount: 0,
    renderError: null,
    svg: null,
    isHappyPathBiased: false,
    blockedReason
  })
}

function createFallbackDocument(
  code: string,
  renderError: string,
  retryCount: number,
  isHappyPathBiased: boolean
): MermaidDocument {
  return mermaidDocumentSchema.parse({
    code,
    renderStatus: 'fallback',
    retryCount,
    renderError,
    svg: null,
    isHappyPathBiased,
    blockedReason: null
  })
}
