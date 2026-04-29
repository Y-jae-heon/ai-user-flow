import { mermaidDocumentSchema, type LogicGapSuggestion, type MermaidDocument, type PlanningAnalysis } from './planningSchema'

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

  const acceptedSuggestions = suggestions.filter((suggestion) => suggestion.status === 'accepted')
  const isHappyPathBiased =
    suggestions.length > 0 && suggestions.every((suggestion) => suggestion.status === 'rejected')
  const code = buildMermaidCode(analysis, acceptedSuggestions, isHappyPathBiased)

  return mermaidDocumentSchema.parse({
    code,
    renderStatus: 'generated',
    blockedReason: null,
    isHappyPathBiased,
    ...EMPTY_RENDER_FIELDS
  })
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

function buildMermaidCode(
  analysis: PlanningAnalysis,
  acceptedSuggestions: readonly LogicGapSuggestion[],
  isHappyPathBiased: boolean
): string {
  const lines = [
    'flowchart TD',
    '  start([Start])',
    '  start --> input_text',
    '',
    '  subgraph input_group["Input"]',
    `    input_text["${escapeMermaidLabel('MVP planning text received')}"]`,
    `    completeness{"${escapeMermaidLabel('Minimum information sufficient?')}"}`,
    '  end',
    '',
    '  subgraph analysis_group["Analysis"]',
    `    parse["${escapeMermaidLabel('Extract personas, entities, actions, and states')}"]`,
    `    contradiction_check{"${escapeMermaidLabel('Blocking contradiction found?')}"}`,
    ...buildListNodes('persona', 'Persona', analysis.personas),
    ...buildListNodes('action', 'Action', analysis.actions),
    ...buildListNodes('state', 'State', analysis.states),
    '  end',
    '',
    '  subgraph review_group["Review"]',
    `    suggestion_review{"${escapeMermaidLabel('Accepted suggestions ready?')}"}`,
    '  end',
    '',
    '  subgraph exception_group["Exception Paths"]',
    ...buildExceptionNodes(acceptedSuggestions, isHappyPathBiased),
    '  end',
    '',
    '  subgraph output_group["Output"]',
    `    merge_logic["${escapeMermaidLabel('Merge accepted planning logic')}"]`,
    `    generate_code["${escapeMermaidLabel('Generate Mermaid flowchart code')}"]`,
    `    render_check{"${escapeMermaidLabel('Mermaid preview rendered?')}"}`,
    `    preview["${escapeMermaidLabel('Show diagram preview and Mermaid code')}"]`,
    '  end',
    '',
    '  input_text --> completeness',
    '  completeness -- "Yes" --> parse',
    '  completeness -- "No" --> input_text',
    '  parse --> contradiction_check',
    '  contradiction_check -- "No" --> suggestion_review',
    '  contradiction_check -- "Yes" --> input_text',
    ...buildListEdges('parse', 'persona', analysis.personas),
    ...buildListEdges('parse', 'action', analysis.actions),
    ...buildListEdges('parse', 'state', analysis.states),
    ...buildExceptionEdges(acceptedSuggestions, isHappyPathBiased),
    '  suggestion_review --> merge_logic',
    '  merge_logic --> generate_code',
    '  generate_code --> render_check',
    '  render_check -- "Yes" --> preview',
    '  render_check -- "No" --> generate_code'
  ]

  return lines.join('\n')
}

function buildListNodes(prefix: string, label: string, values: readonly string[]): string[] {
  return values.map((value, index) => {
    return `    ${prefix}_${index + 1}["${escapeMermaidLabel(`${label}: ${value}`)}"]`
  })
}

function buildListEdges(sourceId: string, prefix: string, values: readonly string[]): string[] {
  return values.map((_, index) => `  ${sourceId} --> ${prefix}_${index + 1}`)
}

function buildExceptionNodes(
  acceptedSuggestions: readonly LogicGapSuggestion[],
  isHappyPathBiased: boolean
): string[] {
  if (acceptedSuggestions.length > 0) {
    return acceptedSuggestions.map((suggestion, index) => {
      const label = `Exception: ${suggestion.title} - ${suggestion.description}`
      return `    exception_${index + 1}["${escapeMermaidLabel(label)}"]`
    })
  }

  if (isHappyPathBiased) {
    return [`    happy_path_warning["${escapeMermaidLabel('Warning: no exception paths accepted')}"]`]
  }

  return [`    exception_placeholder["${escapeMermaidLabel('No accepted exception paths yet')}"]`]
}

function buildExceptionEdges(
  acceptedSuggestions: readonly LogicGapSuggestion[],
  isHappyPathBiased: boolean
): string[] {
  if (acceptedSuggestions.length > 0) {
    return acceptedSuggestions.map((_, index) => `  suggestion_review --> exception_${index + 1}`)
  }

  if (isHappyPathBiased) {
    return ['  suggestion_review --> happy_path_warning']
  }

  return ['  suggestion_review --> exception_placeholder']
}

function escapeMermaidLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim()
}
