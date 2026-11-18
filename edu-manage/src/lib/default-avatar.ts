import { genderDefaultAvatar } from '@/lib/teacher-avatars'

/** 固定一张男教师头像，女教师按 12 张照片稳定轮换。 */
export function getDefaultTeacherAvatar(gender?: string | null, userId?: string | null): string {
  return genderDefaultAvatar(gender, userId)
}
