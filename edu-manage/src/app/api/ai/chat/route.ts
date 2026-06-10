import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { AI_PROMPTS, SCIENCE_ANSWER_RULES, type AIRole, type ModelId } from '@/data/ai-prompts'
import { AIProviderError, createSSEFromText, fetchWithTimeout } from '@/lib/ai/client'
import { getModelCapability } from '@/lib/ai/models'
import { normalizeAIAnswer } from '@/lib/ai/normalize-answer'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type MessageContent = string | Array<{ type: string; [key: string]: unknown }>

type AIMessage = {
  role: 'user' | 'assistant'
  content: MessageContent
}

type RateLimitBucket = {
  minuteStart: number
  minuteCount: number
  dayKey: string
  dayCount: number
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()

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

const MUZHE_ABOUT_ANSWERS: Array<{ patterns: string[]; answer: string }> = [
  {
    patterns: ['牧哲学堂是什么样的机构', '简单介绍一下', '牧哲学堂是什么'],
    answer: `牧哲学堂成立于 2016 年，是一家专注于中小学课外辅导的教育机构。机构始终坚持“以学生为中心，以教学质量为根本，以服务家长为保障”的理念，致力于帮助学生查漏补缺、建立学习信心、提升学习效率。

牧哲学堂在石家庄、邢台、唐山、邯郸、张家口等地陆续开展校区服务，目前已在河北多地形成较好的家长口碑。机构注重教学质量、课堂管理和家校沟通，不仅关注学生的学习成绩，也关注学生的学习习惯、课堂状态和心理成长。

牧哲学堂强调“没有学不会的学生，只有不会教的老师”。我们反对只关注基础好、成绩好的学生，更重视每一位学生的实际情况，通过小班化教学、课堂反馈、课后跟进和个性化辅导，帮助学生在寒暑假集中学习阶段获得更有效的提升。`,
  },
  {
    patterns: ['校区都在哪里', '怎么联系', '校区在哪里'],
    answer: `牧哲学堂新乐校区位于新乐市区，方便新乐本地学生就近学习。具体地址、上课安排和报名事项可以咨询校区管理员。

联系电话：15930114500
微信同号：15930114500

如果家长想了解课程、费用、班级名额、老师安排、上课时间，可以直接联系管理员咨询。管理员会结合孩子年级、学习基础和当前班级安排，给出更准确的说明。`,
  },
  {
    patterns: ['有什么课程', '怎么收费', '课程收费'],
    answer: `牧哲学堂寒暑假课程主要面向初中学生，课程安排会围绕不同年级的学习重点设置。

初一主要开设语文、数学、英语、生物；初二主要开设语文、数学、英语、物理；初三主要开设数学、物理、化学、英语。暑假课程周期为 26 天，寒假课程周期为 16 天。每天学习时间约 6 个小时，采用集中学习、系统复习、查漏补缺、专项训练相结合的方式。

收费方面，牧哲学堂坚持价格透明，无二次收费。我们会提前向家长说明课程费用、上课周期、教材资料和服务内容。所有教材和资料均围绕中考大纲与学生实际学习需求设计，重点讲解考试常考、必考、易错知识点，不做无效堆砌。

具体费用以校区管理员公布为准，可咨询 15930114500。`,
  },
  {
    patterns: ['老师怎么样', '资质如何', '教师资质'],
    answer: `牧哲学堂高度重视教师队伍建设，老师主要来自 211、985 高校硕士背景，具备较强的学科基础和教学能力。教师信息可以在系统的“教师信息”模块中查看，包括教师姓名、学历背景、毕业院校、任教学科等内容。

教师学历信息支持家长通过学信网进行查询核验。牧哲学堂希望通过公开透明的教师信息，让家长更放心，也让教学服务更规范。

同时，牧哲学堂不只看老师学历，更重视老师是否真正会教、是否有责任心、是否能关注学生课堂状态。机构会通过课堂反馈、管理员巡课、家长沟通等方式持续关注教学质量。`,
  },
  {
    patterns: ['和家长怎么沟通', '实时了解孩子情况', '家校沟通'],
    answer: `牧哲学堂有自己独立开发的管理系统，家长可以通过家长端查看孩子的课程安排、考勤情况、课堂反馈、教师信息、通知提醒等内容。

家长可以重点了解孩子今天是否到课、今日课程安排、任课老师信息、老师发布的课堂反馈、剩余课时情况，以及校区通知与提醒。

寒暑假课程时间集中，家长最关心的是孩子每天是否安全到校、是否认真上课、课堂状态如何、老师是否关注。牧哲学堂通过系统化管理，尽量让家长少焦虑、少反复询问，也能及时了解孩子学习状态。`,
  },
  {
    patterns: ['和普通补习班有什么不同', '普通补习班', '有什么不同'],
    answer: `牧哲学堂与普通补习班最大的不同，是我们不只依靠人工记录和口头沟通，而是建立了自己的独立管理系统，让教学服务更加透明、规范、可追踪。

第一，系统覆盖排课、考勤、课堂反馈、教师信息、家长通知、课时管理等环节，家长能更及时地了解孩子学习状态。

第二，牧哲学堂采用小班化教学。每个班级约 10 位学生，并配备至少 3 名老师参与教学与辅导，同时会有管理员不定时查岗，关注教师上课状态、课堂秩序和学生学习情况。

第三，教材紧贴中考大纲，只讲中考常考、必考、易错知识点，减少无效内容，把寒暑假有限时间用在真正重要的地方。

第四，牧哲学堂坚持价格透明，力求做到新乐范围内高性价比收费，不设置二次收费，不让家长在报名后反复承担额外费用。

第五，牧哲学堂志愿填报系统主要针对新乐市学生，结合本地升学实际需求，为学生和家长提供更贴近本地情况的参考服务。`,
  },
]

function findMuzheAboutAnswer(messages: AIMessage[]) {
  const lastUserText = [...messages].reverse().find((message) => message.role === 'user')
  const text = lastUserText ? contentToText(lastUserText.content) : ''
  return MUZHE_ABOUT_ANSWERS.find((item) => item.patterns.some((pattern) => text.includes(pattern)))?.answer
}

function resolveAIRole(userRole?: string | null): AIRole {
  if (userRole === 'parent') return 'parent'
  if (userRole === 'teacher') return 'teacher'
  return 'admin'
}

function validModelId(modelId: unknown): modelId is ModelId {
  return modelId === 'deepseek' || modelId === 'mimo' || modelId === 'kimi'
}

function currentDayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getRateLimitConfig() {
  return {
    perMinute: Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 10),
    perDay: Number(process.env.AI_RATE_LIMIT_PER_DAY || 100),
  }
}

