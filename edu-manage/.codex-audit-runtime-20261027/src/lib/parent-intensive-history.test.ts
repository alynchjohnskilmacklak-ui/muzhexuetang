import { describe, expect, it } from 'vitest'
import { parentIntensivePhotos, scopeParentIntensiveHistory } from './parent-intensive-history'

const shared = {
  id: 'shared',
  lessonStudents: [{ studentId: 'a-old' }, { studentId: 'b' }],
  attendances: [{ studentId: 'b', actualMinutes: 90 }, { studentId: 'a-old', actualMinutes: 40 }],
  classroomFeedbacks: [
    { id: 'b-feedback', studentIds: ['b'], imageUrls: ['b.jpg'] },
    { id: 'a-feedback', studentIds: ['a-old'], imageUrls: ['a.jpg', 'a.jpg'] },
    { id: 'foreign-feedback', studentIds: ['foreign'], imageUrls: ['private.jpg'] },
  ],
}

describe('parent intensive personal history', () => {
  it('keeps only this child’s feedback, attendance and photos including historical aliases', () => {
    const result = scopeParentIntensiveHistory([shared], ['a', 'a-old'])
    expect(result[0].attendances).toEqual([{ studentId: 'a-old', actualMinutes: 40 }])
    expect(result[0].classroomFeedbacks.map((item) => item.id)).toEqual(['a-feedback'])
    expect(parentIntensivePhotos(result)).toEqual(['a.jpg'])
    expect(shared.classroomFeedbacks).toHaveLength(3)
  })

  it('switching siblings in the same group changes the entire personal history', () => {
    const result = scopeParentIntensiveHistory([shared], ['b'])
    expect(result[0].attendances[0].actualMinutes).toBe(90)
    expect(parentIntensivePhotos(result)).toEqual(['b.jpg'])
  })

  it('does not use class enrollment as proof that a child attended an intensive lesson', () => {
    expect(scopeParentIntensiveHistory([shared], ['not-in-lesson'])).toEqual([])
    expect(scopeParentIntensiveHistory([shared], [])).toEqual([])
  })

  it('supports historical lessons with attendance or feedback but no roster snapshot', () => {
    expect(scopeParentIntensiveHistory([{ id: 'legacy', attendances: [{ studentId: 'a' }] }], ['a'])).toHaveLength(1)
    expect(scopeParentIntensiveHistory([{ id: 'legacy', classroomFeedbacks: [{ studentIds: ['a'] }] }], ['a'])).toHaveLength(1)
    expect(scopeParentIntensiveHistory([{ id: 'missing', classroomFeedbacks: [{}] }], ['a'])).toEqual([])
  })
})
