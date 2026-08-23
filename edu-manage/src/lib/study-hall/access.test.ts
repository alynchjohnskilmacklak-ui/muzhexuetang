import { describe, expect, it } from 'vitest'
import {
  canManageStudyHallPlan,
  canRecordStudyHallPlan,
  canRecordStudyHallClass,
  canViewStudyHallPlan,
  canViewStudyHallClass,
} from './access'

const activePlan = {
  assignedTeacherId: 'teacher-a',
  division: 'JUNIOR',
  status: 'ACTIVE',
  termStatus: 'ACTIVE',
}

describe('study hall access', () => {
  it('allows an administrator in the same division to manage and record', () => {
    const actor = { id: 'admin-a', role: 'admin', division: 'JUNIOR' }
    expect(canManageStudyHallPlan(actor, activePlan.division)).toBe(true)
    expect(canRecordStudyHallPlan(actor, activePlan)).toBe(true)
  })

  it('only exposes an active plan to its assigned teacher', () => {
    const assigned = { id: 'teacher-a', role: 'teacher', division: 'JUNIOR' }
    const other = { id: 'teacher-b', role: 'teacher', division: 'JUNIOR' }
    expect(canViewStudyHallPlan(assigned, activePlan)).toBe(true)
    expect(canRecordStudyHallPlan(assigned, activePlan)).toBe(true)
    expect(canViewStudyHallPlan(other, activePlan)).toBe(false)
    expect(canRecordStudyHallPlan(other, activePlan)).toBe(false)
  })

  it('rejects cross-division and inactive teacher access', () => {
    expect(canViewStudyHallPlan(
      { id: 'teacher-a', role: 'teacher', division: 'SENIOR' },
      activePlan,
    )).toBe(false)
    expect(canViewStudyHallPlan(
      { id: 'teacher-a', role: 'teacher', division: 'JUNIOR' },
      { ...activePlan, status: 'PAUSED' },
    )).toBe(false)
    expect(canRecordStudyHallPlan(
      { id: 'admin-a', role: 'admin', division: 'JUNIOR' },
      { ...activePlan, status: 'PAUSED' },
    )).toBe(false)
    expect(canRecordStudyHallPlan(
      { id: 'admin-a', role: 'admin', division: 'JUNIOR' },
      { ...activePlan, termStatus: 'DRAFT' },
    )).toBe(false)
  })

  it('supports multiple active teachers while preserving class status boundaries', () => {
    const studyClass = {
      division: 'JUNIOR',
      status: 'ACTIVE',
      termStatus: 'ACTIVE',
      activeTeacherIds: ['teacher-a', 'teacher-b'],
    }
    expect(canViewStudyHallClass({ id: 'teacher-b', role: 'teacher', division: 'JUNIOR' }, studyClass)).toBe(true)
    expect(canRecordStudyHallClass({ id: 'teacher-b', role: 'teacher', division: 'JUNIOR' }, studyClass)).toBe(true)
    expect(canRecordStudyHallClass(
      { id: 'teacher-b', role: 'teacher', division: 'JUNIOR' },
      { ...studyClass, termStatus: 'ARCHIVED' },
    )).toBe(false)
  })
})
