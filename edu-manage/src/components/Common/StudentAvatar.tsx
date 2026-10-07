import Image from 'next/image'

interface Props {
  photoUrl?: string | null
  gender?: string | null
  name?: string | null
  size?: number
  className?: string
  rounded?: boolean
}

/**
 * 学生统一头像：有照片用照片，否则按性别用默认头像。
 * gender: 'M' | 'F' | 'MALE' | 'FEMALE' | '男' | '女'
 */
export function StudentAvatar({ photoUrl, gender, name, size = 40, className, rounded = true }: Props) {
  const g = (gender || '').toUpperCase()
  const isFemale = g === 'F' || g === 'FEMALE' || g === '女'
  const src = photoUrl || (isFemale ? '/avatars/student-female.png' : '/avatars/student-male.png')
  const radius = rounded ? '50%' : 10
  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: radius, overflow: 'hidden',
        flexShrink: 0, background: '#f0e7de', position: 'relative',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}
