import { normalizeAvatarUrl } from '@/lib/upload-url'

/** 男教师使用固定照片，女教师在已放置的 12 张照片中稳定轮换。 */
export const FEMALE_AVATAR_COUNT = 12
export const DEFAULT_TEACHER_AVATAR = '/avatars/teacher-male.png'

const FEMALE_ORDER = [
  '张思雨', '白婼鑫', '徐家茹', '牛钰丹', '赵依梦', '李佳蕊',
  '范芳菲', '张佳涵', '朱梦', '王怡烁', '陈佳丽', '苏琳曼',
]

function stableHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function femaleAvatarByKey(key?: string | null): string {
  const value = key?.trim() || ''
  const listedIndex = FEMALE_ORDER.indexOf(value)
  const index = (listedIndex >= 0 ? listedIndex : stableHash(value)) % FEMALE_AVATAR_COUNT
  return `/avatars/f/avatar-f-${String(index + 1).padStart(2, '0')}.png`
}

/** Use the selected archive portrait first; otherwise keep the established gender rotation. */
export function getTeacherAvatarUrl(
  avatar?: string | null,
  gender?: string | null,
  rotationKey?: string | null,
): string {
  return normalizeAvatarUrl(avatar) || genderDefaultAvatar(gender, rotationKey)
}

/** @deprecated Use getTeacherAvatarUrl with the saved profile avatar. */
export function femaleDefaultAvatar(key?: string): string {
  return femaleAvatarByKey(key)
}

/** @deprecated Use getTeacherAvatarUrl with the saved profile avatar. */
export function genderDefaultAvatar(gender?: string | null, key?: string | null): string {
  const isFemale = gender === 'F' || gender === '女' || gender === 'female'
  return isFemale ? femaleAvatarByKey(key) : DEFAULT_TEACHER_AVATAR
}
