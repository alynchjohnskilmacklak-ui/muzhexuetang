import { describe, expect, it } from 'vitest'
import { getMissingStudentRatingTagCategories, getMissingStudentTagCategories } from './student-feedback-tags'

describe('student feedback required tag categories', () => {
  it('accepts a complete fictional feedback template with one tag in every category', () => {
    const sampleTemplate = {
      student: '示例学生',
      tags: ['专注听讲', '方法运用到位', '主动检查', '容易遗漏步骤', '分步提示引导'],
    }

    expect(getMissingStudentTagCategories(sampleTemplate.tags)).toEqual([])
  })

  it('names only the categories that still need a selection', () => {
    const incompleteTemplate = {
      student: '示例学生',
      tags: ['专注听讲', '方法运用到位', '主动检查', '追问检查理解'],
    }

    expect(getMissingStudentTagCategories(incompleteTemplate.tags)).toEqual(['后续关注'])
  })

  it('does not let custom text satisfy a required category', () => {
    expect(getMissingStudentTagCategories(['专注听讲', '临时补充说明'])).toEqual(['知识掌握', '学习习惯', '后续关注', '课堂辅导'])
  })

  it('validates each student independently before publishing', () => {
    const ratings = [
      { studentId: 'student-a', tags: ['专注听讲', '方法运用到位', '主动检查', '容易遗漏步骤', '分步提示引导'] },
      { studentId: 'student-b', tags: ['积极发言', '基础掌握扎实'] },
    ]

    expect(getMissingStudentRatingTagCategories(ratings, ['student-a', 'student-b'])).toEqual([
      { studentId: 'student-b', missing: ['学习习惯', '后续关注', '课堂辅导'] },
    ])
  })
})
