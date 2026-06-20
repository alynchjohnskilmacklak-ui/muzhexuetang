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
        temperature: params.temperature ?? 1,
        max_tokens: params.maxTokens ?? 300,
        top_p: 0.95,
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

export async function callDeepSeek(params: {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
}): Promise<string> {
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const apiKey = process.env.DEEPSEEK_API_KEY || ''
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey || apiKey.includes('你的') || apiKey.includes('填入')) {
    throw new AIProviderError('DeepSeek API Key 未配置，请管理员检查 DEEPSEEK_API_KEY', { status: 500, provider: 'deepseek' })
  }

  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 500,
        ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    },
    Number(process.env.AI_TIMEOUT_MS || 45_000),
  )

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[DeepSeek Error ${response.status}]`, errText.slice(0, 300))
    if (response.status === 401 || response.status === 403) {
      throw new AIProviderError('DeepSeek 密钥无效或权限不足', { status: 502, provider: 'deepseek' })
    }
    if (response.status === 429) {
      throw new AIProviderError('DeepSeek 调用过于频繁或额度不足，请稍后重试', { status: 429, provider: 'deepseek' })
    }
    throw new AIProviderError(
      `DeepSeek 调用失败：${errText.slice(0, 160) || '请求异常'}`,
      { status: response.status >= 500 ? 502 : 500, provider: 'deepseek', detail: errText },
    )
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
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
