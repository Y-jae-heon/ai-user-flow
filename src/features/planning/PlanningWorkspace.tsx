import { useRef, useState } from 'react'
import { analyzePlanningInput } from './planningAnalyzer'
import type { LogicGapSuggestion, MermaidDocument, PlanningAnalysis, SuggestionStatus } from './planningSchema'
import { generateMermaidFlow } from './mermaidGenerator'
import { renderMermaidDocument } from './mermaidRenderer'
import { AnalysisPanel } from './components/AnalysisPanel'
import { InputPanel } from './components/InputPanel'

export function PlanningWorkspace() {
  const [rawText, setRawText] = useState('')
  const [analysis, setAnalysis] = useState<PlanningAnalysis | null>(null)
  const [reviewedSuggestions, setReviewedSuggestions] = useState<LogicGapSuggestion[]>([])
  const [mermaidDocument, setMermaidDocument] = useState<MermaidDocument | null>(null)
  const renderRequestId = useRef(0)

  function handleAnalyze(): void {
    const nextAnalysis = analyzePlanningInput(rawText)

    renderRequestId.current += 1
    setAnalysis(nextAnalysis)
    setReviewedSuggestions(nextAnalysis.suggestions)
    setMermaidDocument(null)
  }

  function handleRawTextChange(nextRawText: string): void {
    renderRequestId.current += 1
    setRawText(nextRawText)
    setAnalysis(null)
    setReviewedSuggestions([])
    setMermaidDocument(null)
  }

  function handleSuggestionStatusChange(id: string, status: SuggestionStatus): void {
    renderRequestId.current += 1
    setMermaidDocument(null)
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
      return
    }

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

  return (
    <main className="workspace-shell">
      <section className="workspace-header" aria-labelledby="workspace-title">
        <p className="eyebrow">Phase 3 Mermaid generation</p>
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
          onGenerateMermaid={handleGenerateMermaid}
        />
      </section>
    </main>
  )
}
