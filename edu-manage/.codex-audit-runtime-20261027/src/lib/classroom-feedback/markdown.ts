import type { FeedbackArchiveItem, FeedbackArchiveResult } from './archive'
import { getParentFeedbackSections } from './parent-feedback-content'

export type FeedbackMarkdownOptions = {
  imageUrl?: (assetId: string) => string
}

function escapeMarkdown(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]{}|])/g, '\\$1')
    .replace(/^([#>+-])(?=\s)/gm, '\\$1')
}

function renderFeedbackItem(
  item: FeedbackArchiveItem,
  options: FeedbackMarkdownOptions,
) {
  const lines = [
    `## ${item.date.slice(0, 10)} · ${escapeMarkdown(item.subject)} · ${escapeMarkdown(item.teacher.name)}老师`,
    '',
  ]

  getParentFeedbackSections(item).forEach((section) => {
    lines.push(`### ${section.label}`, '', escapeMarkdown(section.content), '')
  })

  const images = item.images.filter(
    (image): image is typeof image & { assetId: string } => Boolean(image.assetId),
  )
  if (images.length) {
    lines.push('### 课堂图片', '')
    images.forEach((image, index) => {
      const url = options.imageUrl?.(image.assetId)
        ?? `/api/files/view?id=${encodeURIComponent(image.assetId)}`
      const label = `课堂图片${index + 1}`
      lines.push(`![${label}](${url})`, '', `[如果图片未自动显示，点击查看${label}](${url})`, '')
    })
  }

  lines.push('---')
  return lines.join('\n')
}

/** Pure renderer: archive DTO in, Markdown string out. */
export function renderFeedbackMarkdown(
  archive: FeedbackArchiveResult,
  options: FeedbackMarkdownOptions = {},
): string {
  const records = archive.items.length
    ? archive.items.map((item) => renderFeedbackItem(item, options)).join('\n\n')
    : '暂无课堂反馈记录。\n'

  return [
    `# ${escapeMarkdown(archive.student.name)}的课堂反馈档案`,
    '',
    archive.student.grade ? `年级：${escapeMarkdown(archive.student.grade)}` : '',
    `共 ${archive.summary.totalCount} 条课堂反馈`,
    '',
    '---',
    '',
    records,
    '',
  ].filter((line, index, values) => line !== '' || values[index - 1] !== '').join('\n')
}
