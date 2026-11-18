import { StudyHallWorkspace } from '@/components/study-hall/StudyHallWorkspace'
import { AdminTeachingRecordSwitcher } from '@/components/study-hall/AdminTeachingRecordSwitcher'

export default function StudyHallPage() {
  return <div><AdminTeachingRecordSwitcher /><StudyHallWorkspace admin embedded /></div>
}
