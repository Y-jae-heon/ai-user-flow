import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as mermaidExport from './mermaidExport'
import * as mermaidRenderer from './mermaidRenderer'
import { createMermaidDraft, generateMermaidFlow } from './mermaidGenerator'
import { analyzePlanningInput } from './planningAnalyzer'
import * as planningApiClient from './planningApiClient'
import { createPlanningSessionSnapshot } from './planningContracts'
import { PlanningWorkspace } from './PlanningWorkspace'
import type { PlanningInput, PlanningSessionSnapshot } from './planningSchema'

vi.mock('./planningApiClient', () => {
  class PlanningApiClientError extends Error {
    readonly code: string
    readonly retryable: boolean
    readonly details?: unknown

    constructor(error: { code: string; message: string; retryable: boolean; details?: unknown }) {
      super(error.message)
      this.name = 'PlanningApiClientError'
      this.code = error.code
      this.retryable = error.retryable
      this.details = error.details
    }
  }

  return {
    PlanningApiClientError,
    createPlanningSession: vi.fn(),
    analyzePlanningSession: vi.fn(),
    generatePlanningMermaid: vi.fn(),
    validatePlanningMermaid: vi.fn()
  }
})

const DEFAULT_SESSION_ID = 'session_frontend_test'

let latestPlanningInput: PlanningInput = {
  rawText: ''
}

function setupPlanningApiMocks(): void {
  vi.mocked(planningApiClient.createPlanningSession).mockImplementation(async (input) => {
    latestPlanningInput = input
    return {
      ...createPlanningSessionSnapshot(input, null),
      id: DEFAULT_SESSION_ID
    }
  })

  vi.mocked(planningApiClient.analyzePlanningSession).mockImplementation(async (sessionId) => {
    const analysis = analyzePlanningInput(latestPlanningInput.rawText)
    return {
      ...createPlanningSessionSnapshot(latestPlanningInput, analysis),
      id: sessionId
    }
  })

  vi.mocked(planningApiClient.generatePlanningMermaid).mockImplementation(async (sessionId, request) => {
    const session = request?.session
    if (!session?.analysis) {
      throw new Error('Missing planning analysis')
    }

    const mermaidDocument = generateMermaidFlow({
      analysis: session.analysis,
      suggestions: session.analysis.suggestions
    })
    const flowDraft =
      mermaidDocument.renderStatus === 'blocked'
        ? null
        : createMermaidDraft({
            analysis: session.analysis,
            suggestions: session.analysis.suggestions
          })

    return {
      ...session,
      id: sessionId,
      status: mermaidDocument.renderStatus === 'generated' ? 'ready' : 'needs_clarification',
      flowDraft,
      mermaidDocument
    } satisfies PlanningSessionSnapshot
  })
}

