import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { checkRateLimit } from './rate-limit'
import { ValidationError } from './api-validate'

type Handler = (...args: any[]) => Promise<Response>

/** 不同路径的请求体大小限制 */
function getBodyLimit(path: string): number {
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
export function apiHandler<T extends Handler>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      const req = args[0] as NextRequest | undefined
      if (req?.url) {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || '0.0.0.0'
        const url = new URL(req.url)
        const path = url.pathname

        const { allowed, retryAfter } = await checkRateLimit(ip, path)
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
  }) as T
}
