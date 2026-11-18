'use client'
import { message } from 'antd'
import { fetchJson } from '@/lib/fetch-json'

/** Keep forms open and preserve input when an operation is rejected. */
export async function saveSettingsRequest(url: string, init: RequestInit) {
  try { await fetchJson(url, init); return true }
  catch (error) { message.error(error instanceof Error ? error.message : '操作失败，请重试'); return false }
}
