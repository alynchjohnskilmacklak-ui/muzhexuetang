import * as XLSX from 'xlsx'
import { salaryBucketLabel, type SalaryBucket } from './salary-bucket'

export type SalaryExportRow = {
  id: string
  type: string
  typeLabel: string
  salaryBucket: SalaryBucket
  payCategory?: SalaryPayCategory
  amount: number
  description: string
  lessonDate: Date | null
  createdAt: Date
  courseName: string
  className: string
  subject: string
  courseType: string
  grade: string
  lessonTime: string
  lessonMinutes: number | null
  studentNames: string
  studentCount: number | null
  validFeedbackCount?: number | null
  unitAmount?: number | null
  lessonId: string
  feedbackId: string
}

export type SalaryPayCategory =
  | 'SMALL_CLASS_LESSON'
  | 'SMALL_CLASS_FEEDBACK'
  | 'INTENSIVE_LESSON'
  | 'INTENSIVE_FEEDBACK'
  | 'MANAGEMENT_ADJUSTMENT'

const PAY_CATEGORY_ORDER: SalaryPayCategory[] = [
  'SMALL_CLASS_LESSON',
  'SMALL_CLASS_FEEDBACK',
  'INTENSIVE_LESSON',
  'INTENSIVE_FEEDBACK',
  'MANAGEMENT_ADJUSTMENT',
]

export function classifySalaryPayCategory(row: Pick<SalaryExportRow, 'type' | 'salaryBucket'>): SalaryPayCategory {
  if (row.type === 'FEEDBACK_BONUS') {
    return row.salaryBucket === 'INTENSIVE' ? 'INTENSIVE_FEEDBACK' : 'SMALL_CLASS_FEEDBACK'
  }
  if (row.type === 'LESSON_PAY' || row.type === 'LESSON_PAY_ADJUSTMENT') {
    return row.salaryBucket === 'INTENSIVE' ? 'INTENSIVE_LESSON' : 'SMALL_CLASS_LESSON'
  }
  return 'MANAGEMENT_ADJUSTMENT'
}

export function salaryPayCategoryLabel(category: SalaryPayCategory) {
  return {
    SMALL_CLASS_LESSON: '小班课课时工资',
    SMALL_CLASS_FEEDBACK: '小班课反馈奖励',
    INTENSIVE_LESSON: '个性化课程课时工资',
    INTENSIVE_FEEDBACK: '个性化课程反馈奖励',
    MANAGEMENT_ADJUSTMENT: '管理调整工资',
  }[category]
}

function categoryOf(row: SalaryExportRow) {
  return row.payCategory || classifySalaryPayCategory(row)
}

export function dedupeSalaryExportRows(rows: SalaryExportRow[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

export type SalaryExportInput = {
  teacherName: string
  periodLabel: string
  rangeLabel: string
  exportedAt: Date
  rows: SalaryExportRow[]
}

function sum(values: number[]) {
  return Number(values.reduce((total, value) => total + value, 0).toFixed(2))
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet['!cols'] = widths.map((wch) => ({ wch }))
}

function setCurrencyFormat(sheet: XLSX.WorkSheet, columnIndex: number, startRow: number, endRow: number) {
  for (let row = startRow; row <= endRow; row += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row - 1, c: columnIndex })]
    if (cell) cell.z = '¥#,##0.00;[Red]-¥#,##0.00'
  }
}

function setDateTimeFormat(sheet: XLSX.WorkSheet, columnIndex: number, startRow: number, endRow: number) {
  for (let row = startRow; row <= endRow; row += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row - 1, c: columnIndex })]
    if (cell?.t === 'd') cell.z = 'yyyy-mm-dd hh:mm'
  }
}

