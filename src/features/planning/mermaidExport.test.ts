import { describe, expect, test, vi } from 'vitest'
import { copyMermaidCode, exportSvg, exportSvgToPng } from './mermaidExport'

function createUrlDependencies() {
  const createdUrls: string[] = []
  const revokedUrls: string[] = []
  const downloaded: Array<{ url: string; filename: string }> = []

  return {
    createdUrls,
    revokedUrls,
    downloaded,
    dependencies: {
      createObjectUrl: vi.fn(() => {
        const url = `blob:test-${createdUrls.length + 1}`
        createdUrls.push(url)
        return url
      }),
      revokeObjectUrl: vi.fn((url: string) => {
        revokedUrls.push(url)
      }),
      clickDownload: vi.fn((url: string, filename: string) => {
        downloaded.push({ url, filename })
      })
    }
  }
}

function createCanvas(blob: Blob | null = new Blob(['png'], { type: 'image/png' })) {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      drawImage: vi.fn()
    })),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(blob))
  } as unknown as HTMLCanvasElement
}

describe('mermaidExport', () => {
  test('copies Mermaid code through the Clipboard API', async () => {
    const writeText = vi.fn(async () => undefined)

    await copyMermaidCode('flowchart TD', {
      clipboard: { writeText }
    })

    expect(writeText).toHaveBeenCalledWith('flowchart TD')
  })

  test('surfaces clipboard failures', async () => {
    await expect(
      copyMermaidCode('flowchart TD', {
        clipboard: {
          writeText: vi.fn(async () => {
            throw new Error('permission denied')
          })
        }
      })
    ).rejects.toThrow('permission denied')
  })

  test('exports SVG with object URL cleanup', () => {
    const { dependencies, downloaded, revokedUrls } = createUrlDependencies()

    exportSvg('<svg></svg>', 'planner.svg', dependencies)

    expect(downloaded).toEqual([{ url: 'blob:test-1', filename: 'planner.svg' }])
    expect(revokedUrls).toEqual(['blob:test-1'])
  })

  test('exports PNG from SVG with object URL cleanup', async () => {
    const { dependencies, downloaded, revokedUrls } = createUrlDependencies()

    await exportSvgToPng('<svg></svg>', 'planner.png', {
      ...dependencies,
      loadImage: vi.fn(async () => ({ width: 640, height: 360 } as HTMLImageElement)),
      createCanvas: vi.fn(() => createCanvas())
    })

    expect(downloaded).toEqual([{ url: 'blob:test-2', filename: 'planner.png' }])
    expect(revokedUrls).toEqual(['blob:test-2', 'blob:test-1'])
  })

  test('revokes the SVG object URL when PNG image loading fails', async () => {
    const { dependencies, revokedUrls } = createUrlDependencies()

    await expect(
      exportSvgToPng('<svg></svg>', 'planner.png', {
        ...dependencies,
        loadImage: vi.fn(async () => {
          throw new Error('load failed')
        })
      })
    ).rejects.toThrow('load failed')
    expect(revokedUrls).toEqual(['blob:test-1'])
  })

  test('fails PNG export when canvas has no 2D context', async () => {
    const { dependencies } = createUrlDependencies()

    await expect(
      exportSvgToPng('<svg></svg>', 'planner.png', {
        ...dependencies,
        loadImage: vi.fn(async () => ({ width: 640, height: 360 } as HTMLImageElement)),
        createCanvas: vi.fn(
          () =>
            ({
              getContext: vi.fn(() => null)
            }) as unknown as HTMLCanvasElement
        )
      })
    ).rejects.toThrow('Canvas 2D context is not available.')
  })

  test('fails PNG export when canvas returns no blob', async () => {
    const { dependencies } = createUrlDependencies()

    await expect(
      exportSvgToPng('<svg></svg>', 'planner.png', {
        ...dependencies,
        loadImage: vi.fn(async () => ({ width: 640, height: 360 } as HTMLImageElement)),
        createCanvas: vi.fn(() => createCanvas(null))
      })
    ).rejects.toThrow('canvas returned no image data')
  })
})
