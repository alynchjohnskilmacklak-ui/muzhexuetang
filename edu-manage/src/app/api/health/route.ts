import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  let dbOk = false

  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }

  return NextResponse.json(
    {
      status: dbOk ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      db: dbOk ? 'connected' : 'disconnected',
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  )
}
