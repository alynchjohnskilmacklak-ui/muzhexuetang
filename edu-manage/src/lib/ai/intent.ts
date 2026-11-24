/**
 * 小牧助手 · 意图识别（规则版）
 * 不依赖外部 LLM：将用户输入与角色常用页面做关键词匹配，
 * 命中后返回「意图操作卡」数据（导航/查询类），由前端渲染为确认卡片。
 * 操作类意图（发送通知/群发等）预留 type: 'action'，后续扩展。
 */

export type IntentRole = 'admin' | 'teacher' | 'parent'

export interface IntentCardData {
  type: 'navigate' | 'query'
  /** 卡片主标题，如「查看课堂反馈」 */
  title: string
  /** 卡片说明，如「跳转到课堂反馈，查看老师的最新动态」 */
  desc: string
  /** 目标页面 */
  href: string
}

interface IntentRule {
  keys: string[]
  title: string
  desc: string
  href: string
}

/** 按角色区分常用页面；keys 命中任一即匹配（按数组顺序优先，反馈>沟通>缴费>练习>课表>通知） */
const INTENT_RULES: Record<IntentRole, IntentRule[]> = {
  parent: [
    { keys: ['课堂反馈', '反馈', '课堂表现', '学习情况'], title: '查看课堂反馈', desc: '跳转到课堂反馈，查看老师的最新课堂动态', href: '/parent/class-feedback' },
    { keys: ['家校沟通', '留言', '消息', '私信', '联系老师', '找老师'], title: '查看家校沟通', desc: '跳转到家校沟通，查看老师留言与回复', href: '/parent/messages' },
    { keys: ['缴费', '费用', '课时余额', '余额', '欠费'], title: '查看缴费明细', desc: '跳转到缴费明细，查看课时与费用记录', href: '/parent/fees' },
    { keys: ['每日练习', '练习', '刷题', '做题', '作业'], title: '查看每日练习', desc: '跳转到每日练习，开始今天的专项训练', href: '/parent/practice' },
    { keys: ['课程表', '课表', '上课安排', '课程安排', '几点上课'], title: '查看课程表', desc: '跳转到课程表，查看孩子的上课安排', href: '/parent/schedule' },
    { keys: ['通知', '公告', '消息中心'], title: '查看通知中心', desc: '跳转到通知中心，查看全部消息与公告', href: '/parent/notifications' },
  ],
  teacher: [
    { keys: ['今日课程', '今天课程', '上课安排', '课表'], title: '查看今日课程', desc: '跳转到今日课程，查看今天的上课安排', href: '/teacher/today-lessons' },
    { keys: ['考勤', '打卡', '出勤'], title: '提交考勤', desc: '跳转到考勤打卡，补交或核对今日考勤', href: '/teacher/attendance' },
    { keys: ['反馈', '课堂反馈'], title: '查看我的反馈', desc: '跳转到我的反馈，查看已发布与待发布的课堂反馈', href: '/teacher/feedback' },
    { keys: ['家校消息', '留言', '消息', '家长留言'], title: '查看家校消息', desc: '跳转到家校消息，回复家长的留言', href: '/teacher/messages' },
    { keys: ['课时工资', '工资', '薪资', '课时费'], title: '查看课时工资', desc: '跳转到课时工资，查看课时与薪资明细', href: '/teacher/compensation' },
  ],
  admin: [
    { keys: ['学员', '学生'], title: '查看学员管理', desc: '跳转到学员管理，查看学员台账与选课', href: '/students' },
    { keys: ['教师', '老师管理'], title: '查看教师管理', desc: '跳转到教师管理，查看教师档案与授课', href: '/teachers' },
    { keys: ['考勤', '出勤'], title: '审核考勤', desc: '跳转到考勤审核，核对今日课次考勤', href: '/attendance' },
    { keys: ['课堂反馈', '反馈'], title: '查看课堂反馈', desc: '跳转到课堂反馈，审核已发布的反馈内容', href: '/classroom-feedback' },
    { keys: ['缴费', '费用'], title: '查看缴费管理', desc: '跳转到缴费管理，查看缴费记录', href: '/fees' },
    { keys: ['通知', '公告'], title: '查看通知中心', desc: '跳转到通知中心，查看全部消息与公告', href: '/notifications' },
  ],
}

/** 解析用户输入，命中返回意图卡数据；未命中返回 null（走正常 AI 对话） */
export function parseIntent(text: string, role: IntentRole): IntentCardData | null {
  const rules = INTENT_RULES[role] ?? INTENT_RULES.parent
  const normalized = text.replace(/\s+/g, '')
  if (!normalized) return null
  for (const rule of rules) {
    if (rule.keys.some((key) => normalized.includes(key))) {
      return { type: 'navigate', title: rule.title, desc: rule.desc, href: rule.href }
    }
  }
  return null
}
