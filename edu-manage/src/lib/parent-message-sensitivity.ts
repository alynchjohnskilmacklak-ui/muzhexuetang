/**
 * 家校沟通敏感词检测与置顶预警服务
 * 识别退费、换老师、跟不上、投诉等高危家校情绪，保障教研主管第一时间介入
 */

export const SENSITIVE_KEYWORDS = [
  '退费', '退钱', '退款',
  '换老师', '换个老师', '换教师',
  '听不懂', '跟不上', '学不会',
  '投诉', '态度差', '没效果', '不想学了', '耽误'
] as const

export function detectSensitiveKeywords(text?: string | null): string[] {
  if (!text) return []
  const matches: string[] = []
  for (const kw of SENSITIVE_KEYWORDS) {
    if (text.includes(kw) && !matches.includes(kw)) {
      matches.push(kw)
    }
  }
  return matches
}

export function getMessageSensitivity(msg: {
  title?: string | null
  replies?: Array<{ role: string; content?: string | null }>
}): { isSensitive: boolean; matchedKeywords: string[] } {
  const texts: string[] = []
  if (msg.title) texts.push(msg.title)
  if (Array.isArray(msg.replies)) {
    for (const r of msg.replies) {
      if (r.role === 'parent' && r.content) {
        texts.push(r.content)
      }
    }
  }
  const matched = detectSensitiveKeywords(texts.join(' '))
  return {
    isSensitive: matched.length > 0,
    matchedKeywords: matched,
  }
}

export function sortMessagesWithSensitivity<T extends {
  title?: string | null
  updatedAt: string
  replies?: Array<{ role: string; content?: string | null }>
}>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    const aSens = getMessageSensitivity(a).isSensitive
    const bSens = getMessageSensitivity(b).isSensitive
    if (aSens !== bSens) return aSens ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

/** 教研主管常用协同代答快捷模版 */
export const SUPERVISOR_REPLY_TEMPLATES = [
  {
    label: '【教研主管协同】关注教学进度与难点',
    text: '家长您好，我是学堂教研主管。您反馈的孩子上课情况我们非常重视，教研组正在与任课教师沟通，将根据孩子的实际吸收情况放慢节奏、针对薄弱点进行专门答疑辅导。稍后老师也会与您电话沟通细则。',
  },
  {
    label: '【家校协同】安抚焦虑与沟通约谈',
    text: '家长您好，我是负责教学教研的主管老师。孩子近期学习状态的起伏我们一直密切关注，请您先不要着急。今天课后我们会安排针对性的单独辅导，并于晚些时候向您详细沟通后续辅导方案。',
  },
  {
    label: '【师资协调】教学风格与课次跟进',
    text: '家长您好，学堂教研主管已记录您关于授课风格的反馈。我们已与任课老师深度复盘并调整了授课互动方式，接下来本周课次教研主管也会全程随堂督导，确保孩子的听课质量。',
  },
]

/** 教师常用专业安抚快捷模板 */
export const TEACHER_REPLY_GUIDANCE = [
  {
    label: '【教学安抚】针对薄弱点重点答疑',
    text: '家长您好，请您先别担心。孩子这几节课遇到的难点老师已经详细记录下来了，今天课后我会专门为孩子梳理易错点，并准备针对性的巩固辅导，确保孩子彻底掌握。',
  },
  {
    label: '【节奏调整】多关注互动与解题步骤',
    text: '家长您好，收到您的反馈！接下来的课堂上我会特别关注孩子的听课状态，放慢核心公式与步骤的推导速度，多给孩子设计互动答题机会，确保当堂内容当堂消化。',
  },
  {
    label: '【家校协同】下课后电话详谈提升方案',
    text: '家长您好，孩子的学情我们高度重视。下课后我会通过电话向您详细分析孩子目前的学习症结与接下来的提升方案，请您放心，我们一起帮孩子克服难关！',
  },
]
