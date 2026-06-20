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

export async function callKimi(params: {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const baseUrl = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1'
  const apiKey = process.env.KIMI_API_KEY || ''
  const model = process.env.KIMI_MODEL || 'moonshot-v1-8k'

  if (!apiKey || apiKey.includes('你的') || apiKey.includes('填入')) {
    throw new AIProviderError('Kimi API Key 未配置，请管理员检查 KIMI_API_KEY', { status: 500, provider: 'kimi' })
  }

  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
        temperature: params.temperature ?? 0.6,
        max_tokens: params.maxTokens ?? 300,
        top_p: 0.9,
      }),
    },
    Number(process.env.AI_TIMEOUT_MS || 45_000),
  )

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[Kimi Error ${response.status}]`, errText.slice(0, 300))
    if (response.status === 401 || response.status === 403) {
      throw new AIProviderError('Kimi 密钥无效或权限不足', { status: 502, provider: 'kimi' })
    }
    if (response.status === 429) {
      throw new AIProviderError('Kimi 调用过于频繁或额度不足，请稍后重试', { status: 429, provider: 'kimi' })
    }
    throw new AIProviderError(
      `Kimi 调用失败：${errText.slice(0, 160) || '请求异常'}`,
      { status: response.status >= 500 ? 502 : 500, provider: 'kimi', detail: errText },
    )
  }

  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return result.choices?.[0]?.message?.content || ''
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
