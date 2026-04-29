import type { LogicGapSuggestion, MermaidDocument, PlanningAnalysis } from '../planningSchema'

interface MermaidOutputPanelProps {
  analysis: PlanningAnalysis
  suggestions: readonly LogicGapSuggestion[]
  mermaidDocument: MermaidDocument | null
  onGenerateMermaid: () => Promise<void>
}

export function MermaidOutputPanel({
  analysis,
  suggestions,
  mermaidDocument,
  onGenerateMermaid
}: MermaidOutputPanelProps) {
  if (!analysis.completeness.isSufficient) {
    return null
  }

  const hasBlockingContradiction = analysis.contradictions.some((contradiction) => contradiction.severity === 'blocking')
  const isRendering = mermaidDocument?.renderStatus === 'rendering' || mermaidDocument?.renderStatus === 'correcting'
  const isHappyPathBiased =
    suggestions.length > 0 && suggestions.every((suggestion) => suggestion.status === 'rejected')
  const acceptedCount = suggestions.filter((suggestion) => suggestion.status === 'accepted').length
  const statusText = mermaidDocument?.renderStatus ?? (hasBlockingContradiction ? 'blocked' : 'idle')

  return (
    <section className="analysis-section mermaid-output-section" aria-labelledby="mermaid-output-title">
      <div className="section-title-row">
        <h3 id="mermaid-output-title">Mermaid output</h3>
        <span className={`review-status ${statusText}`}>{statusText}</span>
      </div>

      {hasBlockingContradiction && (
        <div className="output-banner warning">
          <strong>Resolve blocking contradictions before generating Mermaid.</strong>
        </div>
      )}

      {isHappyPathBiased && (
        <div className="output-banner warning">
          <strong>Happy-path bias warning</strong>
          <p>All edge-case suggestions were rejected, so the draft may omit important exception paths.</p>
        </div>
      )}

      <div className="generation-row">
        <button type="button" onClick={onGenerateMermaid} disabled={hasBlockingContradiction || isRendering}>
          {isRendering ? 'Rendering Mermaid' : 'Generate Mermaid'}
        </button>
        <span className="muted">{acceptedCount} accepted suggestions will be merged.</span>
      </div>

      {mermaidDocument?.blockedReason && (
        <div className="output-banner warning">
          <strong>{mermaidDocument.blockedReason}</strong>
        </div>
      )}

      {mermaidDocument?.renderStatus === 'fallback' && (
        <div className="output-banner danger">
          <strong>Mermaid preview could not be rendered.</strong>
          <p>
            Retry count: {mermaidDocument.retryCount}. {mermaidDocument.renderError}
          </p>
        </div>
      )}

      {mermaidDocument?.svg && (
        <div
          className="mermaid-preview"
          aria-label="Rendered Mermaid preview"
          dangerouslySetInnerHTML={{ __html: mermaidDocument.svg }}
        />
      )}

      {mermaidDocument?.code && (
        <pre className="mermaid-code" aria-label="Generated Mermaid code">
          <code>{mermaidDocument.code}</code>
        </pre>
      )}
    </section>
  )
}
