'use client'

type MetricKind = 'api' | 'image'
type MetricOutcome = 'success' | 'failure'

function report(kind: MetricKind, name: string, durationMs: number, outcome: MetricOutcome) {
  if (typeof window === 'undefined' || !navigator.sendBeacon) return
  const duration = Number.isFinite(durationMs) ? Math.max(0, Math.min(120_000, Math.round(durationMs))) : 0
  // Keep healthy fast requests sampled, while retaining every failure and slow request.
  if (outcome === 'success' && duration < 900 && Math.random() > 0.03) return
  const body = new Blob([JSON.stringify({ kind, name, durationMs: duration, outcome })], { type: 'application/json' })
  navigator.sendBeacon('/api/telemetry/client-performance', body)
}

function safeApiName(input: RequestInfo | URL) {
  try {
    const raw = input instanceof Request ? input.url : String(input)
    const path = new URL(raw, window.location.origin).pathname
    return path
      .split('/')
      .map((segment) => /^[a-z0-9_-]{18,}$/i.test(segment) || /^\d{3,}$/.test(segment) ? ':id' : segment)
      .join('/')
      .slice(0, 80) || 'api'
  } catch {
    return 'api'
  }
}

export function reportApiPerformance(input: RequestInfo | URL, durationMs: number, outcome: MetricOutcome) {
  report('api', safeApiName(input), durationMs, outcome)
}

export function reportImagePerformance(name: string, src: string | null | undefined, outcome: MetricOutcome) {
  if (!src || src.startsWith('data:') || src.startsWith('blob:') || typeof performance === 'undefined') return
  const resource = performance.getEntriesByName(src, 'resource').at(-1)
  report('image', name, resource?.duration || 0, outcome)
}
