import { describe, expect, it } from 'vitest'
import type { FeedbackArchiveItem } from './archive'
import { getParentFeedbackSections } from './parent-feedback-content'
import {
  getParentPdfDetailSections,
  getParentPdfImageRequests,
  groupFeedbackForParentPdf,
} from './parent-pdf'

function item(
  id: string,
  date: string,
  subject: string,
  teacher = '王老师',
): FeedbackArchiveItem {
  return {
    id,
    date,
    teacher: { id: `teacher-${id}`, name: teacher },
    subject,
    course: null,
    className: null,
    lessonContent: '本节讲解一元二次方程的解法与典型例题。',
    overallComment: '课堂表现：听课认真\n知识掌握：基础知识掌握稳定',
    summary: null,
    knowledgePoints: [],
    homework: [],
    tags: [],
    badge: null,
    studentRating: null,
    images: [],
    parentReply: null,
    replyTime: null,
    teacherReply: null,
    teacherReplyTime: null,
    createdAt: date,
  }
}

describe('parent feedback PDF layout data', () => {
  it('groups newest dates first', () => {
    const groups = groupFeedbackForParentPdf([
      item('old', '2026-07-20T10:00:00.000Z', '数学'),
      item('new', '2026-07-22T10:00:00.000Z', '数学'),
    ])
    expect(groups.map((group) => group.date)).toEqual(['2026-07-22', '2026-07-20'])
  })

  it('uses a stable subject order within each day', () => {
    const groups = groupFeedbackForParentPdf([
      item('physics', '2026-07-22T12:00:00.000Z', '物理'),
      item('english', '2026-07-22T11:00:00.000Z', '英语'),
      item('math', '2026-07-22T10:00:00.000Z', '数学'),
      item('chinese', '2026-07-22T09:00:00.000Z', '语文'),
    ])
    expect(groups[0].items.map((entry) => entry.subject)).toEqual(['数学', '语文', '英语', '物理'])
  })

  it('keeps only teacher fields that contain real content', () => {
    const feedback = item('one', '2026-07-22T10:00:00.000Z', '数学')
    const sections = getParentFeedbackSections(feedback)
    expect(sections).toEqual([
      { label: '本节课学习内容', content: '本节讲解一元二次方程的解法与典型例题。' },
      { label: '课堂表现', content: '听课认真' },
      { label: '孩子掌握情况', content: '基础知识掌握稳定' },
    ])
    expect(sections.some((section) => section.content === '未填写')).toBe(false)
  })

  it('keeps tags and rating in the daily overview instead of repeating detail cards', () => {
    const feedback = {
      ...item('one', '2026-07-22T10:00:00.000Z', '数学'),
      tags: ['认真'],
      studentRating: 'GREAT',
    }
    const sections = getParentPdfDetailSections(feedback)
    expect(sections.map((section) => section.label)).toEqual(['本节课学习内容', '课堂表现', '孩子掌握情况'])
  })

  it('includes legacy feedback images without a FileAsset id', () => {
    const feedback = {
      ...item('one', '2026-07-22T10:00:00.000Z', '数学'),
      images: [
        {
          assetId: null,
          thumbnailUrl: '/api/files/legacy-thumbnail',
          previewUrl: '/api/files/legacy-preview',
        },
        {
          assetId: 'asset-2',
          thumbnailUrl: '/api/files/thumbnail?id=asset-2',
          previewUrl: '/api/files/preview?id=asset-2',
        },
      ],
    }
    expect(getParentPdfImageRequests(feedback)).toEqual([
      { feedbackId: 'one', imageIndex: 0, assetId: null },
      { feedbackId: 'one', imageIndex: 1, assetId: 'asset-2' },
    ])
  })
})
