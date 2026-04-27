interface InputPanelProps {
  rawText: string
  onRawTextChange: (value: string) => void
  onAnalyze: () => void
}

const EXAMPLE_PLACEHOLDER = `예: 주요 사용자: 초기 창업가
문제: 해피 패스만 생각해 예외 상황을 놓친다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 페르소나와 액션을 분석한다.`

export function InputPanel({ rawText, onRawTextChange, onAnalyze }: InputPanelProps) {
  const isAnalyzeDisabled = rawText.trim().length === 0

  return (
    <form
      className="tool-panel input-panel"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isAnalyzeDisabled) {
          onAnalyze()
        }
      }}
    >
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Input</p>
          <h2>MVP notes</h2>
        </div>
        <span className="character-count">{rawText.length} chars</span>
      </div>

      <label className="field-label" htmlFor="mvp-notes">
        MVP 기획 텍스트
      </label>
      <textarea
        id="mvp-notes"
        name="mvp-notes"
        value={rawText}
        onChange={(event) => onRawTextChange(event.target.value)}
        placeholder={EXAMPLE_PLACEHOLDER}
        rows={18}
      />

      <div className="panel-actions">
        <button type="submit" disabled={isAnalyzeDisabled}>
          Analyze
        </button>
      </div>
    </form>
  )
}

