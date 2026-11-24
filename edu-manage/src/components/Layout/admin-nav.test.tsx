import { describe, expect, it } from 'vitest'
import { adminNavItems } from './admin-nav'

function flattenKeys(items: typeof adminNavItems): string[] {
  return items.flatMap((item) => [item.key, ...(item.children ? flattenKeys(item.children as typeof adminNavItems) : [])])
}

describe('admin navigation routes', () => {
  it('exposes teacher logs without exposing the teacher-specific compliance detail page', () => {
    const keys = flattenKeys(adminNavItems)

    expect(keys).toContain('/teacher-logs')
    expect(keys).not.toContain('/teacher-compliance')
  })

  it('keeps services on the dashboard and groups navigation into consolidated management centers', () => {
    const academicGroup = adminNavItems.find((item) => item.key === 'academic-group')
    const studentGroup = adminNavItems.find((item) => item.key === 'student-group')
    const teacherGroup = adminNavItems.find((item) => item.key === 'teacher-group')
    const operationsGroup = adminNavItems.find((item) => item.key === 'operations-group')
    const resourcesGroup = adminNavItems.find((item) => item.key === 'resource-group')

    expect(adminNavItems.some((item) => item.key === '/services')).toBe(false)
    expect(adminNavItems.find((item) => item.key === '/daily-class')?.label).toBe('今日课堂')
    expect(adminNavItems.find((item) => item.key === '/closed-loop')?.label).toBe('闭环管理')
    expect(academicGroup?.label).toBe('教务与排课')
    expect(studentGroup?.label).toBe('学员成长全景')
    expect(teacherGroup?.label).toBe('师资督导管理')
    expect(operationsGroup?.label).toBe('家校与经营')
    expect(resourcesGroup?.label).toBe('系统与资源')
  })

  it('streamlines sub-modules into high-frequency core entries per center without clutter', () => {
    const academicGroup = adminNavItems.find((item) => item.key === 'academic-group')
    const studentGroup = adminNavItems.find((item) => item.key === 'student-group')
    const teacherGroup = adminNavItems.find((item) => item.key === 'teacher-group')
    const operationsGroup = adminNavItems.find((item) => item.key === 'operations-group')
    const resourcesGroup = adminNavItems.find((item) => item.key === 'resource-group')

    // 核心业务中心每个不超过4项，杜绝臃肿平铺
    expect(academicGroup?.children?.length).toBe(4)
    expect(studentGroup?.children?.length).toBe(4)
    expect(teacherGroup?.children?.length).toBe(4)
    expect(operationsGroup?.children?.length).toBe(4)
    expect(resourcesGroup?.children?.length).toBe(4)

    const keys = flattenKeys(adminNavItems)
    const coreDestinations = [
      '/dashboard', '/daily-class', '/closed-loop',
      '/schedule', '/courses', '/attendance', '/study-hall',
      '/students', '/gradebook', '/feedback-performance', '/student-archive',
      '/teachers', '/teacher-interactions', '/teacher-salary', '/teacher-logs',
      '/communication-center', '/parent-feedback-reviews', '/parent-access', '/meals',
      '/volunteer', '/volunteer-sim', '/volunteer-sim/schools', '/volunteer-sim/rank-query', '/volunteer/quota',
      '/materials', '/ai', '/reports', '/settings',
    ]

    expect(keys).toEqual(expect.arrayContaining(coreDestinations))
    expect(keys).not.toContain('/services')
  })
})