function buildSummarySheet(input: SalaryExportInput) {
  const rows = dedupeSalaryExportRows(input.rows)
  const typeRows = PAY_CATEGORY_ORDER.map((category) => {
    const categoryRows = rows.filter((row) => categoryOf(row) === category)
    const lessonHours = category.endsWith('_LESSON')
      ? sum(categoryRows.map((row) => Number(row.lessonMinutes || 0) / 60))
      : 0
    const validFeedbackCount = category.endsWith('_FEEDBACK')
      ? sum(categoryRows.map((row) => Number(row.validFeedbackCount ?? row.studentCount ?? 0)))
      : 0
    return {
      type: category,
      label: salaryPayCategoryLabel(category),
      count: categoryRows.length,
      quantity: category.endsWith('_LESSON') ? `${lessonHours}小时` : category.endsWith('_FEEDBACK') ? `${validFeedbackCount}次有效反馈` : `${categoryRows.length}笔`,
      amount: sum(categoryRows.map((row) => row.amount)),
    }
  })

  const totalAmount = sum(rows.map((row) => row.amount))
  const data: Array<Array<string | number | Date | null>> = [
    [`${input.teacherName}老师薪资流水汇总`, '', '', ''],
    ['统计范围', input.periodLabel, '具体区间', input.rangeLabel],
    ['导出时间', input.exportedAt, '去重后流水总数', rows.length],
    [],
    ['汇总项目', '核对数量', '金额（元）', '金额占比'],
    ...typeRows.map((item) => [item.label, item.quantity, item.amount, totalAmount === 0 ? 0 : item.amount / totalAmount]),
    ['合计', `${rows.length}笔流水`, totalAmount, 1],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(data, { cellDates: true })
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }]
  sheet['!autofilter'] = { ref: `A5:D${data.length}` }
  setColumnWidths(sheet, [22, 16, 18, 16])
  setDateTimeFormat(sheet, 1, 3, 3)
  setCurrencyFormat(sheet, 2, 6, data.length)
  for (let row = 6; row <= data.length; row += 1) {
    const cell = sheet[`D${row}`]
    if (cell) cell.z = '0.00%'
  }
  return sheet
}

function buildSubjectSheet(input: SalaryExportInput) {
  const grouped = new Map<string, { lessonCount: number; feedbackCount: number; adjustmentCount: number; amount: number }>()
  for (const row of input.rows) {
    const subject = row.subject || '其他/未标注'
    const current = grouped.get(subject) || { lessonCount: 0, feedbackCount: 0, adjustmentCount: 0, amount: 0 }
    if (row.type === 'LESSON_PAY') current.lessonCount += 1
    else if (row.type === 'FEEDBACK_BONUS') current.feedbackCount += 1
    else current.adjustmentCount += 1
    current.amount += row.amount
    grouped.set(subject, current)
  }

  const rows = [...grouped.entries()]
    .map(([subject, value]) => [subject, value.lessonCount, value.feedbackCount, value.adjustmentCount, Number(value.amount.toFixed(2))])
    .sort((a, b) => Number(b[4]) - Number(a[4]))
  const data: Array<Array<string | number>> = [
    [`${input.teacherName}老师按科目汇总`, '', '', '', ''],
    ['科目', '课时薪资笔数', '反馈奖励笔数', '调整笔数', '金额合计（元）'],
    ...rows,
    ['合计', sum(rows.map((row) => Number(row[1]))), sum(rows.map((row) => Number(row[2]))), sum(rows.map((row) => Number(row[3]))), sum(rows.map((row) => Number(row[4])))],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(data)
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }]
  sheet['!autofilter'] = { ref: `A2:E${Math.max(2, data.length)}` }
  setColumnWidths(sheet, [20, 16, 16, 14, 18])
  setCurrencyFormat(sheet, 4, 3, data.length)
  return sheet
}