function checkRateLimit(key: string) {
  const now = Date.now()
  const dayKey = currentDayKey()
  const config = getRateLimitConfig()
  const existing = rateLimitBuckets.get(key)

  const bucket: RateLimitBucket = existing && existing.dayKey === dayKey
    ? {
        minuteStart: now - existing.minuteStart < 60_000 ? existing.minuteStart : now,
        minuteCount: now - existing.minuteStart < 60_000 ? existing.minuteCount : 0,
        dayKey,
        dayCount: existing.dayCount,
      }
    : { minuteStart: now, minuteCount: 0, dayKey, dayCount: 0 }

  if (bucket.minuteCount >= config.perMinute || bucket.dayCount >= config.perDay) {
    rateLimitBuckets.set(key, bucket)
    return false
  }

  bucket.minuteCount += 1
  bucket.dayCount += 1
  rateLimitBuckets.set(key, bucket)

  if (rateLimitBuckets.size > 2000) {
    for (const [bucketKey, value] of rateLimitBuckets.entries()) {
      if (value.dayKey !== dayKey) rateLimitBuckets.delete(bucketKey)
    }
  }

  return true
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

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionUser = session.user as { id?: string | null; email?: string | null; role?: string | null }
  const rateLimitKey = sessionUser.id || sessionUser.email
  if (!rateLimitKey || !checkRateLimit(rateLimitKey)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
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

  const localAboutAnswer = resolveAIRole(sessionUser.role) === 'parent'
    ? findMuzheAboutAnswer(safeMessages)
    : null
  if (localAboutAnswer) {
    return new NextResponse(createSSEFromText(localAboutAnswer), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  }

  const systemPrompt = `${AI_PROMPTS[resolveAIRole(sessionUser.role)]}\n\n${SCIENCE_ANSWER_RULES}`
  const endpoint = MODEL_ENDPOINTS[modelId]

  if (!endpoint?.apiKey || endpoint.apiKey.includes('你的') || endpoint.apiKey.includes('填入')) {
    return NextResponse.json({ error: `${modelId} API Key 未配置，请管理员检查配置` }, { status: 500 })
  }

  const model = (modelId === 'kimi' && hasImage && endpoint.visionModel)
    ? endpoint.visionModel
    : endpoint.model
  const streamEnabled = process.env.AI_STREAM_ENABLED !== 'false' && capability.supportsStream
  const temperature = looksLikeScienceQuestion(safeMessages) ? 0.1 : 0.6

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
        max_tokens: 4096,
        top_p: 0.9,
        frequency_penalty: 0.1,
      }),
    }, Number(process.env.AI_TIMEOUT_MS || 60_000))

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
})
