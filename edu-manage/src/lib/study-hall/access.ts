export type StudyHallActor = {
  id: string
  role: string
  division: string
}

export type StudyHallPlanScope = {
  assignedTeacherId: string | null
  division: string
  status: string
  termStatus: string
}

export function canViewStudyHallPlan(actor: StudyHallActor, plan: StudyHallPlanScope) {
  if (actor.division !== plan.division) return false
  if (actor.role === 'admin') return true
  return actor.role === 'teacher'
    && plan.status === 'ACTIVE'
    && plan.assignedTeacherId === actor.id
}

export function canRecordStudyHallPlan(actor: StudyHallActor, plan: StudyHallPlanScope) {
  if (actor.division !== plan.division || plan.status !== 'ACTIVE' || plan.termStatus !== 'ACTIVE') return false
  if (actor.role === 'admin') return true
  return actor.role === 'teacher' && plan.assignedTeacherId === actor.id
}

export function canManageStudyHallPlan(actor: StudyHallActor, division: string) {
  return actor.role === 'admin' && actor.division === division
}

export type StudyHallClassScope = {
  division: string
  status: string
  termStatus: string
  activeTeacherIds: string[]
}

export function canViewStudyHallClass(actor: StudyHallActor, studyClass: StudyHallClassScope) {
  if (actor.division !== studyClass.division) return false
  if (actor.role === 'admin') return true
  return actor.role === 'teacher'
    && studyClass.status === 'ACTIVE'
    && studyClass.activeTeacherIds.includes(actor.id)
}

export function canRecordStudyHallClass(actor: StudyHallActor, studyClass: StudyHallClassScope) {
  return studyClass.status === 'ACTIVE'
    && studyClass.termStatus === 'ACTIVE'
    && canViewStudyHallClass(actor, studyClass)
}
