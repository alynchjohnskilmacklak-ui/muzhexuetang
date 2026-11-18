import { describe, expect, it } from 'vitest'
import { mergeDuplicateStudents } from './merge-students'

describe('mergeDuplicateStudents', () => {
  it('merges historical records for one stable student identity and keeps record aliases', () => {
    const merged = mergeDuplicateStudents([
      { id: 'old', identityId: 'identity-a', name: '马子墨', enrollments: [{ id: 'enrollment-old' }] },
      { id: 'current', identityId: 'identity-a', name: '马子墨', enrollments: [{ id: 'enrollment-current' }] },
    ])

    expect(merged).toHaveLength(1)
    expect((merged[0] as { recordIds?: string[] }).recordIds).toEqual(['old', 'current'])
    expect(merged[0].enrollments).toEqual([{ id: 'enrollment-old' }])
  })

  it('uses only the newest active batch record for current enrollments while keeping historical record IDs', () => {
    const merged = mergeDuplicateStudents([
      {
        id: 'summer-record', identityId: 'identity-a', name: '马紫晨', grade: '初三', membershipLevel: 'SVIP',
        updatedAt: new Date('2026-07-01'),
        termMemberships: [{ status: 'ACTIVE', joinedAt: new Date('2026-06-01'), term: { id: 'summer', status: 'ACTIVE', startDate: new Date('2026-06-01') } }],
        enrollments: [{ id: 'vip-summer', group: { termId: 'summer' } }],
      },
      {
        id: 'weekend-record', identityId: 'identity-a', name: '马紫晨', grade: '初三', membershipLevel: 'NORMAL',
        updatedAt: new Date('2026-09-01'),
        termMemberships: [{ status: 'ACTIVE', joinedAt: new Date('2026-08-01'), term: { id: 'weekend', status: 'ACTIVE', startDate: new Date('2026-08-01') } }],
        enrollments: [{ id: 'regular-weekend', group: { termId: 'weekend' } }],
      },
    ])
    const current = merged[0] as typeof merged[number] & { currentTermId?: string | null; currentTermRecordIds?: string[]; recordIds?: string[] }

    expect(merged).toHaveLength(1)
    expect(current.id).toBe('weekend-record')
    expect(current.membershipLevel).toBe('NORMAL')
    expect(current.currentTermId).toBe('weekend')
    expect(current.currentTermRecordIds).toEqual(['weekend-record'])
    expect(current.recordIds).toEqual(['summer-record', 'weekend-record'])
    expect(current.enrollments?.map(({ id }) => id)).toEqual(['regular-weekend'])
  })

  it('never merges two children just because their names match', () => {
    const merged = mergeDuplicateStudents([
      { id: 'sibling-a', identityId: 'identity-a', name: '同名学生', enrollments: [{ id: 'a' }] },
      { id: 'sibling-b', identityId: 'identity-b', name: '同名学生', enrollments: [{ id: 'b' }] },
    ])

    expect(merged).toHaveLength(2)
    expect(merged.map((student) => student.id)).toEqual(['sibling-a', 'sibling-b'])
  })
})
