/**
 * Lightweight monitoring wrapper.
 * Set SENTRY_DSN in .env to activate Sentry error reporting.
 * Requires @sentry/nextjs to be installed: npm install @sentry/nextjs
 * Falls back to console.error when Sentry is unavailable or DSN is unset.
 */

let _sentry: { captureException: (err: unknown, ctx?: Record<string, unknown>) => void } | null = null

function getSentry() {
  if (_sentry !== null) return _sentry
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    _sentry = { captureException: () => {} }
    return _sentry
  }
  try {
    // Dynamic require so missing package doesn't break the build
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs') as typeof import('@sentry/nextjs')
    if (!Sentry.isInitialized?.()) {
      Sentry.init({ dsn, tracesSampleRate: 0.1 })
    }
    _sentry = { captureException: (err, ctx) => Sentry.captureException(err, ctx) }
  } catch {
    // Package not installed — degrade gracefully
    _sentry = { captureException: () => {} }
  }
  return _sentry
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  try {
    getSentry().captureException(err, context)
  } catch {
    // Never let monitoring break the application
  }
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    console.error('[monitoring]', err, context ?? '')
  }
}
