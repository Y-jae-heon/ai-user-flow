import { useRef, useState } from 'react'
import { analyzePlanningInput } from './planningAnalyzer'
import type {
  ExportAction,
  ExportStatus,
  FlowDraft,
  LogicGapSuggestion,
  MermaidDocument,
  PlanningAnalysis,
  SuggestionStatus
} from './planningSchema'
import { createMermaidDraft, generateMermaidFlow, serializeMermaidDraft, updateMermaidDraftNode } from './mermaidGenerator'
import { renderMermaidDocument } from './mermaidRenderer'
import { copyMermaidCode, exportSvg, exportSvgToPng } from './mermaidExport'
import { AnalysisPanel } from './components/AnalysisPanel'
import { InputPanel } from './components/InputPanel'

const IDLE_EXPORT_STATUS: ExportStatus = {
  status: 'idle',
  action: null,
  message: null
}

export function PlanningWorkspace() {
  const [rawText, setRawText] = useState('')
  const [analysis, setAnalysis] = useState<PlanningAnalysis | null>(null)
  const [reviewedSuggestions, setReviewedSuggestions] = useState<LogicGapSuggestion[]>([])
  const [mermaidDocument, setMermaidDocument] = useState<MermaidDocument | null>(null)
  const [flowDraft, setFlowDraft] = useState<FlowDraft | null>(null)
  const [exportStatus, setExportStatus] = useState<ExportStatus>(IDLE_EXPORT_STATUS)
  const renderRequestId = useRef(0)

  function handleAnalyze(): void {
    const nextAnalysis = analyzePlanningInput(rawText)

    renderRequestId.current += 1
    setAnalysis(nextAnalysis)
    setReviewedSuggestions(nextAnalysis.suggestions)
    setMermaidDocument(null)
    setFlowDraft(null)
    setExportStatus(IDLE_EXPORT_STATUS)
  }

  function handleRawTextChange(nextRawText: string): void {
    renderRequestId.current += 1
    setRawText(nextRawText)
    setAnalysis(null)
    setReviewedSuggestions([])
    setMermaidDocument(null)
    setFlowDraft(null)
    setExportStatus(IDLE_EXPORT_STATUS)
  }

  function handleSuggestionStatusChange(id: string, status: SuggestionStatus): void {
    renderRequestId.current += 1
    setMermaidDocument(null)
    setFlowDraft(null)
    setExportStatus(IDLE_EXPORT_STATUS)
    setReviewedSuggestions((currentSuggestions) =>
      currentSuggestions.map((suggestion) => {
        if (suggestion.id !== id) {
          return suggestion
        }

        return {
          ...suggestion,
          status
        }
      })
    )
  }

  async function handleGenerateMermaid(): Promise<void> {
    if (!analysis) {
      return
    }

    const requestId = renderRequestId.current + 1
    renderRequestId.current = requestId

    const generatedDocument = generateMermaidFlow({
      analysis,
      suggestions: reviewedSuggestions
    })

    if (generatedDocument.renderStatus === 'blocked') {
      setMermaidDocument(generatedDocument)
      setFlowDraft(null)
      setExportStatus(IDLE_EXPORT_STATUS)
      return
    }

    const draft = createMermaidDraft({
      analysis,
      suggestions: reviewedSuggestions
    })
    setFlowDraft(draft)
    setExportStatus(IDLE_EXPORT_STATUS)
    setMermaidDocument({
      ...generatedDocument,
      renderStatus: 'rendering'
    })

    const renderedDocument = await renderMermaidDocument(generatedDocument.code)

    if (renderRequestId.current !== requestId) {
      return
    }

    setMermaidDocument({
      ...renderedDocument,
      isHappyPathBiased: generatedDocument.isHappyPathBiased
    })
  }

  async function handleNodeLabelChange(nodeId: string, label: string): Promise<void> {
    if (!flowDraft) {
      return
    }

    const nextDraft = updateMermaidDraftNode(flowDraft, nodeId, label)
    const code = serializeMermaidDraft(nextDraft)
    const requestId = renderRequestId.current + 1
    renderRequestId.current = requestId

    setFlowDraft(nextDraft)
    setExportStatus(IDLE_EXPORT_STATUS)
    setMermaidDocument({
      code,
      renderStatus: 'rendering',
      retryCount: 0,
      renderError: null,
      svg: null,
      isHappyPathBiased: nextDraft.isHappyPathBiased,
      blockedReason: null
    })

    const renderedDocument = await renderMermaidDocument(code)

    if (renderRequestId.current !== requestId) {
      return
    }

    setMermaidDocument({
      ...renderedDocument,
      isHappyPathBiased: nextDraft.isHappyPathBiased
    })
  }

  async function handleCopyMermaid(): Promise<void> {
    if (!mermaidDocument?.code) {
      return
    }

    await runExportAction('copy', 'Mermaid code copied.', () => copyMermaidCode(mermaidDocument.code))
  }

  async function handleExportSvg(): Promise<void> {
    if (!mermaidDocument?.svg || mermaidDocument.renderStatus !== 'rendered') {
      return
    }

    await runExportAction('svg', 'SVG export prepared.', () => exportSvg(mermaidDocument.svg ?? '', 'ai-user-flow.svg'))
  }

  async function handleExportPng(): Promise<void> {
    if (!mermaidDocument?.svg || mermaidDocument.renderStatus !== 'rendered') {
      return
    }

    await runExportAction('png', 'PNG export prepared.', () => exportSvgToPng(mermaidDocument.svg ?? '', 'ai-user-flow.png'))
  }

  async function runExportAction(action: ExportAction, successMessage: string, task: () => void | Promise<void>): Promise<void> {
    const requestId = renderRequestId.current

    setExportStatus({
      status: 'working',
      action,
      message: null
    })

    try {
      await task()
      if (renderRequestId.current !== requestId) {
        return
      }

      setExportStatus({
        status: 'success',
        action,
        message: successMessage
      })
    } catch (error: unknown) {
      if (renderRequestId.current !== requestId) {
        return
      }

      setExportStatus({
        status: 'failed',
        action,
        message: error instanceof Error ? error.message : 'Export failed.'
      })
    }
  }

  return (
    <main className="workspace-shell">
      <section className="workspace-header" aria-labelledby="workspace-title">
        <p className="eyebrow">Phase 5 Confidence and QA handoff</p>
        <h1 id="workspace-title">AI User Flow Planner</h1>
        <p className="workspace-summary">
          Paste rough MVP notes to check minimum planning completeness before diagram generation.
        </p>
      </section>

      <section className="workspace-grid" aria-label="Planning workspace">
        <InputPanel rawText={rawText} onRawTextChange={handleRawTextChange} onAnalyze={handleAnalyze} />
        <AnalysisPanel
          analysis={analysis}
          suggestions={reviewedSuggestions}
          onSuggestionStatusChange={handleSuggestionStatusChange}
          mermaidDocument={mermaidDocument}
          flowDraft={flowDraft}
          exportStatus={exportStatus}
          onGenerateMermaid={handleGenerateMermaid}
          onNodeLabelChange={handleNodeLabelChange}
          onCopyMermaid={handleCopyMermaid}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
        />
      </section>
    </main>
  )
}
