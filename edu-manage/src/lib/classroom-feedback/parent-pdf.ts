import type { FeedbackArchiveItem, FeedbackArchiveResult } from './archive'
import type { AdminLearningReport } from '@/lib/student-growth/admin-report'
import {
  getParentFeedbackSections,
  parentRatingLabel,
  type ParentFeedbackSection,
} from './parent-feedback-content'

const PAGE_WIDTH = 1240
const PAGE_HEIGHT = 1754
const PAGE_MARGIN = 76
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2
const CONTENT_BOTTOM = PAGE_HEIGHT - 92
const SUBJECT_ORDER = ['数学', '语文', '英语', '物理', '化学', '生物', '道德与法治', '政治', '历史', '地理']
const META_SECTION_LABELS = new Set(['课堂标签', '课堂评价'])

const COLORS = {
  canvas: '#faf8f5',
  surface: '#ffffff',
  surfaceSoft: '#f5f2ee',
  primary: '#E8784A',
  primarySoft: '#fff3ec',
  ink: '#1a1201',
  muted: '#5a4e3a',
  subtle: '#9a8e7a',
  border: '#eadfd5',
}

export type ParentFeedbackDay = {
  date: string
  weekday: string
  items: FeedbackArchiveItem[]
}

export type ParentPdfImageRequest = {
  feedbackId: string
  imageIndex: number
  assetId: string | null
}

type LoadedFeedbackImage = {
  image: HTMLImageElement
  dispose: () => void
}

export type ParentFeedbackPdfResult = {
  blob: Blob
  embeddedImages: number
  skippedImages: number
}

export type ParentFeedbackPdfOptions = {
  onPageRendered?: (dataUrl: string, pageNumber: number) => void
  imageLoader?: (request: ParentPdfImageRequest) => Promise<LoadedFeedbackImage>
  learningReport?: AdminLearningReport
}

export function getAdminLearningReportSections(report: AdminLearningReport) {
  const gender = ({ MALE: '男', FEMALE: '女' } as Record<string, string>)[report.student.gender?.toUpperCase() || ''] || '未填写'
  return [
    {
      title: '学生信息与课程',
      lines: [
        `姓名：${report.student.name}    年级：${report.student.grade || '未填写'}    性别：${gender}`,
        `学校：${report.student.school || '未填写'}    主教师：${report.student.mainTeacher || '未分配'}`,
        `家长：${report.student.parentName || '未填写'}    在读课程：${report.student.courses.join('、') || '暂无在读课程'}`,
      ],
    },
    {
      title: '本期学习概况',
      lines: [
        `统计时间：${report.period.from} 至 ${report.period.to}`,
        `出勤率：${report.overview.attendanceRate === null ? '暂无考勤' : `${report.overview.attendanceRate}%`}    课堂反馈：${report.overview.feedbackCount} 条    涉及学科：${report.overview.subjectCount} 门`,
        `档案登记课时：${report.overview.totalHours} 小时    作业完成率：${report.overview.homeworkDoneRate === null ? '暂无记录' : `${report.overview.homeworkDoneRate}%`}`,
        report.mastery.total ? `试卷知识点掌握：已掌握 ${report.mastery.masteredPct}%、需复习 ${report.mastery.reviewPct}%、薄弱 ${report.mastery.weakPct}%` : '试卷知识点掌握：暂无题目记录',
      ],
    },
    {
      title: '本期成绩记录',
      lines: report.grades.length
        ? report.grades.map((grade) => `${grade.date}  ${grade.subject}  ${grade.assessment}：${grade.score}/${grade.fullScore} 分（得分率 ${grade.percentage}%）`)
        : ['本期暂无成绩记录'],
    },
    {
      title: '当前学习目标与薄弱点',
      lines: [
        ...(report.goals.length ? report.goals.map((goal) => `${goal.subject}：${goal.text}（${goal.achieved ? '已达成' : '进行中'}）`) : ['暂无学习目标']),
        ...(report.weaknesses.length ? report.weaknesses.map((item) => `需关注：${item.topic}（记录 ${item.mistakeCount} 次）${item.suggestion ? `；建议：${item.suggestion}` : ''}`) : ['暂无薄弱点记录']),
      ],
    },
    {
      title: '本期教师阶段小结',
      lines: report.teacherSummaries.length
        ? report.teacherSummaries.flatMap((summary) => [
            `${summary.teacher || '任课教师'} · ${summary.period}`,
            summary.text,
            ...(summary.suggestions ? [`后续建议：${summary.suggestions}`] : []),
            '',
          ])
        : ['本期暂无已发布的阶段小结'],
    },
  ]
}

