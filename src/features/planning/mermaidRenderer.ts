import type { Mermaid, MermaidConfig } from 'mermaid'
import { mermaidDocumentSchema, type MermaidDocument } from './planningSchema'

export interface MermaidAdapter {
  initialize: (config: Record<string, unknown>) => void | Promise<void>
  parse: (code: string, options?: { suppressErrors?: boolean }) => unknown | Promise<unknown>
  render: (id: string, code: string) => Promise<{ svg: string }>
}

interface RenderMermaidDocumentOptions {
  adapter?: MermaidAdapter
}

const initializedAdapters = new WeakSet<MermaidAdapter>()
let renderCounter = 0
let mermaidModulePromise: Promise<Mermaid> | null = null

export const unavailableMermaidAdapter: MermaidAdapter = {
  initialize: () => undefined,
  parse: () => {
    throw new Error('Official Mermaid renderer is not configured in this environment.')
  },
  render: async () => {
    throw new Error('Official Mermaid renderer is not configured in this environment.')
  }
}

const officialMermaidAdapter: MermaidAdapter = {
  initialize: async (config) => {
    const mermaid = await loadMermaidModule()
    mermaid.initialize(config as MermaidConfig)
  },
  parse: async (code, options) => {
    const mermaid = await loadMermaidModule()
    return mermaid.parse(code, options)
  },
  render: async (id, code) => {
    const mermaid = await loadMermaidModule()
    const { svg } = await mermaid.render(id, code)
    return { svg }
  }
}

export async function renderMermaidDocument(
  code: string,
  options: RenderMermaidDocumentOptions = {}
): Promise<MermaidDocument> {
  const adapter = options.adapter ?? officialMermaidAdapter
  const firstAttempt = await renderOnce(code, adapter)

  if (firstAttempt.ok) {
    return createRenderedDocument(code, firstAttempt.svg, 0)
  }

  const correctedCode = correctMermaidSyntax(code)
  const secondAttempt = await renderOnce(correctedCode, adapter)

  if (secondAttempt.ok) {
    return createRenderedDocument(correctedCode, secondAttempt.svg, 1)
  }

  return mermaidDocumentSchema.parse({
    code: correctedCode,
    renderStatus: 'fallback',
    retryCount: 1,
    renderError: secondAttempt.errorMessage || firstAttempt.errorMessage,
    svg: null,
    isHappyPathBiased: false,
    blockedReason: null
  })
}

export function correctMermaidSyntax(code: string): string {
  return code
    .replace(/^\s*graph\s+(TD|TB|BT|RL|LR)\b/i, 'flowchart $1')
    .replace(/^(\s*[A-Za-z][A-Za-z0-9_]*)\[([^\]"\n]+)\]/gm, (_match, nodeId: string, label: string) => {
      return `${nodeId}["${label.trim()}"]`
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function renderOnce(
  code: string,
  adapter: MermaidAdapter
): Promise<{ ok: true; svg: string } | { ok: false; errorMessage: string }> {
  try {
    await ensureMermaidInitialized(adapter)

    const parseResult = await adapter.parse(code, { suppressErrors: false })
    if (parseResult === false) {
      return {
        ok: false,
        errorMessage: 'Mermaid parser rejected the diagram.'
      }
    }

    const renderResult = await adapter.render(`planner-diagram-${++renderCounter}`, code)

    return {
      ok: true,
      svg: renderResult.svg
    }
  } catch (error: unknown) {
    return {
      ok: false,
      errorMessage: getErrorMessage(error)
    }
  }
}

async function ensureMermaidInitialized(adapter: MermaidAdapter): Promise<void> {
  if (initializedAdapters.has(adapter)) {
    return
  }

  await adapter.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    flowchart: {
      htmlLabels: false
    }
  })
  initializedAdapters.add(adapter)
}

function loadMermaidModule(): Promise<Mermaid> {
  mermaidModulePromise ??= import('mermaid/dist/mermaid.esm.mjs').then((module) => module.default)
  return mermaidModulePromise
}

function createRenderedDocument(code: string, svg: string, retryCount: number): MermaidDocument {
  return mermaidDocumentSchema.parse({
    code,
    renderStatus: 'rendered',
    retryCount,
    renderError: null,
    svg,
    isHappyPathBiased: false,
    blockedReason: null
  })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown Mermaid render error'
}
