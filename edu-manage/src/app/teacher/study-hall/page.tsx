import { StudyHallWorkspace } from '@/components/study-hall/StudyHallWorkspace'

export default async function TeacherStudyHallPage({ searchParams }: { searchParams: Promise<{ mode?: string; classId?: string; date?: string }> }) {
  const query = await searchParams
  return <StudyHallWorkspace
    admin={false}
    initialMode={query.mode === 'homework' ? 'homework' : 'attendance'}
    initialClassId={query.classId}
    initialDate={query.date}
  />
}
