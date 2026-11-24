import { MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'

type StudentMembershipBadgeProps = {
  level?: string | null
  showNormal?: boolean
  className?: string
}

/** Compact, non-shrinking membership label for student identity rows. */
export function StudentMembershipBadge({
  level,
  showNormal = false,
  className,
}: StudentMembershipBadgeProps) {
  const membership = resolveMembership(level)
  const theme = MEMBERSHIP_THEME[membership]
  if (membership === 'NORMAL' && !showNormal) return null

  return (
    <span
      className={['student-membership-badge', className].filter(Boolean).join(' ')}
      aria-label={`${theme.label}学员`}
      title={`${theme.label}学员`}
      style={{
        color: theme.text,
        backgroundColor: theme.bg,
        borderColor: theme.border,
      }}
    >
      {theme.badge || theme.label}
    </span>
  )
}
