import { checkRateLimit } from '@/lib/rate-limit'

const TEACHER_AI_REQUESTS_PER_MINUTE = 2

/** Apply one shared per-teacher budget to chat and article generation. */
export function checkTeacherAiRateLimit(teacherId: string) {
  return checkRateLimit(
    `teacher:${teacherId}`,
    '/api/teacher/ai-feedback',
    'teacher-ai',
    TEACHER_AI_REQUESTS_PER_MINUTE,
  )
}
