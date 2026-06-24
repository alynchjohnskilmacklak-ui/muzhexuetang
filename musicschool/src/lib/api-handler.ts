import { NextRequest, NextResponse } from 'next/server'

type Handler = (...args: any[]) => Promise<Response>

/**
 * 包装 API 路由，统一捕获未处理的异常。
 * musicschool 精简版：不限流，仅做错误归一化 + 生产环境脱敏。
 */
export function apiHandler<T extends Handler>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === 'TEACHER_UNAUTHORIZED' || err.message === 'ADMIN_UNAUTHORIZED' || err.message === '无权限')
      ) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
      if (err instanceof Error && err.message === 'ValidationError') {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      const isDev = process.env.NODE_ENV !== 'production'
      const message = isDev && err instanceof Error ? err.message : '服务器错误，请稍后重试'
      const req = args[0] as NextRequest | undefined
      console.error('[API Error]', req?.url, err)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }) as T
}
