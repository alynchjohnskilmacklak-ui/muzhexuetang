import { describe, expect, it } from 'vitest'
import {
  getGuideActionLabel,
  getPaperMasteryLabel,
  getStudentStatusLabel,
} from './domain-labels'

describe('domain labels', () => {
  it.each([
    ['LEAD', '潜客咨询'],
    ['TRIAL', '预约试听'],
    ['ACTIVE', '报名缴费'],
    ['INACTIVE', '暂停'],
    ['GRADUATED', '毕业/离校'],
  ])('maps student status %s', (status, label) => {
    expect(getStudentStatusLabel(status)).toBe(label)
  })

  it.each([
    ['MASTERED', '已掌握'],
    ['NEEDS_REVIEW', '待复习'],
    ['NEEDS_PRACTICE', '需练习'],
  ])('maps paper mastery %s', (mastery, label) => {
    expect(getPaperMasteryLabel(mastery)).toBe(label)
  })

  it.each([
    ['VIEW_GUIDE', '查看指南'],
    ['VIEW_STEPS', '浏览步骤'],
    ['DOWNLOAD', '下载文件'],
    ['SEARCH_SCHOOL', '搜学校'],
    ['VIEW_QUOTA', '查名额'],
  ])('maps guide action %s', (action, label) => {
    expect(getGuideActionLabel(action)).toBe(label)
  })

  it('keeps unknown values visible for forward compatibility', () => {
    expect(getStudentStatusLabel('NEW_STATUS')).toBe('NEW_STATUS')
    expect(getPaperMasteryLabel('NEW_MASTERY')).toBe('NEW_MASTERY')
    expect(getGuideActionLabel('NEW_ACTION')).toBe('NEW_ACTION')
  })
})
