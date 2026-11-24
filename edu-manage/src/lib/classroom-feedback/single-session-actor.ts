import { AuthError } from '@/lib/auth/guards'
import { requireAdminUser, requireCurrentTeacher } from '@/lib/teacher-portal'
import { resolveStandaloneFeedbackTeacher } from '@/lib/classroom-feedback/single-session-scope'

/**
 * Shared auth scope for the standalone feedback composer.
 * Admin access is intentionally limited to selecting a teacher within the
 * admin's own division; the route using this helper must still enforce that
 * it is handling the standalone workflow only.
 */
export async function requireSingleSessionActor(requestedTeacherId?: string | null) {
  let currentTeacher: Awaited<ReturnType<typeof requireCurrentTeacher>> | null = null
  try {
    currentTeacher = await requireCurrentTeacher()
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 403) throw error
  }

  if (currentTeacher) {
    const selectedTeacher = await resolveStandaloneFeedbackTeacher(
      currentTeacher.prisma,
      currentTeacher.teacher,
      requestedTeacherId?.trim() || currentTeacher.teacher.id,
    )
    if (!selectedTeacher) throw new AuthError('所选授课老师不存在或不属于当前学部', 403)
    return {
      user: currentTeacher.user,
      prisma: currentTeacher.prisma,
      division: currentTeacher.teacher.division,
      currentTeacherId: currentTeacher.teacher.id,
      selectedTeacher,
      isAdmin: false as const,
    }
  }

  const admin = await requireAdminUser()
  const selectedId = requestedTeacherId?.trim() || ''
  const selectedTeacher = selectedId
    ? await resolveStandaloneFeedbackTeacher(admin.prisma, { division: admin.division }, selectedId)
    : null
  if (selectedId && !selectedTeacher) throw new AuthError('所选授课老师不存在或不属于当前学部', 403)
  return {
    user: admin.user,
    prisma: admin.prisma,
    division: admin.division,
    currentTeacherId: '',
    selectedTeacher,
    isAdmin: true as const,
  }
}
