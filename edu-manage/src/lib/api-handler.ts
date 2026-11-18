import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { checkRateLimit } from './rate-limit'
import { getTrustedClientIp } from './request-ip'
import { ValidationError } from './api-validate'
import { AuthError } from './auth/guards'

/** 不同路径的请求体大小限制 */
function getBodyLimit(path: string): number {
  // 周末课讲义：业务层限制单文件 50MB、管理端单批文件总量 200MB。
  // multipart/form-data 还会包含边界和分配信息，因此在网关层预留少量协议开销。
  if (path.startsWith('/api/admin/materials/lesson-previews')) return 210 * 1024 * 1024
  if (path.startsWith('/api/teacher/materials/lesson-previews')) return 55 * 1024 * 1024
  if (path.startsWith('/api/materials/upload')) return 210 * 1024 * 1024 // 200MB + overhead
  if (path.startsWith('/api/upload'))           return 30 * 1024 * 1024  // 30MB
  if (path.startsWith('/api/exam-papers'))      return 10 * 1024 * 1024
  if (path.startsWith('/api/volunteer'))        return 10 * 1024 * 1024
  return 5 * 1024 * 1024  // 默认 5MB
}

const SENSITIVE_QUERY_PARAM = /(?:token|secret|password|passwd|authorization|auth|api[_-]?key|signature|credential|(?:^|[_-])code(?:$|[_-]))/i

function sanitizeSensitiveQueryText(value: string): string {
  return value.replace(/([?&])([^=&#\s]+)=([^&#\s]*)/g, (match, separator: string, key: string) => {
    let decodedKey = key
    try {
      decodedKey = decodeURIComponent(key.replace(/\+/g, ' '))
    } catch {
      // Keep the encoded key; the matcher still catches ordinary sensitive names.
    }
    return SENSITIVE_QUERY_PARAM.test(decodedKey) ? `${separator}${key}=[REDACTED]` : match
  })
}

/** Keep request paths useful in logs without persisting bearer credentials. */
export function sanitizeUrlForLog(value?: string | null): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''
    const sanitizedParams = new URLSearchParams()
    for (const [key, value] of url.searchParams) {
      sanitizedParams.append(key, SENSITIVE_QUERY_PARAM.test(key) ? '[REDACTED]' : value)
    }
    url.search = sanitizedParams.toString()
    // Fragments are not sent to the server and should not be copied into logs.
    url.hash = ''
    return url.toString()
  } catch {
    // Never fall back to the original value: it may contain a secret in a
    // malformed URL that would otherwise be copied into error telemetry.
    return '[invalid request URL]'
  }
}

function sanitizeErrorForLog(error: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (depth > 5) return '[error cause omitted]'
  if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
    if (seen.has(error)) return '[circular error]'
    seen.add(error)
  }
  if (error instanceof Error) {
    const safeError = new Error(sanitizeSensitiveQueryText(error.message))
    safeError.name = error.name
    if (error.stack) safeError.stack = sanitizeSensitiveQueryText(error.stack)
    if ('cause' in error && error.cause !== undefined) {
      Object.defineProperty(safeError, 'cause', {
        value: sanitizeErrorForLog(error.cause, seen, depth + 1),
        configurable: true,
      })
    }
    return safeError
  }
  if (typeof error === 'string') return sanitizeSensitiveQueryText(error)
  try {
    const serialized = JSON.stringify(error)
    return serialized === undefined ? '[unserializable error]' : JSON.parse(sanitizeSensitiveQueryText(serialized))
  } catch {
    return '[unserializable error]'
  }
}

/**
 * 包装 API 路由，统一捕获未处理的异常、限流、请求体大小检查。
 * 生产环境只返回通用错误信息，不暴露堆栈或数据库结构。
 */
export function apiHandler<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      const req = args[0] as NextRequest | undefined
      if (req?.url) {
        const ip = getTrustedClientIp(req.headers)
        const url = new URL(req.url)
        const path = url.pathname

        const { allowed, retryAfter } = await checkRateLimit(
          ip,
          path,
          undefined,
          // GET/HEAD 是管理员正常浏览（一次页面会并发多个请求 + SWR 重验证），放宽到 300 rpm；
          // POST/PUT/DELETE 是写操作，仍按 rate-limit.ts 里的严格规则限流。
          req.method === 'GET' || req.method === 'HEAD' ? 300 : undefined,
        )
        if (!allowed) {
          return NextResponse.json(
            { error: '请求过于频繁，请稍后重试' },
            { status: 429, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : {} }
          )
        }

        const limit = getBodyLimit(path)
        const contentLength = req.headers.get('content-length')
        if (contentLength && parseInt(contentLength) > limit) {
          const limitMB = Math.round(limit / 1024 / 1024)
          return NextResponse.json(
            { error: `文件过大，最大支持 ${limitMB}MB` },
            { status: 413 }
          )
        }
      }
      return await handler(...args)
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      if (err instanceof Error && (err.message === 'TEACHER_UNAUTHORIZED' || err.message === 'ADMIN_UNAUTHORIZED' || err.message === '无权限')) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      const requestUrl = sanitizeUrlForLog((args[0] as NextRequest)?.url)
      const safeError = sanitizeErrorForLog(err)
      Sentry.captureException(safeError, { extra: { url: requestUrl } })
      const isDev = process.env.NODE_ENV !== 'production'
      const message = isDev && err instanceof Error ? err.message : '服务器错误，请稍后重试'
      const req = args[0] as NextRequest | undefined
      console.error('[API Error]', sanitizeUrlForLog(req?.url), safeError)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
