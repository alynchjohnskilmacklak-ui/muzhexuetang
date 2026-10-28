import { redirect } from 'next/navigation'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const lessonId = typeof params.lessonId === 'string' ? params.lessonId.trim() : ''
  redirect(lessonId ? `/teacher/feedback?lessonId=${encodeURIComponent(lessonId)}` : '/teacher/feedback')
}
