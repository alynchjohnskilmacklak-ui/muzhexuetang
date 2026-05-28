import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AI_PROMPTS, SCIENCE_ANSWER_RULES, type AIRole, type ModelId } from '@/data/ai-prompts'
import { AIProviderError, createSSEFromText, fetchWithTimeout } from '@/lib/ai/client'
import { getModelCapability } from '@/lib/ai/models'
import { normalizeAIAnswer } from '@/lib/ai/normalize-answer'

export const dynamic = 'force-dynamic'

type MessageContent = string | Array<{ type: string; [key: string]: unknown }>

type AIMessage = {
  role: 'user' | 'assistant'
  content: MessageContent
}

const MODEL_ENDPOINTS: Record<ModelId, {
  baseUrl: string
  apiKey: string
  model: string
  visionModel?: string
}> = {
  deepseek: {
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  mimo: {
    baseUrl: process.env.MIMO_BASE_URL || 'https://api.mimo.ai/v1',
    apiKey: process.env.MIMO_API_KEY || '',
    model: process.env.MIMO_MODEL || 'MiMo-VL-7B-RL',
  },
  kimi: {
    baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
    apiKey: process.env.KIMI_API_KEY || '',
    model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
    visionModel: process.env.KIMI_VISION_MODEL || 'moonshot-v1-vision-preview',
  },
}

function resolveAIRole(userRole?: string | null): AIRole {
  if (userRole === 'parent') return 'parent'
  if (userRole === 'teacher') return 'teacher'
  return 'admin'
}

function validModelId(modelId: unknown): modelId is ModelId {
  return modelId === 'deepseek' || modelId === 'mimo' || modelId === 'kimi'
}

function contentToText(content: MessageContent): string {
  if (typeof content === 'string') return content
  return content
    .filter((item) => item.type === 'text')
    .map((item) => typeof item.text === 'string' ? item.text : '')
    .join('\n')
}

function looksLikeScienceQuestion(messages: AIMessage[]) {
  const text = messages.map((message) => contentToText(message.content)).join('\n')
  return /数学|物理|化学|方程|欧姆|电路|电压|电流|电阻|密度|力|功率|反应|化学方程式|函数|几何|证明|计算/.test(text)
}

function mapProviderError(modelId: ModelId, responseStatus: number, detail: string) {
  if (responseStatus === 401 || responseStatus === 403) {
    return {
      error: `${modelId} 密钥无效或权限不足，请管理员检查 API Key`,
      status: 502,
    }
  }

  if (responseStatus === 429) {
    return {
      error: `${modelId} 调用过于频繁或额度不足，请稍后重试或切换模型`,
      status: 429,
    }
  }

  if (responseStatus >= 500) {
    return {
      error: `${modelId} 服务暂时不可用，请稍后重试或切换模型`,
      status: 502,
    }
  }

  return {
    error: `${modelId} 调用失败：${detail.slice(0, 160) || '请求参数或模型配置异常'}`,
    status: 502,
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    messages: AIMessage[]
    role?: AIRole
    modelId?: ModelId
    hasImage?: boolean
  }

  const { messages, modelId = 'deepseek', hasImage = false } = body

  if (!validModelId(modelId)) {
    return NextResponse.json({ error: '模型不存在' }, { status: 400 })
  }

  const capability = getModelCapability(modelId)
  if (hasImage && !capability.supportsVision) {
    return NextResponse.json({ error: '当前模型不支持图片识别，请切换 Kimi 视觉模型' }, { status: 400 })
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
  }

  const safeMessages = messages
    .filter((message) => (
      (message.role === 'user' || message.role === 'assistant') &&
      (typeof message.content === 'string' || Array.isArray(message.content))
    ))
    .slice(-20)

  if (safeMessages.length === 0) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
  }

  const user = session.user as { role?: string | null }
  const systemPrompt = `${AI_PROMPTS[resolveAIRole(user.role)]}\n\n${SCIENCE_ANSWER_RULES}`
  const endpoint = MODEL_ENDPOINTS[modelId]

  if (!endpoint?.apiKey || endpoint.apiKey.includes('你的') || endpoint.apiKey.includes('填入')) {
    return NextResponse.json({ error: `${modelId} API Key 未配置，请管理员检查配置` }, { status: 500 })
  }

  const model = (modelId === 'kimi' && hasImage && endpoint.visionModel)
    ? endpoint.visionModel
    : endpoint.model
  const streamEnabled = process.env.AI_STREAM_ENABLED !== 'false' && capability.supportsStream
  const temperature = looksLikeScienceQuestion(safeMessages) ? 0.25 : 0.6

  try {
    const response = await fetchWithTimeout(`${endpoint.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeMessages,
        ],
        stream: streamEnabled,
        temperature,
        max_tokens: 3000,
      }),
    }, Number(process.env.AI_TIMEOUT_MS || 45_000))

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[AI ${modelId} Error ${response.status}]`, errText)
      const mapped = mapProviderError(modelId, response.status, errText)
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    if (!streamEnabled) {
      const result = await response.json()
      const text = normalizeAIAnswer(
        result.choices?.[0]?.message?.content
        || result.choices?.[0]?.delta?.content
        || '',
      )
      return new NextResponse(createSSEFromText(text || '（模型未返回内容，请重试）'), {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error(`[AI ${modelId}]`, error)
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: `${modelId} ${error.message}` }, { status: error.status || 500 })
    }
    return NextResponse.json({ error: `${modelId} 网络错误，请检查服务器连接或稍后重试` }, { status: 500 })
  }
}
