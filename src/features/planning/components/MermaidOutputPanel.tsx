import type { ExportStatus, FlowDraft, FlowNode, LogicGapSuggestion, MermaidDocument, PlanningAnalysis } from '../planningSchema'

interface MermaidOutputPanelProps {
  analysis: PlanningAnalysis
  suggestions: readonly LogicGapSuggestion[]
  mermaidDocument: MermaidDocument | null
  flowDraft: FlowDraft | null
  exportStatus: ExportStatus
  onGenerateMermaid: () => Promise<void>
  onNodeLabelChange: (nodeId: string, label: string) => Promise<void>
  onCopyMermaid: () => Promise<void>
  onExportSvg: () => Promise<void>
  onExportPng: () => Promise<void>
}

export function MermaidOutputPanel({
  analysis,
  suggestions,
  mermaidDocument,
  flowDraft,
  exportStatus,
  onGenerateMermaid,
  onNodeLabelChange,
  onCopyMermaid,
  onExportSvg,
  onExportPng
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
  const canExport = mermaidDocument?.renderStatus === 'rendered' && Boolean(mermaidDocument.svg)
  const hasCode = Boolean(mermaidDocument?.code)

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
        <MermaidActionRow
          canCopy={hasCode}
          canExport={canExport}
          isWorking={exportStatus.status === 'working'}
          onCopyMermaid={onCopyMermaid}
          onExportSvg={onExportSvg}
          onExportPng={onExportPng}
        />
        <span className="muted">{acceptedCount} accepted suggestions will be merged.</span>
      </div>

      <ExportStatusBanner exportStatus={exportStatus} />

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

      {flowDraft && <MermaidNodeEditor flowDraft={flowDraft} onNodeLabelChange={onNodeLabelChange} />}

      {mermaidDocument?.code && (
        <pre className="mermaid-code" aria-label="Generated Mermaid code">
          <code>{mermaidDocument.code}</code>
        </pre>
      )}
    </section>
  )
}

interface MermaidActionRowProps {
  canCopy: boolean
  canExport: boolean
  isWorking: boolean
  onCopyMermaid: () => Promise<void>
  onExportSvg: () => Promise<void>
  onExportPng: () => Promise<void>
}

function MermaidActionRow({
  canCopy,
  canExport,
  isWorking,
  onCopyMermaid,
  onExportSvg,
  onExportPng
}: MermaidActionRowProps) {
  return (
    <div className="export-actions" aria-label="Mermaid export actions">
      <button type="button" className="secondary-button" onClick={onCopyMermaid} disabled={!canCopy || isWorking}>
        Copy Mermaid
      </button>
      <button type="button" className="secondary-button" onClick={onExportSvg} disabled={!canExport || isWorking}>
        Export SVG
      </button>
      <button type="button" className="secondary-button" onClick={onExportPng} disabled={!canExport || isWorking}>
        Export PNG
      </button>
    </div>
  )
}

function ExportStatusBanner({ exportStatus }: { exportStatus: ExportStatus }) {
  if (exportStatus.status === 'idle' || !exportStatus.message) {
    return null
  }

  return (
    <div className={`output-banner ${exportStatus.status === 'failed' ? 'danger' : 'success'}`}>
      <strong>{exportStatus.message}</strong>
    </div>
  )
}

interface MermaidNodeEditorProps {
  flowDraft: FlowDraft
  onNodeLabelChange: (nodeId: string, label: string) => Promise<void>
}

function MermaidNodeEditor({ flowDraft, onNodeLabelChange }: MermaidNodeEditorProps) {
  const editableNodes = flowDraft.nodes.filter((node) => node.editable)

  return (
    <section className="node-editor" aria-labelledby="node-editor-title">
      <div className="section-title-row">
        <h4 id="node-editor-title">Refine nodes</h4>
        <span className="muted">{editableNodes.length} editable nodes</span>
      </div>
      <div className="node-editor-list">
        {flowDraft.sections.map((section) => {
          const sectionNodes = editableNodes.filter((node) => node.sectionId === section.id)
          if (sectionNodes.length === 0) {
            return null
          }

          return (
            <div className="node-editor-group" key={section.id}>
              <p className="category-label">{section.label}</p>
              {sectionNodes.map((node) => (
                <NodeEditorRow node={node} key={node.id} onNodeLabelChange={onNodeLabelChange} />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

interface NodeEditorRowProps {
  node: FlowNode
  onNodeLabelChange: (nodeId: string, label: string) => Promise<void>
}

function NodeEditorRow({ node, onNodeLabelChange }: NodeEditorRowProps) {
  return (
    <label className="node-editor-row">
      <span>{node.id}</span>
      <input
        aria-label={`Edit node ${node.label}`}
        value={node.label}
        onChange={(event) => void onNodeLabelChange(node.id, event.target.value)}
      />
    </label>
  )
}
