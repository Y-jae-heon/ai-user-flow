import { useRef, useState } from 'react'
import type {
  ExportAction,
  ExportStatus,
  FlowDraft,
  LogicGapSuggestion,
  MermaidDocument,
  PlanningAnalysis,
  PlanningSessionSnapshot,
  SuggestionStatus
} from './planningSchema'
import { planningSessionSnapshotSchema } from './planningSchema'
import { serializeMermaidDraft, updateMermaidDraftNode } from './mermaidGenerator'
import { renderMermaidDocument } from './mermaidRenderer'
import { copyMermaidCode, exportSvg, exportSvgToPng } from './mermaidExport'
import { AnalysisPanel } from './components/AnalysisPanel'
import { InputPanel } from './components/InputPanel'
import { analyzePlanningSession, createPlanningSession, generatePlanningMermaid, PlanningApiClientError } from './planningApiClient'

const IDLE_EXPORT_STATUS: ExportStatus = {
  status: 'idle',
  action: null,
  message: null
}

type RequestStatus = 'idle' | 'loading' | 'success' | 'failed'

export function PlanningWorkspace() {
  const [rawText, setRawText] = useState('')
  const [planningSession, setPlanningSession] = useState<PlanningSessionSnapshot | null>(null)
  const [analysis, setAnalysis] = useState<PlanningAnalysis | null>(null)
  const [reviewedSuggestions, setReviewedSuggestions] = useState<LogicGapSuggestion[]>([])
  const [mermaidDocument, setMermaidDocument] = useState<MermaidDocument | null>(null)
  const [flowDraft, setFlowDraft] = useState<FlowDraft | null>(null)
  const [exportStatus, setExportStatus] = useState<ExportStatus>(IDLE_EXPORT_STATUS)
  const [analysisStatus, setAnalysisStatus] = useState<RequestStatus>('idle')
  const [generationStatus, setGenerationStatus] = useState<RequestStatus>('idle')
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const renderRequestId = useRef(0)

  async function handleAnalyze(): Promise<void> {
    if (rawText.trim().length === 0) {
      return
    }

    const requestId = renderRequestId.current + 1
    renderRequestId.current = requestId
    setAnalysisStatus('loading')
    setGenerationStatus('idle')
    setAnalysisError(null)
    setGenerationError(null)
    setPlanningSession(null)
    setAnalysis(null)
    setReviewedSuggestions([])
    setMermaidDocument(null)
    setFlowDraft(null)
    setExportStatus(IDLE_EXPORT_STATUS)

    try {
      const createdSession = await createPlanningSession({ rawText })
      const analyzedSession = await analyzePlanningSession(createdSession.id, {})

      if (renderRequestId.current !== requestId) {
        return
      }

      if (!analyzedSession.analysis) {
        throw new Error('Planning analysis was not returned by the backend.')
      }

      setPlanningSession(analyzedSession)
      setAnalysis(analyzedSession.analysis)
      setReviewedSuggestions(analyzedSession.analysis.suggestions)
      setAnalysisStatus('success')
    } catch (error: unknown) {
      if (renderRequestId.current !== requestId || isRequestAbort(error)) {
        return
      }

      setAnalysisStatus('failed')
      setAnalysisError(getUserSafeErrorMessage(error, 'Planning analysis failed.'))
    }
  }

  function handleRawTextChange(nextRawText: string): void {
    renderRequestId.current += 1
    setRawText(nextRawText)
    setPlanningSession(null)
    setAnalysis(null)
    setReviewedSuggestions([])
    setMermaidDocument(null)
    setFlowDraft(null)
    setExportStatus(IDLE_EXPORT_STATUS)
    setAnalysisStatus('idle')
    setGenerationStatus('idle')
    setAnalysisError(null)
    setGenerationError(null)
  }

  function handleSuggestionStatusChange(id: string, status: SuggestionStatus): void {
    renderRequestId.current += 1
    setMermaidDocument(null)
    setFlowDraft(null)
    setExportStatus(IDLE_EXPORT_STATUS)
    setGenerationStatus('idle')
    setGenerationError(null)
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
    if (!analysis || !planningSession) {
      setGenerationStatus('failed')
      setGenerationError('Run backend analysis before generating Mermaid.')
      return
    }

    const requestId = renderRequestId.current + 1
    renderRequestId.current = requestId
    setGenerationStatus('loading')
    setGenerationError(null)
    setExportStatus(IDLE_EXPORT_STATUS)

    try {
      const sessionForGeneration = createSessionForGeneration(planningSession, reviewedSuggestions)
      const generatedSession = await generatePlanningMermaid(sessionForGeneration.id, {
        session: sessionForGeneration
      })

      if (renderRequestId.current !== requestId) {
        return
      }

      setPlanningSession(generatedSession)
      setFlowDraft(generatedSession.flowDraft)

      if (!generatedSession.mermaidDocument) {
        throw new Error('Mermaid document was not returned by the backend.')
      }

      if (generatedSession.mermaidDocument.renderStatus === 'blocked') {
        setMermaidDocument(generatedSession.mermaidDocument)
        setGenerationStatus('success')
        return
      }

      if (generatedSession.mermaidDocument.renderStatus === 'fallback') {
        setMermaidDocument(generatedSession.mermaidDocument)
        setGenerationStatus('success')
        return
      }

      setMermaidDocument({
        ...generatedSession.mermaidDocument,
        renderStatus: 'rendering'
      })

      const renderedDocument = await renderMermaidDocument(generatedSession.mermaidDocument.code)

      if (renderRequestId.current !== requestId) {
        return
      }

      setMermaidDocument({
        ...renderedDocument,
        isHappyPathBiased: generatedSession.mermaidDocument.isHappyPathBiased,
        retryCount: Math.max(renderedDocument.retryCount, generatedSession.mermaidDocument.retryCount),
        blockedReason: generatedSession.mermaidDocument.blockedReason,
        renderError: renderedDocument.renderError ?? generatedSession.mermaidDocument.renderError
      })
      setGenerationStatus('success')
    } catch (error: unknown) {
      if (renderRequestId.current !== requestId || isRequestAbort(error)) {
        return
      }

      setGenerationStatus('failed')
      setGenerationError(getUserSafeErrorMessage(error, 'Mermaid generation failed.'))
    }
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
        <InputPanel
          rawText={rawText}
          onRawTextChange={handleRawTextChange}
          onAnalyze={handleAnalyze}
          isAnalyzing={analysisStatus === 'loading'}
          errorMessage={analysisError}
        />
        <AnalysisPanel
          analysis={analysis}
          suggestions={reviewedSuggestions}
          analysisStatus={analysisStatus}
          generationStatus={generationStatus}
          generationError={generationError}
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

function createSessionForGeneration(
  planningSession: PlanningSessionSnapshot,
  reviewedSuggestions: readonly LogicGapSuggestion[]
): PlanningSessionSnapshot {
  if (!planningSession.analysis) {
    throw new Error('Planning analysis is required before Mermaid generation.')
  }

  return planningSessionSnapshotSchema.parse({
    ...planningSession,
    analysis: {
      ...planningSession.analysis,
      suggestions: reviewedSuggestions
    }
  })
}

function getUserSafeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof PlanningApiClientError || error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}

function isRequestAbort(error: unknown): boolean {
  return error instanceof PlanningApiClientError && error.code === 'REQUEST_ABORTED'
}
