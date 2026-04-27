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
})
