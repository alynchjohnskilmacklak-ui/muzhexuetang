import { reportApiPerformance } from '@/lib/client-performance'

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly payload: unknown = null) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>
    for (const key of ['error', 'message', 'detail']) {
      if (typeof body[key] === 'string' && body[key].trim()) return body[key].trim()
    }
  }
  if (status === 401) return '登录状态已失效，请重新登录后重试'
  if (status === 403) return '当前账号没有查看此内容的权限'
  return `请求失败（HTTP ${status}），请稍后重试`
}

/** A SWR-compatible JSON fetcher that never treats 401/500 payloads as data. */
export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const startedAt = performance.now()
  let response: Response
  try {
    response = await fetch(input, init)
  } catch {
    reportApiPerformance(input, performance.now() - startedAt, 'failure')
    throw new ApiRequestError('网络连接失败，请检查网络后重试', 0)
  }

  const payload = await response.json().catch(() => null) as unknown
  if (!response.ok) {
    reportApiPerformance(input, performance.now() - startedAt, 'failure')
    throw new ApiRequestError(errorMessage(payload, response.status), response.status, payload)
  }
  reportApiPerformance(input, performance.now() - startedAt, 'success')
  return payload as T
}
