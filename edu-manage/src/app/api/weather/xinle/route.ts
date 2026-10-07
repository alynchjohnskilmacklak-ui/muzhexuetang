import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { getXinleForecast } from '@/lib/weather/amap'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  await requireAuthenticatedUser()
  const forecast = await getXinleForecast()
  return NextResponse.json(forecast ?? { available: false }, {
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  })
})
