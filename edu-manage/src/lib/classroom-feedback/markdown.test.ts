import { describe, expect, it } from 'vitest'
import type { FeedbackArchiveResult } from './archive'
import { renderFeedbackMarkdown } from './markdown'

function makeArchive(count: number, withImage = false): FeedbackArchiveResult {
  return {
    student: { id: 'student-1', name: '张三', grade: '初二' },
    summary: {
      totalCount: count,
      subjectCount: count ? 1 : 0,
      teacherCount: count ? 1 : 0,
      firstFeedbackDate: count ? '2026-07-01T10:00:00.000Z' : null,
      latestFeedbackDate: count ? '2026-07-20T10:00:00.000Z' : null,
    },
    pagination: { page: 1, pageSize: 100, totalCount: count, totalPages: count ? 1 : 0 },
    items: Array.from({ length: count }, (_value, index) => ({
      id: `feedback-${index + 1}`,
      date: `2026-07-${String(20 - index).padStart(2, '0')}T10:00:00.000Z`,
      teacher: { id: 'teacher-1', name: '王' },
      subject: '数学',
      course: '初二数学',
      className: '初二一班',
      lessonContent: '本节讲解一元二次方程的解法与典型例题。',
      overallComment: '课堂参与积极，能够独立完成例题。',
      summary: null,
      knowledgePoints: ['一元二次方程'],
      homework: [],
      tags: ['积极', '认真'],
      badge: null,
      studentRating: 'GREAT',
      images: withImage
        ? [{ assetId: `asset-${index + 1}`, thumbnailUrl: 'thumb.webp', previewUrl: 'preview.webp' }]
        : [],
      parentReply: null,
      replyTime: null,
      teacherReply: null,
      teacherReplyTime: null,
      createdAt: '2026-07-20T10:00:00.000Z',
    })),
  }
}

describe('feedback archive markdown renderer', () => {
  it('renders ten feedback records as ten concise dated sections', () => {
    const markdown = renderFeedbackMarkdown(makeArchive(10))
    expect(markdown.match(/^## 2026-07-\d{2} · 数学 · 王老师$/gm)).toHaveLength(10)
  })

  it('omits empty fields and administrative details', () => {
    const markdown = renderFeedbackMarkdown(makeArchive(1))
    expect(markdown).toContain('### 课堂反馈')
    expect(markdown).not.toContain('未填写')
    expect(markdown).not.toContain('### 课堂图片')
    expect(markdown).not.toContain('### 家长沟通')
    expect(markdown).not.toContain('课程：')
    expect(markdown).not.toContain('班级：')
  })

  it('uses the supplied absolute controlled URL for images', () => {
    const markdown = renderFeedbackMarkdown(makeArchive(1, true), {
      imageUrl: (assetId) => `https://muzhexuetang.xyz/api/files/view?id=${assetId}&token=signed`,
    })
    expect(markdown).toContain(
      '![课堂图片1](https://muzhexuetang.xyz/api/files/view?id=asset-1&token=signed)',
    )
    expect(markdown).toContain('如果图片未自动显示，点击查看课堂图片1')
    expect(markdown).not.toContain('preview.webp')
  })

  it('renders only populated structured feedback sections', () => {
    const archive = makeArchive(1)
    archive.items[0].overallComment = '课堂表现：听课认真\n知识掌握：计算方法掌握较好'
    archive.items[0].knowledgePoints = []
    archive.items[0].tags = []
    archive.items[0].studentRating = null
    const markdown = renderFeedbackMarkdown(archive)
    expect(markdown).toContain('### 课堂表现\n\n听课认真')
    expect(markdown).toContain('### 孩子掌握情况\n\n计算方法掌握较好')
    expect(markdown).not.toContain('### 存在问题')
    expect(markdown).not.toContain('### 后续建议')
  })

  it('escapes special characters without breaking markdown structure', () => {
    const archive = makeArchive(1)
    archive.student.name = '张三&李四'
    archive.items[0].overallComment = '# 进步 *明显* & 稳定'
    const markdown = renderFeedbackMarkdown(archive)
    expect(markdown).toContain('# 张三&amp;李四的课堂反馈档案')
    expect(markdown).toContain('\\# 进步 \\*明显\\* &amp; 稳定')
  })

  it('renders a legal empty archive', () => {
    const markdown = renderFeedbackMarkdown(makeArchive(0))
    expect(markdown).toContain('共 0 条课堂反馈')
    expect(markdown).toContain('暂无课堂反馈记录。')
  })
})
