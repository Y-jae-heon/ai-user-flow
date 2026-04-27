import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import App from './App'

describe('App', () => {
  test('renders the planning workspace', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /AI User Flow Planner/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/MVP 기획 텍스트/i)).toBeInTheDocument()
  })
})

