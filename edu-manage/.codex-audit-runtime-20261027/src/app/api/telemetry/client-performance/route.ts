import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const allowedNames = /^(?:\/api\/[a-z0-9_./:-]{1,76}|signed-url-batch|parent-feedback-photo|practice-question)$/i

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user) return new NextResponse(null, { status: 204 })
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 2048) return new NextResponse(null, { status: 413 })
  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return new NextResponse(null, { status: 204 })
  const metric = body as Record<string, unknown>
  const kind = metric.kind
  const name = metric.name
  const durationMs = metric.durationMs
  const outcome = metric.outcome
  if ((kind !== 'api' && kind !== 'image')
    || typeof name !== 'string' || !allowedNames.test(name)
    || typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0 || durationMs > 120_000
    || (outcome !== 'success' && outcome !== 'failure')) {
    return new NextResponse(null, { status: 204 })
  }

  // Deliberately log only a route/category and timing; no URL query, user, image key,
  // request payload, or student data is collected. Docker logs can expose slow paths.
  console.info('[client-performance]', JSON.stringify({ kind, name, durationMs: Math.round(durationMs), outcome, at: new Date().toISOString() }))
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
})
