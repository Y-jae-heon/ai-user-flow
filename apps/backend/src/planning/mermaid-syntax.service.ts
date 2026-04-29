import { Inject, Injectable, Optional } from '@nestjs/common'
import { type Mermaid, type MermaidConfig } from 'mermaid'
import { createFailedReport, createPassedReport } from './planning.validator'
import type { PlanningValidationReport } from './dto/planning.dto'
import { getErrorMessage } from '../common/errors'

export interface MermaidParserAdapter {
  initialize: (config: Record<string, unknown>) => void | Promise<void>
  parse: (code: string, options?: { suppressErrors?: boolean }) => unknown | Promise<unknown>
}

export const MERMAID_PARSER_ADAPTER = 'MERMAID_PARSER_ADAPTER'

@Injectable()
export class MermaidSyntaxService {
  private readonly adapter: MermaidParserAdapter
  private initialized = false

  constructor(@Optional() @Inject(MERMAID_PARSER_ADAPTER) adapter?: MermaidParserAdapter | null) {
    this.adapter = adapter ?? createOfficialMermaidParserAdapter()
  }

  async validateSyntax(code: string): Promise<PlanningValidationReport> {
    try {
      await this.ensureInitialized()
      const parseResult = await this.adapter.parse(code, { suppressErrors: false })

      if (parseResult === false) {
        return createFailedReport('mermaidSyntax', ['Mermaid parser rejected the diagram.'])
      }

      return createPassedReport({
        mermaidSyntax: 'passed'
      })
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      if (isParserRuntimeCompatibilityError(errorMessage) || errorMessage === 'Unexpected error') {
        return createFailedReport('mermaidSyntax', ['Mermaid parser validation unavailable.'])
      }

      return createFailedReport('mermaidSyntax', [errorMessage])
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return
    }

    await this.adapter.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      flowchart: {
        htmlLabels: false
      }
    })
    this.initialized = true
  }
}

function createOfficialMermaidParserAdapter(): MermaidParserAdapter {
  let mermaidModulePromise: Promise<Mermaid> | null = null

  async function loadMermaid(): Promise<Mermaid> {
    mermaidModulePromise ??= ensureDompurifyStaticSanitize()
      .then(() => nativeImport<{ default: Mermaid }>('mermaid'))
      .then((module) => module.default)
    return mermaidModulePromise
  }

  return {
    initialize: async (config) => {
      const mermaid = await loadMermaid()
      mermaid.initialize(config as MermaidConfig)
    },
    parse: async (code, options) => {
      const mermaid = await loadMermaid()
      return mermaid.parse(code, options)
    }
  }
}

async function ensureDompurifyStaticSanitize(): Promise<void> {
  const dompurifyModule = await nativeImport<{ default?: unknown }>('dompurify')
  const dompurify = ((dompurifyModule as unknown as { default?: unknown }).default ?? dompurifyModule) as {
    sanitize?: (value: unknown) => string
  }

  dompurify.sanitize ??= (value: unknown) => String(value)
}

function nativeImport<TModule>(specifier: string): Promise<TModule> {
  const importer = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<TModule>
  return importer(specifier)
}

function isParserRuntimeCompatibilityError(message: string): boolean {
  return (
    message.includes('DOMPurify.sanitize') ||
    message.includes("reading 'sanitize'") ||
    message.includes('dynamic import') ||
    message.includes('vm modules')
  )
}
