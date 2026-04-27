import { useState } from 'react'
import { analyzePlanningInput } from './planningAnalyzer'
import type { LogicGapSuggestion, PlanningAnalysis, SuggestionStatus } from './planningSchema'
import { AnalysisPanel } from './components/AnalysisPanel'
import { InputPanel } from './components/InputPanel'

export function PlanningWorkspace() {
  const [rawText, setRawText] = useState('')
  const [analysis, setAnalysis] = useState<PlanningAnalysis | null>(null)
  const [reviewedSuggestions, setReviewedSuggestions] = useState<LogicGapSuggestion[]>([])

  function handleAnalyze(): void {
    const nextAnalysis = analyzePlanningInput(rawText)

    setAnalysis(nextAnalysis)
    setReviewedSuggestions(nextAnalysis.suggestions)
  }

  function handleRawTextChange(nextRawText: string): void {
    setRawText(nextRawText)
    setAnalysis(null)
    setReviewedSuggestions([])
  }

  function handleSuggestionStatusChange(id: string, status: SuggestionStatus): void {
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

  return (
    <main className="workspace-shell">
      <section className="workspace-header" aria-labelledby="workspace-title">
        <p className="eyebrow">Phase 2 planning review</p>
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
        />
      </section>
    </main>
  )
}
