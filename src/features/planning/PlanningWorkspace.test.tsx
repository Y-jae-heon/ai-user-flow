import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { PlanningWorkspace } from './PlanningWorkspace'

describe('PlanningWorkspace', () => {
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

    expect(screen.getByText('최소 정보가 부족합니다')).toBeInTheDocument()
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

    expect(screen.getByText('분석 가능한 입력입니다')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.getByText('PM과 개발자')).toBeInTheDocument()
    expect(screen.getByText('입력 완료, 분석 성공, 오류')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Logic gap suggestions' })).toBeInTheDocument()
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

    expect(screen.getByText('분석 가능한 입력입니다')).toBeInTheDocument()

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

    expect(screen.getByRole('heading', { name: 'Logic gap suggestions' })).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { name: 'Contradictions' })).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Accept Data sync failure' }))

    expect(screen.getByText('1 accepted / 0 rejected / 4 pending')).toBeInTheDocument()

    await user.type(textarea, ' 추가')

    expect(screen.queryByRole('heading', { name: 'Logic gap suggestions' })).not.toBeInTheDocument()
    expect(screen.queryByText('1 accepted / 0 rejected / 4 pending')).not.toBeInTheDocument()
  })
})
