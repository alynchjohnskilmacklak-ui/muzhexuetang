'use client'

import useSWR from 'swr'
import { normalizeSchedulePeriods, SCHEDULE_PERIODS } from '@/lib/schedule-periods'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('时间段加载失败')
  return response.json()
}

export function useSchedulePeriods(division?: string) {
  const url = division ? `/api/settings/schedule-periods?division=${encodeURIComponent(division)}` : '/api/settings/schedule-periods'
  const result = useSWR<{ periods?: unknown }>(url, fetcher)
  return {
    ...result,
    periods: result.data ? normalizeSchedulePeriods(result.data.periods) : SCHEDULE_PERIODS,
  }
}