function buildDetailSheet(input: SalaryExportInput, category?: SalaryPayCategory) {
  const sourceRows = dedupeSalaryExportRows(input.rows)
    .filter((row) => !category || categoryOf(row) === category)
  const headers = [
    '序号', '计薪日期', '记录时间', '工资分类', '工资归属', '流水类型', '金额（元）', '课程', '班级', '科目', '课程类型', '年级',
    '上课时间', '计薪分钟', '计薪小时', '关联学生', '有效反馈数', '单价（元）', '详细说明', '课次ID', '反馈ID', '流水ID',
  ]
  const rows = sourceRows.map((row, index) => [
    index + 1,
    row.lessonDate,
    row.createdAt,
    salaryPayCategoryLabel(categoryOf(row)),
    salaryBucketLabel(row.salaryBucket),
    row.typeLabel,
    row.amount,
    row.courseName,
    row.className,
    row.subject,
    row.courseType,
    row.grade,
    row.lessonTime,
    row.lessonMinutes,
    row.lessonMinutes ? Number((row.lessonMinutes / 60).toFixed(2)) : null,
    row.studentNames,
    row.validFeedbackCount ?? row.studentCount,
    row.unitAmount,
    row.description,
    row.lessonId,
    row.feedbackId,
    row.id,
  ])
  const data: Array<Array<string | number | Date | null>> = [
    [`${input.teacherName}老师${category ? salaryPayCategoryLabel(category) : '全部薪资'}明细`, ...Array(headers.length - 1).fill('')],
    [`统计范围：${input.periodLabel}（${input.rangeLabel}）`, ...Array(headers.length - 1).fill('')],
    [],
    headers,
    ...rows,
  ]
  const sheet = XLSX.utils.aoa_to_sheet(data, { cellDates: true })
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ]
  sheet['!autofilter'] = { ref: `A4:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(4, data.length)}` }
  setColumnWidths(sheet, [8, 18, 20, 24, 18, 18, 14, 20, 20, 12, 14, 10, 18, 12, 12, 28, 14, 12, 54, 24, 24, 24])
  setDateTimeFormat(sheet, 1, 5, data.length)
  setDateTimeFormat(sheet, 2, 5, data.length)
  setCurrencyFormat(sheet, 6, 5, data.length)
  setCurrencyFormat(sheet, 17, 5, data.length)
  return sheet
}

export function buildSalaryExportWorkbook(input: SalaryExportInput) {
  const cleanInput = { ...input, rows: dedupeSalaryExportRows(input.rows) }
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, buildSummarySheet(cleanInput), '工资总览')
  XLSX.utils.book_append_sheet(workbook, buildDetailSheet(cleanInput, 'SMALL_CLASS_LESSON'), '小班课时明细')
  XLSX.utils.book_append_sheet(workbook, buildDetailSheet(cleanInput, 'SMALL_CLASS_FEEDBACK'), '小班反馈明细')
  XLSX.utils.book_append_sheet(workbook, buildDetailSheet(cleanInput, 'INTENSIVE_LESSON'), '个性化课时明细')
  XLSX.utils.book_append_sheet(workbook, buildDetailSheet(cleanInput, 'INTENSIVE_FEEDBACK'), '个性化反馈明细')
  XLSX.utils.book_append_sheet(workbook, buildDetailSheet(cleanInput, 'MANAGEMENT_ADJUSTMENT'), '管理调整明细')
  XLSX.utils.book_append_sheet(workbook, buildSubjectSheet(cleanInput), '按科目汇总')
  XLSX.utils.book_append_sheet(workbook, buildDetailSheet(cleanInput), '全部流水审计')
  workbook.Props = {
    Title: `${input.teacherName}老师薪资流水`,
    Subject: `${input.periodLabel}薪资汇总及明细`,
    Author: '牧哲学堂教育管理系统',
    CreatedDate: input.exportedAt,
  }
  return workbook
}

export function writeSalaryExportWorkbook(input: SalaryExportInput): Buffer {
  return XLSX.write(buildSalaryExportWorkbook(input), { type: 'buffer', bookType: 'xlsx', cellDates: true })
}
