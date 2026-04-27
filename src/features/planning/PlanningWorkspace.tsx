import { useState } from 'react'
import { analyzePlanningInput } from './planningAnalyzer'
import type { PlanningAnalysis } from './planningSchema'
import { AnalysisPanel } from './components/AnalysisPanel'
import { InputPanel } from './components/InputPanel'

export function PlanningWorkspace() {
  const [rawText, setRawText] = useState('')
  const [analysis, setAnalysis] = useState<PlanningAnalysis | null>(null)

  function handleAnalyze(): void {
    setAnalysis(analyzePlanningInput(rawText))
  }

  function handleRawTextChange(nextRawText: string): void {
    setRawText(nextRawText)
    setAnalysis(null)
  }

  return (
    <main className="workspace-shell">
      <section className="workspace-header" aria-labelledby="workspace-title">
        <p className="eyebrow">Phase 1 planning gate</p>
        <h1 id="workspace-title">AI User Flow Planner</h1>
        <p className="workspace-summary">
          Paste rough MVP notes to check minimum planning completeness before diagram generation.
        </p>
      </section>

      <section className="workspace-grid" aria-label="Planning workspace">
        <InputPanel rawText={rawText} onRawTextChange={handleRawTextChange} onAnalyze={handleAnalyze} />
        <AnalysisPanel analysis={analysis} />
      </section>
    </main>
  )
}
