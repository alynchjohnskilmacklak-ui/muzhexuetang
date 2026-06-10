import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/teacher-portal'
import {
  DEFAULT_FEEDBACK_RATE_GROUP,
  DEFAULT_FEEDBACK_RATE_ONE_ONE,
  DEFAULT_GROUP_RATE_JUNIOR,
  DEFAULT_GROUP_RATE_SENIOR,
  DEFAULT_ONE_ON_ONE_RATES,
} from '@/lib/teacher-salary'

export const dynamic = 'force-dynamic'

function toNumberOrUndefined(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function normalizeOneOnOneRates(value: unknown) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return Object.fromEntries(
    Object.entries(DEFAULT_ONE_ON_ONE_RATES).map(([grade, defaultRate]) => [
      grade,
      toNumberOrUndefined(source[grade]) ?? defaultRate,
    ]),
  )
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser()
    const teacherId = req.nextUrl.searchParams.get('teacherId')
    if (!teacherId) return NextResponse.json({ error: '缺少 teacherId' }, { status: 400 })

    const cfg = await prisma.teacherSalaryConfig.findUnique({ where: { teacherId } })
    return NextResponse.json({
      teacherId,
      groupRateJunior: cfg?.groupRateJunior ?? DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: cfg?.groupRateSenior ?? DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: normalizeOneOnOneRates(cfg?.oneOnOneRates),
      feedbackRateGroup: cfg?.feedbackRateGroup ?? DEFAULT_FEEDBACK_RATE_GROUP,
      feedbackRateOneOne: cfg?.feedbackRateOneOne ?? DEFAULT_FEEDBACK_RATE_ONE_ONE,
      isDefault: !cfg,
    })
  } catch (err) {
    console.error('[admin:salary:config]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdminUser()
    const body = await req.json()
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId : ''
    if (!teacherId) return NextResponse.json({ error: '缺少 teacherId' }, { status: 400 })

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } })
    if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })

    const data = {
      groupRateJunior: toNumberOrUndefined(body.groupRateJunior) ?? DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: toNumberOrUndefined(body.groupRateSenior) ?? DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: normalizeOneOnOneRates(body.oneOnOneRates),
      feedbackRateGroup: toNumberOrUndefined(body.feedbackRateGroup) ?? DEFAULT_FEEDBACK_RATE_GROUP,
      feedbackRateOneOne: toNumberOrUndefined(body.feedbackRateOneOne) ?? DEFAULT_FEEDBACK_RATE_ONE_ONE,
      updatedBy: user.id,
    }

    const cfg = await prisma.teacherSalaryConfig.upsert({
      where: { teacherId },
      update: data,
      create: { teacherId, ...data },
    })

    return NextResponse.json({ success: true, config: cfg })
  } catch (err) {
    console.error('[admin:salary:config]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}
