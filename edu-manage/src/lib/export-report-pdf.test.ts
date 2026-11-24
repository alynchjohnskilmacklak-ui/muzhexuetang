import { describe, expect, it } from 'vitest'
import { getReportCaptureScale } from './export-report-pdf'

describe('A4 learning report capture resolution', () => {
  it('renders a narrow mobile report card at print-quality width', () => {
    const cssWidth = 436
    const scale = getReportCaptureScale(cssWidth, 1200)

    expect(cssWidth * scale).toBeCloseTo(1800)
  })

  it('caps oversized capture height to keep browser canvas memory bounded', () => {
    const cssHeight = 16_000
    const scale = getReportCaptureScale(360, cssHeight)

    expect(cssHeight * scale).toBeCloseTo(12_000)
  })
})
