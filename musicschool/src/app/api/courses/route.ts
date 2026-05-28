import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const courses = await prisma.course.findMany({
    where: {
      isActive: true,
      classGroups: { some: visibleClassGroupWhere },
    },
    orderBy: { createdAt: 'desc' },
    include: { teacher: { select: { id: true, name: true } } },
  })
  return NextResponse.json(courses)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { name, subject, grade, type, level, lessonMinutes, totalLessons, pricePerLesson, color } = body

  if (!name || !subject) return NextResponse.json({ error: '课程名称和学科为必填项' }, { status: 400 })

  const course = await prisma.course.create({
    data: {
      name, subject, grade, type: type || 'GROUP', level,
      lessonMinutes: lessonMinutes || 90, totalLessons,
      pricePerLesson, color: color || '#E8784A',
    },
  })
  return NextResponse.json(course, { status: 201 })
}
