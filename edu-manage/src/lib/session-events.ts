/**
 * 会话踢出事件系统。
 * - 有 REDIS_URL → Redis Pub/Sub（多实例/重启可靠）
 * - 无 REDIS_URL → 内存 EventEmitter（本地开发/单实例）
 *
 * 环境变量:
 *   REDIS_URL              — Redis 连接字符串
 *   SESSION_EVENT_DRIVER   — "redis" | "memory" | "auto"（默认 auto）
 */

import { EventEmitter } from 'events'

// ---- 内存 EventEmitter (fallback) ----

const globalForEmitter = globalThis as unknown as {
  sessionEmitter: EventEmitter | undefined
}

export const sessionEmitter =
  globalForEmitter.sessionEmitter ?? new EventEmitter()

if (!globalForEmitter.sessionEmitter) {
  globalForEmitter.sessionEmitter = sessionEmitter
  sessionEmitter.setMaxListeners(500)
}

// ---- Redis Pub/Sub ----

let _pubClient: unknown = null
let _subClient: unknown = null
let _redisInitFailed = false

async function ensureRedis(): Promise<{ pub: unknown; sub: unknown } | null> {
  if (_pubClient && _subClient) return { pub: _pubClient, sub: _subClient }
  if (_redisInitFailed) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('redis') as { createClient: (opts: Record<string, unknown>) => { connect(): Promise<void>; duplicate(): { connect(): Promise<void>; subscribe(ch: string, fn: (msg: string, ch: string) => void): Promise<void> }; publish(ch: string, msg: string): Promise<void> } }
    const pub = createClient({ url: process.env.REDIS_URL })
    const sub = pub.duplicate()
    await Promise.all([pub.connect(), sub.connect()])
    _pubClient = pub
    _subClient = sub

    // 订阅 kick 频道，将 Redis 消息回灌到本地 EventEmitter
    await (sub as { subscribe(ch: string, listener: (msg: string, ch: string) => void): Promise<void> }).subscribe(
      'session:kick',
      (msg: string) => {
        try {
          const { userId, sessionMark } = JSON.parse(msg) as { userId: string; sessionMark: string }
          sessionEmitter.emit(`kick:${userId}`, sessionMark)
        } catch { /* ignore malformed messages */ }
      },
    )
    return { pub, sub }
  } catch {
    _redisInitFailed = true
    console.warn('[session-events] Redis 不可用，降级为内存 EventEmitter')
    return null
  }
}

// ---- public API ----

function resolveDriver(): 'redis' | 'memory' {
  const configured = process.env.SESSION_EVENT_DRIVER || 'auto'
  if (configured === 'redis') return 'redis'
  if (configured === 'memory') return 'memory'
  return process.env.REDIS_URL ? 'redis' : 'memory'
}

export async function emitKick(userId: string, sessionMark: string): Promise<void> {
  // 始终触发本地 EventEmitter（SSE 端点依赖它）
  sessionEmitter.emit(`kick:${userId}`, sessionMark)

  // 如果有 Redis，发布到频道让其他实例也收到
  if (resolveDriver() === 'redis') {
    const redis = await ensureRedis()
    if (redis) {
      try {
        const pub = redis.pub as { publish(ch: string, msg: string): Promise<void> }
        await pub.publish('session:kick', JSON.stringify({ userId, sessionMark }))
      } catch { /* Redis 发送失败不影响本地 */ }
    }
  }
}

/** 初始化 Redis Pub/Sub（应在上层 infrastructure 中调用一次） */
export async function initSessionEvents(): Promise<void> {
  if (resolveDriver() === 'redis') {
    await ensureRedis()
  }
}
