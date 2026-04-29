import {
  flowDraftSchema,
  mermaidDocumentSchema,
  type FlowDraft,
  type FlowEdge,
  type FlowNode,
  type FlowNodeShape,
  type LogicGapSuggestion,
  type MermaidDocument,
  type PlanningAnalysis
} from './planningSchema'

interface GenerateMermaidFlowInput {
  analysis: PlanningAnalysis
  suggestions: readonly LogicGapSuggestion[]
}

const EMPTY_RENDER_FIELDS = {
  retryCount: 0,
  renderError: null,
  svg: null
}

export function generateMermaidFlow({ analysis, suggestions }: GenerateMermaidFlowInput): MermaidDocument {
  if (!analysis.completeness.isSufficient) {
    return createBlockedDocument('Minimum planning information is required before Mermaid generation.')
  }

  const blockingContradiction = analysis.contradictions.find((contradiction) => contradiction.severity === 'blocking')
  if (blockingContradiction) {
    return createBlockedDocument(`Resolve blocking contradiction first: ${blockingContradiction.title}`)
  }

  const draft = createMermaidDraft({ analysis, suggestions })
  const code = serializeMermaidDraft(draft)

  return mermaidDocumentSchema.parse({
    code,
    renderStatus: 'generated',
    blockedReason: null,
    isHappyPathBiased: draft.isHappyPathBiased,
    ...EMPTY_RENDER_FIELDS
  })
}

export function createMermaidDraft({ analysis, suggestions }: GenerateMermaidFlowInput): FlowDraft {
  const acceptedSuggestions = suggestions.filter((suggestion) => suggestion.status === 'accepted')
  const isHappyPathBiased =
    suggestions.length > 0 && suggestions.every((suggestion) => suggestion.status === 'rejected')
  const nodes: FlowNode[] = [
    createNode('start', null, 'Start', 'terminal', false),
    createNode('input_text', 'input_group', 'MVP planning text received', 'rectangle', true),
    createNode('completeness', 'input_group', 'Minimum information sufficient?', 'decision', true),
    createNode('parse', 'analysis_group', 'Extract personas, entities, actions, and states', 'rectangle', true),
    createNode('contradiction_check', 'analysis_group', 'Blocking contradiction found?', 'decision', true),
    ...buildListNodes('persona', 'Persona', analysis.personas),
    ...buildListNodes('action', 'Action', analysis.actions),
    ...buildListNodes('state', 'State', analysis.states),
    createNode('suggestion_review', 'review_group', 'Accepted suggestions ready?', 'decision', true),
    ...buildExceptionNodes(acceptedSuggestions, isHappyPathBiased),
    createNode('merge_logic', 'output_group', 'Merge accepted planning logic', 'rectangle', true),
    createNode('generate_code', 'output_group', 'Generate Mermaid flowchart code', 'rectangle', true),
    createNode('render_check', 'output_group', 'Mermaid preview rendered?', 'decision', true),
    createNode('preview', 'output_group', 'Show diagram preview and Mermaid code', 'rectangle', true)
  ]
  const edges: FlowEdge[] = [
    createEdge('start', 'input_text'),
    createEdge('input_text', 'completeness'),
    createEdge('completeness', 'parse', 'Yes'),
    createEdge('completeness', 'input_text', 'No'),
    createEdge('parse', 'contradiction_check'),
    createEdge('contradiction_check', 'suggestion_review', 'No'),
    createEdge('contradiction_check', 'input_text', 'Yes'),
    ...buildListEdges('parse', 'persona', analysis.personas),
    ...buildListEdges('parse', 'action', analysis.actions),
    ...buildListEdges('parse', 'state', analysis.states),
    ...buildExceptionEdges(acceptedSuggestions, isHappyPathBiased),
    createEdge('suggestion_review', 'merge_logic'),
    createEdge('merge_logic', 'generate_code'),
    createEdge('generate_code', 'render_check'),
    createEdge('render_check', 'preview', 'Yes'),
    createEdge('render_check', 'generate_code', 'No')
  ]

  return flowDraftSchema.parse({
    nodes,
    edges,
    sections: [
      { id: 'input_group', label: 'Input' },
      { id: 'analysis_group', label: 'Analysis' },
      { id: 'review_group', label: 'Review' },
      { id: 'exception_group', label: 'Exception Paths' },
      { id: 'output_group', label: 'Output' }
    ],
    isHappyPathBiased
  })
}

export function updateMermaidDraftNode(draft: FlowDraft, nodeId: string, label: string): FlowDraft {
  return flowDraftSchema.parse({
    ...draft,
    nodes: draft.nodes.map((node) => {
      if (node.id !== nodeId || !node.editable) {
        return node
      }

      return {
        ...node,
        label
      }
    })
  })
}

export function serializeMermaidDraft(draft: FlowDraft): string {
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

function createBlockedDocument(blockedReason: string): MermaidDocument {
  return mermaidDocumentSchema.parse({
    code: '',
    renderStatus: 'blocked',
    blockedReason,
    isHappyPathBiased: false,
    ...EMPTY_RENDER_FIELDS
  })
}

function buildListNodes(prefix: string, label: string, values: readonly string[]): FlowNode[] {
  return values.map((value, index) => {
    return createNode(`${prefix}_${index + 1}`, 'analysis_group', `${label}: ${value}`, 'rectangle', true)
  })
}

function buildListEdges(sourceId: string, prefix: string, values: readonly string[]): FlowEdge[] {
  return values.map((_, index) => createEdge(sourceId, `${prefix}_${index + 1}`))
}

function buildExceptionNodes(
  acceptedSuggestions: readonly LogicGapSuggestion[],
  isHappyPathBiased: boolean
): FlowNode[] {
  if (acceptedSuggestions.length > 0) {
    return acceptedSuggestions.map((suggestion, index) => {
      const label = `Exception: ${suggestion.title} - ${suggestion.description}`
      return createNode(`exception_${index + 1}`, 'exception_group', label, 'rectangle', true)
    })
  }

  if (isHappyPathBiased) {
    return [createNode('happy_path_warning', 'exception_group', 'Warning: no exception paths accepted', 'rectangle', true)]
  }

  return [createNode('exception_placeholder', 'exception_group', 'No accepted exception paths yet', 'rectangle', true)]
}

function buildExceptionEdges(
  acceptedSuggestions: readonly LogicGapSuggestion[],
  isHappyPathBiased: boolean
): FlowEdge[] {
  if (acceptedSuggestions.length > 0) {
    return acceptedSuggestions.map((_, index) => createEdge('suggestion_review', `exception_${index + 1}`))
  }

  if (isHappyPathBiased) {
    return [createEdge('suggestion_review', 'happy_path_warning')]
  }

  return [createEdge('suggestion_review', 'exception_placeholder')]
}

function createNode(
  id: string,
  sectionId: string | null,
  label: string,
  shape: FlowNodeShape,
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

function escapeMermaidLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim()
}
