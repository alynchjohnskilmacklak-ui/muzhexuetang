import { auth } from '@/lib/auth'
import { sessionEmitter } from '@/lib/session-events'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined

  if (!user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = user.id
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(': heartbeat\n\n')
        } catch {
          clearInterval(heartbeat)
        }
      }, 30_000)

      const onKick = () => {
        try {
          controller.enqueue('data: kick\n\n')
        } catch {
          // 连接已关闭
        }
      }

      sessionEmitter.on(`kick:${userId}`, onKick)

      cleanup = () => {
        clearInterval(heartbeat)
        sessionEmitter.off(`kick:${userId}`, onKick)
      }
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
