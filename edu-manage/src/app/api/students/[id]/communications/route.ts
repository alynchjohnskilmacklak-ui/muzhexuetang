import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import {
  appendCommunicationLog,
  parseStudentCommunicationLogs,
  COMMUNICATION_TYPE_META,
  type CommunicationLogEntry,
  type CommunicationLogType,
} from '@/lib/student-communications'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'SUPER_ADMIN', 'teacher'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: studentId } = await params
  const prisma = await getRequestPrisma()

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, notes: true },
  })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  // 1. 获取手动登记的回访记录
  const { logs: manualLogs, plainNotes } = parseStudentCommunicationLogs(student.notes)

  // 2. 联动获取该学员在小程序端的家校互动留言
  const parentMessages = await prisma.parentMessage.findMany({
    where: { studentId },
    select: {
      id: true,
      title: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      teacher: { select: { name: true } },
      replies: {
        select: {
          id: true,
          authorName: true,
          role: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const messageLogs: CommunicationLogEntry[] = parentMessages.map((msg) => {
    const lastReply = msg.replies[0]
    const content = lastReply
      ? `【留言】${msg.title}（最新回复：${lastReply.authorName} - ${lastReply.content.slice(0, 60)}）`
      : `【留言】${msg.title}`
    return {
      id: `msg_${msg.id}`,
      type: 'OTHER',
      typeName: '家校留言',
      content,
      operatorName: msg.teacher?.name ? `${msg.teacher.name}老师` : '任课教师',
      createdAt: (msg.updatedAt || msg.createdAt).toISOString(),
      source: 'PARENT_MESSAGE',
    }
  })

  // 3. 聚合并按时间倒序排列
  const combinedTimeline = [...manualLogs, ...messageLogs].sort((a, b) => (
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ))

  return NextResponse.json({
    studentId,
    studentName: student.name,
    plainNotes,
    logs: combinedTimeline,
    totalLogs: combinedTimeline.length,
    manualCount: manualLogs.length,
  })
})

export const POST = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'SUPER_ADMIN', 'teacher'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: studentId } = await params
  const prisma = await getRequestPrisma()

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, notes: true },
  })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { type = 'PHONE', content, operatorName, nextFollowUpDate } = body

  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: '沟通内容不能为空' }, { status: 400 })
  }

  const validTypes: CommunicationLogType[] = ['PHONE', 'MEETING', 'WECHAT', 'RENEWAL', 'COMPLAINT', 'OTHER']
  const logType: CommunicationLogType = validTypes.includes(type) ? type : 'OTHER'
  const typeName = COMMUNICATION_TYPE_META[logType]?.label || '日常沟通'

  const author = (operatorName && String(operatorName).trim()) || user.name || '教研老师'

  const { newRawNotes, createdEntry } = appendCommunicationLog(student.notes, {
    type: logType,
    typeName,
    content: String(content).trim(),
    operatorName: author,
    nextFollowUpDate: nextFollowUpDate || null,
  })

  await prisma.student.update({
    where: { id: studentId },
    data: { notes: newRawNotes },
  })

  return NextResponse.json({
    success: true,
    created: createdEntry,
  }, { status: 201 })
})
