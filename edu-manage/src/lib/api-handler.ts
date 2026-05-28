import { NextRequest, NextResponse } from 'next/server'

type Handler = (...args: any[]) => Promise<Response>

/**
 * 包装 API 路由，统一捕获未处理的异常。
 * 生产环境只返回通用错误信息，不暴露堆栈或数据库结构。
 */
export function apiHandler<T extends Handler>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (err) {
      const isDev = process.env.NODE_ENV !== 'production'
      const message = isDev && err instanceof Error ? err.message : '服务器错误，请稍后重试'
      const req = args[0] as NextRequest | undefined
      console.error('[API Error]', req?.url, err)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }) as T
}
