import { MermaidParserAdapter, MermaidSyntaxService } from './mermaid-syntax.service'

function createAdapter(parseResult: unknown): MermaidParserAdapter {
  return {
    initialize: jest.fn(),
    parse: jest.fn(async () => parseResult)
  }
}

describe('MermaidSyntaxService', () => {
  it('passes valid parser results without rendering', async () => {
    const adapter = createAdapter({ diagramType: 'flowchart-v2' })
    const service = new MermaidSyntaxService(adapter)
    const report = await service.validateSyntax('flowchart TD\n  a --> b')

    expect(report.mermaidSyntax).toBe('passed')
    expect(adapter.parse).toHaveBeenCalledWith('flowchart TD\n  a --> b', { suppressErrors: false })
  })

  it('fails parser false results', async () => {
    const service = new MermaidSyntaxService(createAdapter(false))
    const report = await service.validateSyntax('notMermaid')

    expect(report.mermaidSyntax).toBe('failed')
  })

  it('fails thrown parser errors', async () => {
    const adapter: MermaidParserAdapter = {
      initialize: jest.fn(),
      parse: jest.fn(async () => {
        throw new Error('bad syntax')
      })
    }
    const service = new MermaidSyntaxService(adapter)
    const report = await service.validateSyntax('notMermaid')

    expect(report.mermaidSyntax).toBe('failed')
    expect(report.errors[0]).toBe('bad syntax')
  })

  it('does not mark conservative flowcharts as passed when parser validation is unavailable', async () => {
    const adapter: MermaidParserAdapter = {
      initialize: jest.fn(),
      parse: jest.fn(async () => {
        throw new Error('DOMPurify.sanitize is not a function')
      })
    }
    const service = new MermaidSyntaxService(adapter)
    const report = await service.validateSyntax('flowchart TD\n  a["Start"] --> b["End"]')

    expect(report.mermaidSyntax).toBe('failed')
    expect(report.errors[0]).toBe('Mermaid parser validation unavailable.')
  })

  it('does not expose parser runtime compatibility errors for unsupported syntax', async () => {
    const adapter: MermaidParserAdapter = {
      initialize: jest.fn(),
      parse: jest.fn(async () => {
        throw new Error('DOMPurify.sanitize is not a function')
      })
    }
    const service = new MermaidSyntaxService(adapter)
    const report = await service.validateSyntax('notMermaid')

    expect(report.mermaidSyntax).toBe('failed')
    expect(report.errors[0]).toBe('Mermaid parser validation unavailable.')
  })
})
