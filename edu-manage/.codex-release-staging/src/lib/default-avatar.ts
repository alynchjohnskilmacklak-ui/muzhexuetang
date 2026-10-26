// 根据性别和用户ID生成默认头像
// 男教师：固定一张
// 女教师：13张轮询（按 userId hash 取模）
export function getDefaultTeacherAvatar(gender?: string | null, userId?: string | null): string {
  const isFemale = gender === 'F' || gender === '女' || gender === 'female'
  if (!isFemale) return '/avatars/teacher-male.png'
  if (!userId) return '/avatars/f/avatar-f-01.png'
  // 简单 hash：字符码求和
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % 13
  }
  const idx = (hash % 13) + 1
  return `/avatars/f/avatar-f-${String(idx).padStart(2, '0')}.png`
}
