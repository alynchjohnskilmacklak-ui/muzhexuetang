'use client'

/**
 * useKickListener 已停用 SSE 长连接，防止在 Serverless / Vercel 下超时断连并触发高频重连占满通道。
 * 会话有效性与踢出逻辑统一由 useSessionPing() 的 60 秒轮询保障。
 */
export function useKickListener() {
  // no-op: SSE 已停用，会话踢出检测由 useSessionPing 负责
}

