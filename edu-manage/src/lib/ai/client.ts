export class AIProviderError extends Error {
  status?: number
  provider?: string
  detail?: string

  constructor(message: string, options?: { status?: number; provider?: string; detail?: string }) {
    super(message)
    this.name = 'AIProviderError'
    this.status = options?.status
    this.provider = options?.provider
    this.detail = options?.detail
  }
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 45_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIProviderError('响应超时，请稍后重试或切换模型', { status: 408 })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function createSSEFromText(text: string) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        choices: [{ delta: { content: text } }],
      })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}
