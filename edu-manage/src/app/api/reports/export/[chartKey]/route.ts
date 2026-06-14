import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import * as XLSX from 'xlsx'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

function parseRange(searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month'
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const now = new Date()
  if (fromStr && toStr) {
    return { from: new Date(fromStr), to: new Date(toStr) }
  }
  let from: Date, to: Date
  switch (period) {
    case 'week': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      from = new Date(now); from.setDate(from.getDate() - diff); from.setHours(0, 0, 0, 0)
      to = new Date(from.getTime() + 7 * 86400000)
      break
    }
    case 'quarter':
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      to = new Date(from.getFullYear(), from.getMonth() + 3, 1)
      break
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }
  return { from, to }
}

function sendXlsx(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
    },
  })
}

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ chartKey: string }> }
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { chartKey } = await params
  const { from, to } = parseRange(request.nextUrl.searchParams)
  const division = getRequestDivision(user, request.nextUrl.searchParams.get('division'))
  const studentWhere = { division }
  const feeWhere = { division }

  switch (chartKey) {
    case 'funnel': {
      const counts = await prisma.student.groupBy({ by: ['status'], _count: true, where: studentWhere })
      const statusMap: Record<string, string> = { LEAD: '潜客咨询', TRIAL: '预约试听', ACTIVE: '报名缴费', INACTIVE: '暂停', GRADUATED: '毕业/离校' }
      const rows = counts.map((c) => [statusMap[c.status] || c.status, c._count])
      const ws = XLSX.utils.aoa_to_sheet([['阶段', '人数'], ...rows])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '学员漏斗')
      return sendXlsx(wb, `学员入学漏斗-${new Date().toISOString().slice(0, 10)}`)
    }
    case 'paper-mastery': {
      const data = await prisma.paperQuestion.groupBy({ by: ['mastery'], _count: true, where: { paper: { paperDate: { gte: from, lt: to } } } })
      const labels: Record<string, string> = { MASTERED: '已掌握', NEEDS_REVIEW: '待复习', NEEDS_PRACTICE: '需练习' }
      const rows = data.map((d) => [labels[d.mastery] || d.mastery, d._count])
      const ws = XLSX.utils.aoa_to_sheet([['掌握程度', '题目数'], ...rows])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '试卷掌握')
      return sendXlsx(wb, `试卷掌握分布-${new Date().toISOString().slice(0, 10)}`)
    }
    case 'retention': {
      const rows = []
      for (let i = 5; i >= 0; i--) {
        const mFrom = new Date(from.getFullYear(), from.getMonth() - i, 1)
        const mTo = new Date(mFrom.getFullYear(), mFrom.getMonth() + 1, 1)
        const created = await prisma.student.count({ where: { createdAt: { gte: mFrom, lt: mTo }, ...studentWhere } })
        const active = await prisma.student.count({ where: { createdAt: { gte: mFrom, lt: mTo }, status: 'ACTIVE', ...studentWhere } })
        rows.push([mFrom.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' }), created > 0 ? Math.round((active / created) * 100) : 100])
      }
      const ws = XLSX.utils.aoa_to_sheet([['月份', '留存率(%)'], ...rows])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '留存率')
      return sendXlsx(wb, `月度留存率-${new Date().toISOString().slice(0, 10)}`)
    }
    case 'parent-engagement': {
      const [published, read, posts, reactions, students, comments, total, replied] = await Promise.all([
        prisma.examPaper.count({ where: { status: 'PUBLISHED', paperDate: { gte: from, lt: to } } }),
        prisma.examPaper.count({ where: { status: 'PUBLISHED', paperDate: { gte: from, lt: to }, isReadByParent: true } }),
        prisma.performancePost.count({ where: { createdAt: { gte: from, lt: to }, deletedAt: null } }),
        prisma.postReaction.count({ where: { post: { createdAt: { gte: from, lt: to }, deletedAt: null } } }),
        prisma.student.count({ where: studentWhere }),
        prisma.paperComment.count({ where: { createdAt: { gte: from, lt: to }, author: { role: 'parent' } } }),
        prisma.volunteerConsultation.count({ where: { createdAt: { gte: from, lt: to } } }),
        prisma.volunteerConsultation.count({ where: { createdAt: { gte: from, lt: to }, isReplied: true } }),
      ])
      const ws = XLSX.utils.aoa_to_sheet([
        ['指标', '百分比'],
        ['试卷已读率', published > 0 ? Math.round((read / published) * 100) : 0],
        ['动态互动率', posts > 0 ? Math.round((reactions / posts) * 100) : 0],
        ['留言率', students > 0 ? Math.round((comments / students) * 100) : 0],
        ['咨询回复率', total > 0 ? Math.round((replied / total) * 100) : 0],
      ])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '家长互动')
      return sendXlsx(wb, `家长互动数据-${new Date().toISOString().slice(0, 10)}`)
    }
    case 'finance': {
      const fees = await prisma.fee.findMany({
        where: { paidAt: { gte: from, lt: to }, status: 'paid', ...feeWhere },
        select: { amount: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      })
      const map = new Map<string, number>()
      for (const f of fees) {
        if (!f.paidAt) continue
        const k = f.paidAt.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' })
        map.set(k, (map.get(k) || 0) + f.amount)
      }
      const rows = [...map.entries()].map(([month, income]) => [month, Math.round(income)])
      const ws = XLSX.utils.aoa_to_sheet([['月份', '收入(元)'], ...rows])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '财务')
      return sendXlsx(wb, `财务收支分析-${new Date().toISOString().slice(0, 10)}`)
    }
    case 'attendance': {
      const [attData, mkData] = await Promise.all([
        prisma.attendance.groupBy({ by: ['status'], _count: true, where: { createdAt: { gte: from, lt: to } } }),
        prisma.makeupRequest.groupBy({ by: ['status'], _count: true, where: { createdAt: { gte: from, lt: to } } }),
      ])
      const find = (arr: { status: string; _count: number }[], s: string) => arr.find((a) => a.status === s)?._count ?? 0
      const attP = find(attData, 'PRESENT'); const attL = find(attData, 'LEAVE'); const attA = find(attData, 'ABSENT')
      const mkC = find(mkData, 'COMPLETED'); const mkAr = find(mkData, 'ARRANGED'); const mkP = find(mkData, 'PENDING')
      const ws = XLSX.utils.aoa_to_sheet([
        ['指标', '值'],
        ['出勤人数', attP], ['请假人数', attL], ['旷课人数', attA],
        ['出勤率(%)', attP + attL + attA > 0 ? Math.round((attP / (attP + attL + attA)) * 100) : 0],
        ['补课完成', mkC], ['补课已排', mkAr], ['补课待排', mkP],
        ['补课完成率(%)', mkC + mkAr + mkP > 0 ? Math.round((mkC / (mkC + mkAr + mkP)) * 100) : 0],
      ])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '考勤补课')
      return sendXlsx(wb, `考勤补课统计-${new Date().toISOString().slice(0, 10)}`)
    }
    case 'guide-usage': {
      const data = await prisma.guideViewLog.groupBy({ by: ['action'], _count: true, where: { createdAt: { gte: from, lt: to } } })
      const labels: Record<string, string> = { VIEW_GUIDE: '查看指南', VIEW_STEPS: '浏览步骤', DOWNLOAD: '下载文件', SEARCH_SCHOOL: '搜学校', VIEW_QUOTA: '查名额' }
      const rows = data.map((d) => [labels[d.action] || d.action, d._count])
      const ws = XLSX.utils.aoa_to_sheet([['操作', '次数'], ...rows])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '志愿填报使用')
      return sendXlsx(wb, `志愿填报使用-${new Date().toISOString().slice(0, 10)}`)
    }
    default:
      return NextResponse.json({ error: '未知图表类型' }, { status: 400 })
  }
})
