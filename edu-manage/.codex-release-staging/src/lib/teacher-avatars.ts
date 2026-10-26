/**
 * 教师默认头像轮询工具
 * - 男：固定 teacher-male.png
 * - 女：13 张女生头像按名单顺序轮询（avatar-f-01 .. avatar-f-13），超过 13 循环
 */
export const FEMALE_AVATAR_COUNT = 13

/** 无头像女生教师名单（按用户给定顺序，用于"前 13 人不重复"轮询） */
const FEMALE_ORDER = [
  '张思雨', '白婼鑫', '徐家茹', '牛钰丹', '赵依梦', '李佳蕊', '范芳菲',
  '张佳涵', '朱梦', '王怡烁', '陈佳丽', '苏琳曼', '任紫莹', '王田雪', '韩双双',
]

function nameHash(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return h
}

/** 无头像女教师的默认头像 URL（轮询） */
export function femaleDefaultAvatar(name: string): string {
  const idx = FEMALE_ORDER.indexOf(name)
  const n = (idx >= 0 ? idx : nameHash(name)) % FEMALE_AVATAR_COUNT
  return `/avatars/f/avatar-f-${String(n + 1).padStart(2, '0')}.png`
}

/** 无头像教师按性别返回默认头像 URL */
export function genderDefaultAvatar(gender: string | null | undefined, name: string): string {
  return gender === '男' ? '/avatars/teacher-male.png' : femaleDefaultAvatar(name)
}
