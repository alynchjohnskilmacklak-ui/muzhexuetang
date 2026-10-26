import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { checkRateLimit } from './rate-limit'
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

/**
 * 包装 API 路由，统一捕获未处理的异常、限流、请求体大小检查。
 * 生产环境只返回通用错误信息，不暴露堆栈或数据库结构。
 */
export function apiHandler<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      const req = args[0] as NextRequest | undefined
      if (req?.url) {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || '0.0.0.0'
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
      Sentry.captureException(err, { extra: { url: (args[0] as NextRequest)?.url } })
      const isDev = process.env.NODE_ENV !== 'production'
      const message = isDev && err instanceof Error ? err.message : '服务器错误，请稍后重试'
      const req = args[0] as NextRequest | undefined
      console.error('[API Error]', req?.url, err)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
