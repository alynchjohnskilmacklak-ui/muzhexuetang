import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'
import { isSummerTeachingDate, SUMMER_MEAL_PERIOD } from '@/lib/meal-attendance-period'

export const dynamic = 'force-dynamic'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function asDatabaseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可以查看学生就餐台账' }, { status: 403 })
  }

  const db = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') || SUMMER_MEAL_PERIOD.startDate
  const endDate = searchParams.get('endDate') || SUMMER_MEAL_PERIOD.endDate
  const studentId = searchParams.get('studentId') || ''
  const q = (searchParams.get('q') || '').trim()
  const division = session.user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: '日期范围不正确' }, { status: 400 })
  }

  const students = await db.student.findMany({
    where: {
      division,
      status: { not: 'ARCHIVED' },
      ...(q ? {
        OR: [
          { name: { contains: q } },
          { parentName: { contains: q } },
          { parentPhone: { contains: q } },
        ],
      } : {}),
    },
    select: { id: true, name: true, grade: true, school: true, status: true },
    orderBy: [{ grade: 'desc' }, { name: 'asc' }],
    take: 300,
  })

  const selectedStudent = studentId
    ? students.find((student) => student.id === studentId)
      || await db.student.findFirst({
        where: { id: studentId, division, status: { not: 'ARCHIVED' } },
        select: { id: true, name: true, grade: true, school: true, status: true },
      })
    : null

  if (studentId && !selectedStudent) {
    return NextResponse.json({ error: '学生不存在或不属于当前学部' }, { status: 404 })
  }

  const records = selectedStudent
    ? await db.studentMealAttendance.findMany({
      where: {
        studentId: selectedStudent.id,
        mealDate: {
          gte: asDatabaseDate(startDate),
          lte: asDatabaseDate(endDate),
        },
      },
      select: { id: true, mealDate: true, notes: true, updatedAt: true },
      orderBy: { mealDate: 'asc' },
    })
    : []

  return NextResponse.json({
    period: { startDate, endDate },
    students,
    student: selectedStudent,
    records: records.map((record) => ({
      ...record,
      mealDate: record.mealDate.toISOString().slice(0, 10),
    })),
  })
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可以登记学生就餐' }, { status: 403 })
  }

  const db = await getRequestPrisma()
  const body = await req.json()
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const mealDate = typeof body.mealDate === 'string' ? body.mealDate : ''
  const eating = body.eating === true
  const division = session.user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'

  if (!studentId || !DATE_PATTERN.test(mealDate)) {
    return NextResponse.json({ error: '学生或就餐日期不正确' }, { status: 400 })
  }
  if (
    mealDate < SUMMER_MEAL_PERIOD.startDate
    || mealDate > SUMMER_MEAL_PERIOD.endDate
    || !isSummerTeachingDate(mealDate)
  ) {
    return NextResponse.json({ error: '休息日或课程周期外不能登记就餐' }, { status: 400 })
  }

  const student = await db.student.findFirst({
    where: { id: studentId, division, status: { not: 'ARCHIVED' } },
    select: { id: true, name: true },
  })
  if (!student) return NextResponse.json({ error: '学生不存在或不属于当前学部' }, { status: 404 })

  const date = asDatabaseDate(mealDate)
  if (eating) {
    await db.studentMealAttendance.upsert({
      where: { studentId_mealDate: { studentId, mealDate: date } },
      create: {
        studentId,
        mealDate: date,
        division,
        recordedBy: session.user.id,
      },
      update: { recordedBy: session.user.id, division },
    })
  } else {
    await db.studentMealAttendance.deleteMany({ where: { studentId, mealDate: date } })
  }

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: eating ? '登记学生就餐' : '取消学生就餐',
      detail: `${student.name} ${mealDate}`,
      entityType: 'Student',
      entityId: studentId,
      metadata: { mealDate, eating },
    },
  })

  return NextResponse.json({ success: true, studentId, mealDate, eating })
})
