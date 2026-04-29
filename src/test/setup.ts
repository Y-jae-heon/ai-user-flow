import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

type SvgMeasurementPrototype = SVGElement & {
  getBBox?: () => DOMRect
  getComputedTextLength?: () => number
}

const svgPrototype = SVGElement.prototype as SvgMeasurementPrototype

if (!svgPrototype.getBBox) {
  svgPrototype.getBBox = () => ({
    x: 0,
    y: 0,
    width: 160,
    height: 32,
    top: 0,
    right: 160,
    bottom: 32,
    left: 0,
    toJSON: () => ({})
  } as DOMRect)
}

if (!svgPrototype.getComputedTextLength) {
  svgPrototype.getComputedTextLength = () => 160
}

afterEach(() => {
  cleanup()
})
