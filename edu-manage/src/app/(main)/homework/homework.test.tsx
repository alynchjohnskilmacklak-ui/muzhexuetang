import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import { HomeworkClient } from './client'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({ division: 'JUNIOR' }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('swr', () => ({
  default: () => ({
    data: {
      kpi: {
        totalAssignments: 12,
        totalSubmissionsCount: 45,
        totalAssignedStudents: 50,
        overallSubmissionRate: 90,
        pendingReviewsCount: 5,
        reviewedSubmissionsCount: 40,
        overallReviewRate: 89,
        averageScore: 92.5,
      },
      filterOptions: {
        academicTerms: [{ id: 'term-1', name: '秋季学期', status: 'ACTIVE' }],
        classGroups: [{ id: 'group-1', name: '初一数学冲刺班', course: { name: '初一数学', subject: '数学' } }],
        teachers: [{ id: 't-1', name: '胡思同' }],
      },
      assignments: [
        {
          id: 'hw-1',
          title: '第一单元有理数综合练习',
          instructions: '请完成练习册第10-12页并上传照片',
          attachments: [],
          dueAt: '2026-11-25T20:00:00.000Z',
          createdAt: '2026-11-19T10:00:00.000Z',
          group: {
            id: 'group-1',
            name: '初一数学冲刺班',
            division: 'JUNIOR',
            subject: '数学',
          },
          teacher: {
            id: 't-1',
            name: '胡思同',
          },
          term: {
            id: 'term-1',
            name: '秋季学期',
          },
          stats: {
            totalStudents: 20,
            submittedCount: 18,
            submissionRate: 90,
            reviewedCount: 15,
            reviewRate: 83,
            pendingReviewCount: 3,
            avgScore: 94.2,
            isOverdue: false,
          },
          submissions: [
            {
              id: 'sub-1',
              studentId: 'st-1',
              studentName: '刘子旭',
              grade: '初一',
              parentName: '刘家长',
              parentPhone: '13800138000',
              content: '老师，第三题有些拿不准',
              attachmentUrls: ['https://example.com/homework1.jpg'],
              status: 'REVIEWED',
              score: 95,
              teacherComment: '计算准确，步骤规范，很好！',
              submittedAt: '2026-11-19T12:00:00.000Z',
              reviewedAt: '2026-11-19T14:00:00.000Z',
            },
          ],
          missingStudents: [
            {
              id: 'st-2',
              name: '张小凡',
              grade: '初一',
            },
          ],
        },
      ],
    },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  }),
}))

describe('HomeworkClient (作业监管中心)', () => {
  it('renders KPI metrics and assignment cards correctly', () => {

    const html = renderToStaticMarkup(<HomeworkClient />)

    // 验证核心 KPI 指标渲染
    expect(html).toContain('累计布置作业')
    expect(html).toContain('学生提交总数')
    expect(html).toContain('待教师批阅')
    expect(html).toContain('平均批改得分')
    expect(html).toContain('92.5')

    // 验证作业卡片信息
    expect(html).toContain('第一单元有理数综合练习')
    expect(html).toContain('初一数学冲刺班')
    expect(html).toContain('胡思同')
    expect(html).toContain('查看提交名册')
  })
})
