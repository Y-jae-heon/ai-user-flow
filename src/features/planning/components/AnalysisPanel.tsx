import type { PlanningAnalysis } from '../planningSchema'

interface AnalysisPanelProps {
  analysis: PlanningAnalysis | null
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <section className="tool-panel analysis-panel" aria-label="Analysis result">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Output</p>
            <h2>Readiness check</h2>
          </div>
        </div>
        <div className="empty-state">
          <p>Paste MVP notes and run analysis to see completeness, extracted actors, and planning signals.</p>
        </div>
      </section>
    )
  }

  const statusText = analysis.completeness.isSufficient ? '분석 가능한 입력입니다' : '최소 정보가 부족합니다'

  return (
    <section className="tool-panel analysis-panel" aria-label="Analysis result">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Output</p>
          <h2>Readiness check</h2>
        </div>
        <span className={analysis.completeness.isSufficient ? 'status-pill success' : 'status-pill warning'}>
          {analysis.completeness.score}/100
        </span>
      </div>

      <div className={analysis.completeness.isSufficient ? 'result-banner success' : 'result-banner warning'}>
        <strong>{statusText}</strong>
        {!analysis.completeness.isSufficient && <p>아래 항목을 보완한 뒤 다시 분석하세요.</p>}
      </div>

      {!analysis.completeness.isSufficient && (
        <section className="analysis-section" aria-labelledby="guidance-title">
          <h3 id="guidance-title">Guidance</h3>
          <ul>
            {analysis.completeness.guidance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <AnalysisList title="Personas" items={analysis.personas} emptyText="사용자 정보가 아직 충분하지 않습니다." />
      <AnalysisList title="Entities" items={analysis.entities} emptyText="시스템 또는 데이터 엔티티가 명시되지 않았습니다." />
      <AnalysisList title="Actions" items={analysis.actions} emptyText="핵심 액션이나 시나리오가 필요합니다." />
      <AnalysisList title="States" items={analysis.states} emptyText="명시적인 상태 후보가 없습니다." />
      <AnalysisList title="Assumptions" items={analysis.assumptions} emptyText="현재 표시할 가정이 없습니다." />
    </section>
  )
}

interface AnalysisListProps {
  title: string
  items: readonly string[]
  emptyText: string
}

function AnalysisList({ title, items, emptyText }: AnalysisListProps) {
  return (
    <section className="analysis-section" aria-labelledby={`${title.toLowerCase()}-title`}>
      <h3 id={`${title.toLowerCase()}-title`}>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </section>
  )
}

