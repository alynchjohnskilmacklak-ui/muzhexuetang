import { NextResponse } from 'next/server'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function probeDb(db: typeof prisma) {
  const start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return { ok: true, latency: Date.now() - start }
  } catch {
    return { ok: false, latency: 0 }
  }
}

async function probeDivision(division: 'JUNIOR' | 'SENIOR') {
  try {
    return await probeDb(getPrismaForDivision(division))
  } catch {
    return { ok: false, latency: 0 }
  }
}

export async function GET() {
  const dual = isDualDbEnabled()

  if (dual) {
    const [junior, senior] = await Promise.all([
      probeDivision('JUNIOR'),
      probeDivision('SENIOR'),
    ])
    const healthy = junior.ok && senior.ok
    return NextResponse.json(
      {
        status: healthy ? 'healthy' : 'degraded',
        dual: true,
        databases: { junior, senior },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
      { status: healthy ? 200 : 503 },
    )
  }

  const db = await probeDb(prisma)

  return NextResponse.json(
    {
      status: db.ok ? 'healthy' : 'degraded',
      dual: false,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      db: db.ok ? 'connected' : 'disconnected',
      latency: db.latency,
      timestamp: new Date().toISOString(),
    },
    { status: db.ok ? 200 : 503 },
  )
}
