import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { assertDangerAuth } from '@/lib/danger-guard'
import { isSuperAdminEmail } from '@/lib/super-admin'
import { cleanupExpiredTrash } from '@/lib/data-correction/trash'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const auth = await assertDangerAuth(body, '永久删除所有废弃数据')
  const result = await cleanupExpiredTrash(await getRequestPrisma(), auth.userId)
  return NextResponse.json({ success: result.errors.length === 0, partial: result.purged > 0 && result.errors.length > 0, results: { trashRecords: result.purged }, errors: result.errors, message: '仅清理到期回收站记录；正常归档、取消或离职数据不在清理范围' })
})

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '仅管理员' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const expiredTrash = await prisma.deletedRecord.count({ where: { expiresAt: { lte: new Date() } } })
  return NextResponse.json({ archivedGroups: 0, cancelledSchedules: 0, cancelledLessons: 0, deletedPapers: 0, resignedTeachers: 0, inactiveStudents: 0, withdrawnEnrollments: 0, expiredTrash, canCleanup: isSuperAdminEmail(user.email), totalSoftDeleted: expiredTrash })
})
