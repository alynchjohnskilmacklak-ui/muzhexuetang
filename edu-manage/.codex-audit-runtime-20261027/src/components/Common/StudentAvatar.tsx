import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { normalizeAvatarUrl } from '@/lib/upload-url'

interface Props {
  photoUrl?: string | null
  gender?: string | null
  name?: string | null
  size?: number
  className?: string
  rounded?: boolean
}

/**
 * 学生统一头像：有档案照片时使用档案照片，否则显示固定的性别默认头像。
 * gender: 'M' | 'F' | 'MALE' | 'FEMALE' | '男' | '女'
 */
export function StudentAvatar({ photoUrl, gender, name, size = 40, className, rounded = true }: Props) {
  const g = (gender || '').toUpperCase()
  const isFemale = g === 'F' || g === 'FEMALE' || g === '女'
  const defaultSrc = isFemale ? '/avatars/student-female.png' : '/avatars/student-male.png'
  const src = normalizeAvatarUrl(photoUrl) || defaultSrc
  const radius = rounded ? '50%' : 10
  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: radius, overflow: 'hidden',
        flexShrink: 0, background: 'var(--color-surface-3)', position: 'relative',
      }}
    >
      <CachedAvatarImage
        src={src}
        fallbackSrc={defaultSrc}
        alt={name || 'avatar'}
        style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: 'transparent' }}
      />
    </div>
  )
}
