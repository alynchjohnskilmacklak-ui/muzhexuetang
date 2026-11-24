import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { getVolunteerGuideForAdmin, getVolunteerGuideForParent, getOrCreateVolunteerGuide } from '@/lib/volunteer'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await requireAuthenticatedUser()
  const guide = user.role === 'admin' || user.role === 'teacher'
    ? await getVolunteerGuideForAdmin()
    : await getVolunteerGuideForParent()
  return NextResponse.json(guide)
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const user = await requireAuthenticatedUser()
  if (!['admin', 'teacher'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const guide = await getOrCreateVolunteerGuide()
  const body = await req.json().catch(() => ({}))

  // 严格校验年份：必须是合法的 4 位整数（2000-2100），防止空字符串、null、false 隐式转为 0 写入脏数据
  let parsedYear: number | undefined
  if (body.year !== undefined && body.year !== null) {
    if (typeof body.year === 'number' && Number.isInteger(body.year) && body.year >= 2000 && body.year <= 2100) {
      parsedYear = body.year
    } else if (typeof body.year === 'string' && /^\d{4}$/.test(body.year.trim())) {
      const num = parseInt(body.year.trim(), 10)
      if (num >= 2000 && num <= 2100) {
        parsedYear = num
      } else {
        return NextResponse.json({ error: '年份必须在 2000 至 2100 之间' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: '无效的年份格式' }, { status: 400 })
    }
  }

  const updated = await user.prisma.volunteerGuide.update({
    where: { id: guide.id },
    data: {
      ...(typeof body.title === 'string' ? { title: body.title.trim() || guide.title } : {}),
      ...(typeof body.subtitle === 'string' ? { subtitle: body.subtitle.trim() || null } : {}),
      ...(parsedYear !== undefined ? { year: parsedYear } : {}),
      ...(typeof body.isPublished === 'boolean' ? { isPublished: body.isPublished } : {}),
    },
    include: { steps: { orderBy: { order: 'asc' } }, documents: { orderBy: { sortOrder: 'asc' } } },
  })
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json(updated)
})