function subjectRank(subject: string) {
  const index = SUBJECT_ORDER.findIndex((name) => subject.includes(name))
  return index === -1 ? SUBJECT_ORDER.length : index
}

export function groupFeedbackForParentPdf(items: FeedbackArchiveItem[]): ParentFeedbackDay[] {
  const sorted = [...items].sort((left, right) => {
    const dateOrder = right.date.slice(0, 10).localeCompare(left.date.slice(0, 10))
    if (dateOrder) return dateOrder
    const subjectOrder = subjectRank(left.subject) - subjectRank(right.subject)
    if (subjectOrder) return subjectOrder
    const teacherOrder = left.teacher.name.localeCompare(right.teacher.name, 'zh-CN')
    return teacherOrder || left.createdAt.localeCompare(right.createdAt)
  })
  const groups = new Map<string, FeedbackArchiveItem[]>()
  sorted.forEach((item) => {
    const date = item.date.slice(0, 10)
    groups.set(date, [...(groups.get(date) || []), item])
  })

  return [...groups.entries()].map(([date, dayItems]) => ({
    date,
    weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' })
      .format(new Date(`${date}T12:00:00+08:00`)),
    items: dayItems,
  }))
}

export function getParentPdfDetailSections(item: FeedbackArchiveItem): ParentFeedbackSection[] {
  return getParentFeedbackSections(item).filter((section) => !META_SECTION_LABELS.has(section.label))
}

export function getParentPdfImageRequests(item: FeedbackArchiveItem): ParentPdfImageRequest[] {
  return item.images.map((image, imageIndex) => ({
    feedbackId: item.id,
    imageIndex,
    assetId: image.assetId,
  }))
}

function canvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成PDF画布')
  return context
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const lines: string[] = []
  value.split(/\r?\n/).forEach((paragraph) => {
    if (!paragraph) {
      lines.push('')
      return
    }
    let line = ''
    Array.from(paragraph).forEach((character) => {
      const next = line + character
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line)
        line = character
      } else {
        line = next
      }
    })
    if (line) lines.push(line)
  })
  return lines
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value
  let result = value
  while (result && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return result ? `${result}…` : ''
}

function drawCover(context: CanvasRenderingContext2D, archive: FeedbackArchiveResult, learningDays: number, report?: AdminLearningReport) {
  context.fillStyle = COLORS.canvas
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  context.fillStyle = COLORS.primary
  context.fillRect(0, 0, PAGE_WIDTH, 22)

  context.fillStyle = COLORS.primarySoft
  roundedRect(context, 82, 128, 196, 54, 27)
  context.fill()
  context.fillStyle = COLORS.primary
  context.font = '600 25px "Noto Sans SC", "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.fillText('牧哲学堂', 180, 164)

  context.textAlign = 'left'
  context.fillStyle = COLORS.ink
  context.font = '700 64px "Noto Sans SC", "Microsoft YaHei", sans-serif'
  context.fillText(`${archive.student.name}的`, 82, 330)
  context.fillText(report ? '完整学情报告' : '课堂学习反馈', 82, 415)
  context.fillStyle = COLORS.muted
  context.font = '400 30px "Noto Sans SC", "Microsoft YaHei", sans-serif'
  context.fillText(report ? '学习概况、阶段记录与真实课堂反馈。' : '按日期整理每一科老师的真实课堂反馈。', 82, 486)

  context.fillStyle = COLORS.surface
  roundedRect(context, 82, 620, CONTENT_WIDTH, 440, 28)
  context.fill()
  context.strokeStyle = COLORS.border
  context.lineWidth = 2
  context.stroke()

  const firstDate = archive.summary.firstFeedbackDate?.slice(0, 10) || '暂无记录'
  const latestDate = archive.summary.latestFeedbackDate?.slice(0, 10) || '暂无记录'
  const rows = [
    ['年级', archive.student.grade || '未设置'],
    [report ? '报告周期' : '反馈周期', report ? `${report.period.from} 至 ${report.period.to}` : `${firstDate} 至 ${latestDate}`],
    ['学习日', `${learningDays} 天`],
    ['课堂反馈', `${archive.summary.totalCount} 次`],
    ['涉及学科', `${archive.summary.subjectCount} 个`],
    ['任课教师', `${archive.summary.teacherCount} 位`],
  ]
  rows.forEach(([label, value], index) => {
    const rowY = 688 + index * 60
    context.fillStyle = COLORS.subtle
    context.font = '400 25px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.fillText(label, 132, rowY)
    context.fillStyle = COLORS.ink
    context.font = '600 27px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.fillText(value, 350, rowY)
  })

  context.fillStyle = COLORS.subtle
  context.font = '400 22px "Noto Sans SC", "Microsoft YaHei", sans-serif'
  context.fillText(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, 82, PAGE_HEIGHT - 90)
}

