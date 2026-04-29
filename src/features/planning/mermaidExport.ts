interface ClipboardWriter {
  writeText: (text: string) => Promise<void>
}

interface DownloadDependencies {
  clipboard?: ClipboardWriter
  createObjectUrl?: (blob: Blob) => string
  revokeObjectUrl?: (url: string) => void
  clickDownload?: (url: string, filename: string) => void
  loadImage?: (url: string) => Promise<HTMLImageElement>
  createCanvas?: (width: number, height: number) => HTMLCanvasElement
}

const SVG_MIME_TYPE = 'image/svg+xml;charset=utf-8'
const PNG_MIME_TYPE = 'image/png'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800

export async function copyMermaidCode(code: string, dependencies: DownloadDependencies = {}): Promise<void> {
  const clipboard = dependencies.clipboard ?? navigator.clipboard
  if (!clipboard?.writeText) {
    throw new Error('Clipboard API is not available in this browser context.')
  }

  await clipboard.writeText(code)
}

export function exportSvg(svg: string, filename: string, dependencies: DownloadDependencies = {}): void {
  const blob = new Blob([svg], { type: SVG_MIME_TYPE })
  downloadBlob(blob, filename, dependencies)
}

export async function exportSvgToPng(
  svg: string,
  filename: string,
  dependencies: DownloadDependencies = {}
): Promise<void> {
  const createObjectUrl = dependencies.createObjectUrl ?? URL.createObjectURL
  const revokeObjectUrl = dependencies.revokeObjectUrl ?? URL.revokeObjectURL
  const svgBlob = new Blob([svg], { type: SVG_MIME_TYPE })
  const svgUrl = createObjectUrl(svgBlob)

  try {
    const image = await loadSvgImage(svgUrl, dependencies)
    const width = image.naturalWidth || image.width || DEFAULT_WIDTH
    const height = image.naturalHeight || image.height || DEFAULT_HEIGHT
    const canvas = (dependencies.createCanvas ?? createDefaultCanvas)(width, height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is not available.')
    }

    context.drawImage(image, 0, 0, width, height)
    const pngBlob = await canvasToBlob(canvas)
    downloadBlob(pngBlob, filename, dependencies)
  } finally {
    revokeObjectUrl(svgUrl)
  }
}

function downloadBlob(blob: Blob, filename: string, dependencies: DownloadDependencies): void {
  const createObjectUrl = dependencies.createObjectUrl ?? URL.createObjectURL
  const revokeObjectUrl = dependencies.revokeObjectUrl ?? URL.revokeObjectURL
  const url = createObjectUrl(blob)

  try {
    if (dependencies.clickDownload) {
      dependencies.clickDownload(url, filename)
      return
    }

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  } finally {
    revokeObjectUrl(url)
  }
}

function loadSvgImage(url: string, dependencies: DownloadDependencies): Promise<HTMLImageElement> {
  if (dependencies.loadImage) {
    return dependencies.loadImage(url)
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('SVG image could not be loaded for PNG export.'))
    image.src = url
  })
}

function createDefaultCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG export failed because the canvas returned no image data.'))
        return
      }

      resolve(blob)
    }, PNG_MIME_TYPE)
  })
}
