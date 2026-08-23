import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import {
  activateAcademicTerm,
  archiveAcademicTerm,
  deleteAcademicTerm,
} from '@/lib/academic-term'
import { setAdminTermScopeCookie } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const admin = await requireAdminUser()
  const { id } = await params
  const body = await request.json()
  try {
    if (body.action === 'activate') {
      const result = await activateAcademicTerm(admin.prisma, {
        termId: id,
        division: admin.division,
      })
      return setAdminTermScopeCookie(NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
      }), id)
    }
    if (body.action === 'archive') {
      return NextResponse.json(await archiveAcademicTerm(admin.prisma, {
        termId: id,
        division: admin.division,
      }))
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '操作失败' }, { status: 400 })
  }
  return NextResponse.json({ error: '不支持的操作' }, { status: 400 })
})

export const DELETE = apiHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const admin = await requireAdminUser()
  const { id } = await params
  try {
    return NextResponse.json(await deleteAcademicTerm(admin.prisma, {
      termId: id,
      division: admin.division,
    }))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '删除失败' }, { status: 400 })
  }
})