async function decodeImageResponse(response: Response) {
  const objectUrl = URL.createObjectURL(await response.blob())
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    return { image, dispose: () => URL.revokeObjectURL(objectUrl) }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function loadFeedbackImage(request: ParentPdfImageRequest): Promise<LoadedFeedbackImage> {
  const urls = [
    ...(request.assetId
      ? [`/api/files/view?id=${encodeURIComponent(request.assetId)}`]
      : []),
    `/api/admin/classroom-feedback/${encodeURIComponent(request.feedbackId)}/image?index=${request.imageIndex}`,
  ]

  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) continue
      return await decodeImageResponse(response)
    } catch {
      // Try the secure legacy-compatible endpoint next.
    }
  }
  throw new Error('图片加载失败')
}

async function loadImagesWithLimit(
  requests: ParentPdfImageRequest[],
  loader: (request: ParentPdfImageRequest) => Promise<LoadedFeedbackImage>,
  limit = 3,
) {
  const results: Array<PromiseSettledResult<LoadedFeedbackImage>> = new Array(requests.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, requests.length) }, async () => {
    while (cursor < requests.length) {
      const index = cursor
      cursor += 1
      try {
        results[index] = { status: 'fulfilled', value: await loader(requests[index]) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  })
  await Promise.all(workers)
  return results
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = COLORS.surfaceSoft
  roundedRect(context, x, y, width, height, 14)
  context.fill()
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const targetWidth = image.naturalWidth * scale
  const targetHeight = image.naturalHeight * scale
  context.save()
  roundedRect(context, x, y, width, height, 14)
  context.clip()
  context.drawImage(
    image,
    x + (width - targetWidth) / 2,
    y + (height - targetHeight) / 2,
    targetWidth,
    targetHeight,
  )
  context.restore()
}

/** Browser-only PDF renderer. Text and preview images are embedded into the file. */
export async function renderParentFeedbackPdf(
  archive: FeedbackArchiveResult,
  options: ParentFeedbackPdfOptions = {},
): Promise<ParentFeedbackPdfResult> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [PAGE_WIDTH, PAGE_HEIGHT],
    hotfixes: ['px_scaling'],
    compress: true,
  })
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const context = canvasContext(canvas)
  const days = groupFeedbackForParentPdf(archive.items)
  let pdfHasPage = false
  let pageOpen = false
  let pageNumber = 0
  let y = 0
  let currentDay: ParentFeedbackDay | null = null
  let pageHeading = '课堂学习反馈'
  let embeddedImages = 0
  let skippedImages = 0

  const commitPage = () => {
    context.fillStyle = COLORS.subtle
    context.font = '400 20px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.fillText(`牧哲学堂 · 第 ${pageNumber} 页`, PAGE_WIDTH / 2, PAGE_HEIGHT - 42)
    const pageImage = canvas.toDataURL('image/jpeg', 0.86)
    options.onPageRendered?.(pageImage, pageNumber)
    if (pdfHasPage) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait')
    pdf.addImage(pageImage, 'JPEG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, 'FAST')
    pdfHasPage = true
    pageOpen = false
  }

  const startContentPage = (day: ParentFeedbackDay | null, continuation = false) => {
    if (pageOpen) commitPage()
    pageNumber += 1
    pageOpen = true
    currentDay = day
    context.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    context.fillStyle = COLORS.canvas
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    context.fillStyle = COLORS.primary
    context.fillRect(0, 0, PAGE_WIDTH, 14)
    context.fillStyle = COLORS.muted
    context.font = '500 21px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.textAlign = 'left'
    context.fillText(`${archive.student.name} · ${pageHeading}`, PAGE_MARGIN, 58)
    y = 92
    if (day) {
      context.fillStyle = COLORS.primarySoft
      roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 68, 16)
      context.fill()
      context.fillStyle = COLORS.ink
      context.font = '700 30px "Noto Sans SC", "Microsoft YaHei", sans-serif'
      context.fillText(
        `${day.date} · ${day.weekday}${continuation ? '（续）' : ''}`,
        PAGE_MARGIN + 24,
        y + 44,
      )
      y += 92
    }
  }

  const ensureSpace = (height: number) => {
    if (y + height <= CONTENT_BOTTOM) return false
    startContentPage(currentDay, true)
    return true
  }

  const drawSubjectHeader = (item: FeedbackArchiveItem, continuation = false) => {
    context.fillStyle = COLORS.surface
    roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 64, 16)
    context.fill()
    context.strokeStyle = COLORS.border
    context.lineWidth = 2
    context.stroke()

    context.fillStyle = COLORS.primary
    roundedRect(context, PAGE_MARGIN + 14, y + 12, 128, 40, 20)
    context.fill()
    context.fillStyle = '#ffffff'
    context.font = '600 23px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.fillText(item.subject.slice(0, 8), PAGE_MARGIN + 78, y + 40)

    context.textAlign = 'left'
    context.fillStyle = COLORS.ink
    context.font = '600 25px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.fillText(
      `${item.teacher.name}老师${continuation ? '（续）' : ''}`,
      PAGE_MARGIN + 164,
      y + 40,
    )
    y += 76
  }

  const continueSubject = (item: FeedbackArchiveItem) => {
    startContentPage(currentDay, true)
    drawSubjectHeader(item, true)
  }

  drawCover(context, archive, days.length, options.learningReport)
  pageNumber = 1
  pageOpen = true
  commitPage()

  if (options.learningReport) {
    pageHeading = '学情概览'
    startContentPage(null)
    for (const section of getAdminLearningReportSections(options.learningReport)) {
      ensureSpace(86)
      context.fillStyle = COLORS.primary
      context.font = '700 31px "Noto Sans SC", "Microsoft YaHei", sans-serif'
      context.fillText(section.title, PAGE_MARGIN, y + 31)
      y += 62
      for (const entry of section.lines) {
        context.font = '400 25px "Noto Sans SC", "Microsoft YaHei", sans-serif'
        const lines = wrapText(context, entry, CONTENT_WIDTH - 28)
        for (const line of lines) {
          ensureSpace(42)
          context.fillStyle = COLORS.ink
          context.font = '400 25px "Noto Sans SC", "Microsoft YaHei", sans-serif'
          context.fillText(line, PAGE_MARGIN + 10, y + 27)
          y += 38
        }
        y += 12
      }
      y += 25
    }
    if (pageOpen) commitPage()
    pageHeading = '课堂学习反馈'
  }

  if (!days.length) {
    startContentPage(null)
    context.fillStyle = COLORS.surface
    roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 180, 20)
    context.fill()
    context.fillStyle = COLORS.muted
    context.font = '400 30px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.fillText('暂时还没有课堂反馈记录', PAGE_WIDTH / 2, y + 105)
  }

  for (const day of days) {
    startContentPage(day)

    const overviewHeight = 62 + day.items.length * 54
    ensureSpace(overviewHeight + 22)
    context.fillStyle = COLORS.surface
    roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, overviewHeight, 18)
    context.fill()
    context.strokeStyle = COLORS.border
    context.lineWidth = 2
    context.stroke()

    context.fillStyle = COLORS.muted
    context.font = '600 20px "Noto Sans SC", "Microsoft YaHei", sans-serif'
    context.fillText('当日学科', PAGE_MARGIN + 24, y + 38)
    context.fillText('任课教师', PAGE_MARGIN + 220, y + 38)
    context.fillText('课堂评价', PAGE_MARGIN + 510, y + 38)
    context.fillText('课堂关键词', PAGE_MARGIN + 710, y + 38)
    day.items.forEach((item, index) => {
      const rowY = y + 64 + index * 54
      if (index > 0) {
        context.strokeStyle = COLORS.border
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(PAGE_MARGIN + 20, rowY - 15)
        context.lineTo(PAGE_MARGIN + CONTENT_WIDTH - 20, rowY - 15)
        context.stroke()
      }
      context.fillStyle = COLORS.primary
      context.font = '600 22px "Noto Sans SC", "Microsoft YaHei", sans-serif'
      context.fillText(item.subject.slice(0, 9), PAGE_MARGIN + 24, rowY)
      context.fillStyle = COLORS.ink
      context.font = '500 22px "Noto Sans SC", "Microsoft YaHei", sans-serif'
      context.fillText(fitText(context, `${item.teacher.name}老师`, 250), PAGE_MARGIN + 220, rowY)
      context.fillText(parentRatingLabel(item.studentRating) || '—', PAGE_MARGIN + 510, rowY)
      context.fillStyle = COLORS.muted
      context.fillText(
        fitText(context, item.tags.slice(0, 3).join('、') || '—', CONTENT_WIDTH - 735),
        PAGE_MARGIN + 710,
        rowY,
      )
    })
    y += overviewHeight + 26

    for (const item of day.items) {
      const detailSections = getParentPdfDetailSections(item)
      const imageRequests = getParentPdfImageRequests(item)
      if (!detailSections.length && !imageRequests.length) continue

      ensureSpace(190)
      drawSubjectHeader(item)

      for (const section of detailSections) {
        context.font = '400 26px "Noto Sans SC", "Microsoft YaHei", sans-serif'
        const lines = wrapText(context, section.content, CONTENT_WIDTH - 56)
        let cursor = 0
        while (cursor < lines.length) {
          let availableLines = Math.floor((CONTENT_BOTTOM - y - 70) / 36)
          if (availableLines < 1) {
            continueSubject(item)
            availableLines = Math.floor((CONTENT_BOTTOM - y - 70) / 36)
          }
          const chunk = lines.slice(cursor, cursor + availableLines)
          const boxHeight = 62 + chunk.length * 36
          context.fillStyle = COLORS.surface
          roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, 14)
          context.fill()
          context.fillStyle = COLORS.primary
          context.font = '600 21px "Noto Sans SC", "Microsoft YaHei", sans-serif'
          context.fillText(
            `${section.label}${cursor ? '（续）' : ''}`,
            PAGE_MARGIN + 24,
            y + 31,
          )
          context.fillStyle = COLORS.ink
          context.font = '400 26px "Noto Sans SC", "Microsoft YaHei", sans-serif'
          chunk.forEach((line, lineIndex) => {
            context.fillText(line, PAGE_MARGIN + 24, y + 68 + lineIndex * 36)
          })
          y += boxHeight + 10
          cursor += chunk.length
        }
      }

      if (imageRequests.length) {
        const imageResults = await loadImagesWithLimit(
          imageRequests,
          options.imageLoader || loadFeedbackImage,
        )
        skippedImages += imageResults.filter((result) => result.status === 'rejected').length
        const loadedImages = imageResults.flatMap((result) => (
          result.status === 'fulfilled' ? [result.value] : []
        ))
        embeddedImages += loadedImages.length

        for (let index = 0; index < loadedImages.length; index += 2) {
          if (ensureSpace(318)) drawSubjectHeader(item, true)
          const row = loadedImages.slice(index, index + 2)
          const gap = 16
          const cardWidth = (CONTENT_WIDTH - gap) / 2
          row.forEach((loaded, rowIndex) => {
            const cardX = PAGE_MARGIN + rowIndex * (cardWidth + gap)
            context.fillStyle = COLORS.surface
            roundedRect(context, cardX, y, cardWidth, 296, 16)
            context.fill()
            context.fillStyle = COLORS.primary
            context.font = '600 19px "Noto Sans SC", "Microsoft YaHei", sans-serif'
            context.fillText(`课堂照片 ${index + rowIndex + 1}`, cardX + 18, y + 31)
            drawImageContain(context, loaded.image, cardX + 16, y + 48, cardWidth - 32, 228)
            loaded.dispose()
          })
          y += 312
        }
      }
      y += 16
    }
  }

  if (pageOpen) commitPage()
  return { blob: pdf.output('blob'), embeddedImages, skippedImages }
}