describe('PlanningWorkspace', () => {
  beforeEach(() => {
    setupPlanningApiMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('renders a labeled MVP textarea', () => {
    render(<PlanningWorkspace />)

    expect(screen.getByLabelText(/MVP 기획 텍스트/i)).toBeInTheDocument()
  })

  test('disables analyze for empty input', () => {
    render(<PlanningWorkspace />)

    expect(screen.getByRole('button', { name: /Analyze/i })).toBeDisabled()
  })

  test('shows minimum information guidance for short vague input', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(screen.getByLabelText(/MVP 기획 텍스트/i), '아이디어 앱')
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByText('최소 정보가 부족합니다')).toBeInTheDocument()
    expect(screen.getByText('주요 사용자가 누구인지 최소 1개 이상 적어주세요.')).toBeInTheDocument()
  })

  test('shows grouped analysis for sufficient MVP text', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM과 개발자
문제: 기획서가 다르게 해석되어 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 액션을 분석하고 결과를 생성한다.
상태: 입력 완료, 분석 성공, 오류`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByText('분석 가능한 입력입니다')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.getByText('PM과 개발자')).toBeInTheDocument()
    expect(screen.getByText('입력 완료, 분석 성공, 오류')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Logic gap suggestions' })).toBeInTheDocument()
  })

  test('shows confidence labels for inferred planning assumptions', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `사용자: PM
문제: 기획서가 다르게 해석되어 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하고 분석 결과를 생성한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByRole('heading', { name: 'Assumptions' })).toBeInTheDocument()
    expect(screen.getByText('medium confidence')).toBeInTheDocument()
    expect(screen.getByText('low confidence')).toBeInTheDocument()
    expect(screen.getByText(/입력 완료, 분석 성공, 오류, 보류/)).toBeInTheDocument()
  })

  test('shows QA handoff grouped by suggestion review status', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.
상태: 입력 완료, 분석 성공, 오류`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await screen.findByRole('heading', { name: 'Logic gap suggestions' })
    await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))
    await user.click(screen.getByRole('button', { name: 'Reject Multi-persona notification gap' }))

    expect(screen.getByRole('heading', { name: 'QA handoff' })).toBeInTheDocument()
    expect(screen.getByText('1 accepted / 1 rejected / 3 pending tests')).toBeInTheDocument()
    expect(screen.getByText('Accepted candidate tests')).toBeInTheDocument()
    expect(screen.getByText('Rejected audit exclusions')).toBeInTheDocument()
    expect(screen.getByText('Pending QA review')).toBeInTheDocument()
    expect(screen.getByText('분석 결과와 렌더링 결과 동기화 실패')).toBeInTheDocument()
    expect(screen.getByText(/오래된 결과를 숨기고 최신 요청 기준/)).toBeInTheDocument()
  })

  test('clears prior analysis when input changes after analysis', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    const textarea = screen.getByLabelText(/MVP 기획 텍스트/i)
    await user.type(
      textarea,
      `주요 사용자: PM과 개발자
문제: 기획서가 다르게 해석되어 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 액션을 분석하고 결과를 생성한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByText('분석 가능한 입력입니다')).toBeInTheDocument()

    await user.clear(textarea)

    expect(screen.queryByText('분석 가능한 입력입니다')).not.toBeInTheDocument()
    expect(screen.getByText(/Paste MVP notes and run analysis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Analyze/i })).toBeDisabled()
  })

  test('lets the user accept and reject suggestions while preserving rejected items', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByRole('heading', { name: 'Logic gap suggestions' })).toBeInTheDocument()
    expect(screen.getAllByText('pending').length).toBeGreaterThanOrEqual(3)

    await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))
    await user.click(screen.getByRole('button', { name: 'Reject Multi-persona notification gap' }))

    expect(screen.getByText('Data sync failure')).toBeInTheDocument()
    expect(screen.getByText('Multi-persona notification gap')).toBeInTheDocument()
    expect(screen.getByText('1 accepted / 1 rejected / 3 pending')).toBeInTheDocument()
    expect(screen.getByText('accepted')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
  })

  test('shows blocking contradictions for incompatible planning rules', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: 구매자
문제: 로그인 없이 구매해야 하지만 회원 전용 혜택도 제공해야 한다.
핵심 기능: 사용자가 상품을 선택하고 주문을 생성한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByRole('heading', { name: 'Contradictions' })).toBeInTheDocument()
    expect(screen.getByText('Guest purchase conflicts with member-only benefit')).toBeInTheDocument()
    expect(screen.getByText('blocking')).toBeInTheDocument()
  })

  test('clears suggestion review state when input changes', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    const textarea = screen.getByLabelText(/MVP 기획 텍스트/i)
    await user.type(
      textarea,
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await screen.findByRole('heading', { name: 'Logic gap suggestions' })
    await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))

    expect(screen.getByText('1 accepted / 0 rejected / 4 pending')).toBeInTheDocument()

    await user.type(textarea, ' 추가')

    expect(screen.queryByRole('heading', { name: 'Logic gap suggestions' })).not.toBeInTheDocument()
    expect(screen.queryByText('1 accepted / 0 rejected / 4 pending')).not.toBeInTheDocument()
  })

  test('generates Mermaid code and preview from accepted suggestions', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockResolvedValueOnce({
      code: 'flowchart TD\n  exception_1["Exception: Data sync failure"]',
      renderStatus: 'rendered',
      retryCount: 0,
      renderError: null,
      svg: '<svg aria-label="Generated Mermaid preview"></svg>',
      isHappyPathBiased: false,
      blockedReason: null
    })
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.
상태: 입력 완료, 분석 성공, 오류`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await screen.findByRole('heading', { name: 'Logic gap suggestions' })
    await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))

    const codeBlock = await screen.findByLabelText('Generated Mermaid code')
    expect(screen.getByLabelText('Rendered Mermaid preview')).toBeInTheDocument()
    expect(screen.getByText('rendered')).toBeInTheDocument()
    expect(codeBlock.textContent).toContain('flowchart TD')
    expect(codeBlock.textContent).toContain('Exception: Data sync failure')
    expect(codeBlock.textContent).not.toContain('Exception: Multi-persona notification gap')
  })

  test('updates Mermaid code and preview when an editable node label changes', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockImplementation(async (code: string) => ({
      code,
      renderStatus: 'rendered',
      retryCount: 0,
      renderError: null,
      svg: '<svg aria-label="Generated Mermaid preview"></svg>',
      isHappyPathBiased: false,
      blockedReason: null
    }))
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.
상태: 입력 완료, 분석 성공, 오류`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))

    const nodeInput = await screen.findByLabelText('Edit node MVP planning text received')
    fireEvent.change(nodeInput, { target: { value: 'Imported PRD memo received' } })

    const codeBlock = await screen.findByLabelText('Generated Mermaid code')
    expect(codeBlock.textContent).toContain('Imported PRD memo received')
    expect(mermaidRenderer.renderMermaidDocument).toHaveBeenCalledTimes(2)
  })

  test('blocks Mermaid generation when contradictions are unresolved', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: 구매자
문제: 로그인 없이 구매해야 하지만 회원 전용 혜택도 제공해야 한다.
핵심 기능: 사용자가 상품을 선택하고 주문을 생성한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByRole('button', { name: /Generate Mermaid/i })).toBeDisabled()
    expect(screen.getByText('Resolve blocking contradictions before generating Mermaid.')).toBeInTheDocument()
  })

  test('clears Mermaid output when input changes', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    const textarea = screen.getByLabelText(/MVP 기획 텍스트/i)
    await user.type(
      textarea,
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.
상태: 입력 완료, 분석 성공, 오류`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await screen.findByRole('heading', { name: 'Logic gap suggestions' })
    await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))

    expect(await screen.findByLabelText('Generated Mermaid code')).toBeInTheDocument()

    await user.type(textarea, ' 추가')

    expect(screen.queryByLabelText('Generated Mermaid code')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Refine nodes' })).not.toBeInTheDocument()
  })

  test('disables export actions until a rendered SVG is available', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    expect(await screen.findByRole('button', { name: 'Copy Mermaid' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export SVG' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeDisabled()
  })

  test('copies Mermaid code with success feedback', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockImplementation(async (code: string) => ({
      code,
      renderStatus: 'rendered',
      retryCount: 0,
      renderError: null,
      svg: '<svg aria-label="Generated Mermaid preview"></svg>',
      isHappyPathBiased: false,
      blockedReason: null
    }))
    vi.spyOn(mermaidExport, 'copyMermaidCode').mockResolvedValueOnce()
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))
    await user.click(await screen.findByRole('button', { name: 'Copy Mermaid' }))

    expect(mermaidExport.copyMermaidCode).toHaveBeenCalledWith(expect.stringContaining('flowchart TD'))
    expect(await screen.findByText('Mermaid code copied.')).toBeInTheDocument()
  })

  test('ignores stale export success after suggestion changes during copy', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockImplementation(async (code: string) => ({
      code,
      renderStatus: 'rendered',
      retryCount: 0,
      renderError: null,
      svg: '<svg aria-label="Generated Mermaid preview"></svg>',
      isHappyPathBiased: false,
      blockedReason: null
    }))
    let resolveCopy: () => void = () => undefined
    const copyPromise = new Promise<void>((resolve) => {
      resolveCopy = resolve
    })
    vi.spyOn(mermaidExport, 'copyMermaidCode').mockReturnValueOnce(copyPromise)
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    const textarea = screen.getByLabelText(/MVP 기획 텍스트/i)
    await user.type(
      textarea,
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))
    await user.click(await screen.findByRole('button', { name: 'Copy Mermaid' }))

    await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))
    await act(async () => {
      resolveCopy()
      await copyPromise
    })

    expect(screen.queryByText('Mermaid code copied.')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Generated Mermaid code')).not.toBeInTheDocument()
  })

  test('shows copy failure while preserving generated code', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockImplementation(async (code: string) => ({
      code,
      renderStatus: 'rendered',
      retryCount: 0,
      renderError: null,
      svg: '<svg aria-label="Generated Mermaid preview"></svg>',
      isHappyPathBiased: false,
      blockedReason: null
    }))
    vi.spyOn(mermaidExport, 'copyMermaidCode').mockRejectedValueOnce(new Error('Clipboard denied'))
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))
    await user.click(await screen.findByRole('button', { name: 'Copy Mermaid' }))

    expect(await screen.findByText('Clipboard denied')).toBeInTheDocument()
    expect(screen.getByLabelText('Generated Mermaid code')).toBeInTheDocument()
  })

  test('exports SVG from the rendered preview', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockImplementation(async (code: string) => ({
      code,
      renderStatus: 'rendered',
      retryCount: 0,
      renderError: null,
      svg: '<svg aria-label="Generated Mermaid preview"></svg>',
      isHappyPathBiased: false,
      blockedReason: null
    }))
    vi.spyOn(mermaidExport, 'exportSvg').mockImplementationOnce(() => undefined)
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))
    await user.click(await screen.findByRole('button', { name: 'Export SVG' }))

    expect(mermaidExport.exportSvg).toHaveBeenCalledWith(
      '<svg aria-label="Generated Mermaid preview"></svg>',
      'ai-user-flow.svg'
    )
    expect(await screen.findByText('SVG export prepared.')).toBeInTheDocument()
  })

  test('shows PNG export failure while preserving code and preview', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockImplementation(async (code: string) => ({
      code,
      renderStatus: 'rendered',
      retryCount: 0,
      renderError: null,
      svg: '<svg aria-label="Generated Mermaid preview"></svg>',
      isHappyPathBiased: false,
      blockedReason: null
    }))
    vi.spyOn(mermaidExport, 'exportSvgToPng').mockRejectedValueOnce(new Error('PNG failed'))
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))
    await user.click(await screen.findByRole('button', { name: 'Export PNG' }))

    expect(await screen.findByText('PNG failed')).toBeInTheDocument()
    expect(screen.getByLabelText('Generated Mermaid code')).toBeInTheDocument()
    expect(screen.getByLabelText('Rendered Mermaid preview')).toBeInTheDocument()
  })

  test('shows happy-path warning while allowing generation when all suggestions are rejected', async () => {
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))

    for (const rejectButton of screen.getAllByRole('button', { name: /^Reject / })) {
      await user.click(rejectButton)
    }

    expect(screen.getByText('Happy-path bias warning')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))

    const codeBlock = await screen.findByLabelText('Generated Mermaid code')
    expect(codeBlock.textContent).toContain('Warning: no exception paths accepted')
  })

  test('shows fallback state when Mermaid rendering cannot recover', async () => {
    vi.spyOn(mermaidRenderer, 'renderMermaidDocument').mockResolvedValueOnce({
      code: 'flowchart TD\n  start["Start"]',
      renderStatus: 'fallback',
      retryCount: 1,
      renderError: 'render failed',
      svg: null,
      isHappyPathBiased: false,
      blockedReason: null
    })
    const user = userEvent.setup()
    render(<PlanningWorkspace />)

    await user.type(
      screen.getByLabelText(/MVP 기획 텍스트/i),
      `주요 사용자: PM, 개발자, QA
문제: Mermaid 렌더러와 AI 분석 결과가 동기화되지 않아 재작업이 발생한다.
핵심 기능: 사용자가 MVP 메모를 입력하면 시스템이 분석 결과를 생성하고 공유한다.`
    )
    await user.click(screen.getByRole('button', { name: /Analyze/i }))
    await user.click(screen.getByRole('button', { name: /Generate Mermaid/i }))

    expect(await screen.findByText('Mermaid preview could not be rendered.')).toBeInTheDocument()
    expect(screen.getByText(/Retry count: 1. render failed/)).toBeInTheDocument()
    expect(screen.getByLabelText('Generated Mermaid code').textContent).toContain('flowchart TD')
  })
})
