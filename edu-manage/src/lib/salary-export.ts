import * as XLSX from 'xlsx'

export type SalaryExportRow = {
  id: string
  type: string
  typeLabel: string
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
  lessonId: string
  feedbackId: string
}

export type SalaryExportInput = {
  teacherName: string
  periodLabel: string
  rangeLabel: string
  exportedAt: Date
  rows: SalaryExportRow[]
}

const TYPE_ORDER = ['LESSON_PAY', 'FEEDBACK_BONUS', 'manual_adjust']

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
  const typeRows = TYPE_ORDER.map((type) => {
    const rows = input.rows.filter((row) => row.type === type)
    return {
      type,
      label: rows[0]?.typeLabel || (type === 'LESSON_PAY' ? '课时薪资' : type === 'FEEDBACK_BONUS' ? '反馈奖励' : '手动调整'),
      count: rows.length,
      amount: sum(rows.map((row) => row.amount)),
    }
  })
  const knownTypes = new Set(TYPE_ORDER)
  const otherRows = input.rows.filter((row) => !knownTypes.has(row.type))
  if (otherRows.length) {
    typeRows.push({ type: 'OTHER', label: '其他调整', count: otherRows.length, amount: sum(otherRows.map((row) => row.amount)) })
  }

  const totalAmount = sum(input.rows.map((row) => row.amount))
  const data: Array<Array<string | number | Date | null>> = [
    [`${input.teacherName}老师薪资流水汇总`, '', '', ''],
    ['统计范围', input.periodLabel, '具体区间', input.rangeLabel],
    ['导出时间', input.exportedAt, '流水总数', input.rows.length],
    [],
    ['汇总项目', '流水笔数', '金额（元）', '金额占比'],
    ...typeRows.map((item) => [item.label, item.count, item.amount, totalAmount === 0 ? 0 : item.amount / totalAmount]),
    ['合计', input.rows.length, totalAmount, 1],
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

function buildDetailSheet(input: SalaryExportInput) {
  const headers = [
    '序号', '计薪日期', '记录时间', '薪资类型', '金额（元）', '课程', '班级', '科目', '课程类型', '年级',
    '上课时间', '课时分钟', '关联学生', '学生人数', '详细说明', '课次ID', '反馈ID', '流水ID',
  ]
  const rows = input.rows.map((row, index) => [
    index + 1,
    row.lessonDate,
    row.createdAt,
    row.typeLabel,
    row.amount,
    row.courseName,
    row.className,
    row.subject,
    row.courseType,
    row.grade,
    row.lessonTime,
    row.lessonMinutes,
    row.studentNames,
    row.studentCount,
    row.description,
    row.lessonId,
    row.feedbackId,
    row.id,
  ])
  const data: Array<Array<string | number | Date | null>> = [
    [`${input.teacherName}老师薪资流水明细`, ...Array(headers.length - 1).fill('')],
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
  sheet['!autofilter'] = { ref: `A4:R${Math.max(4, data.length)}` }
  setColumnWidths(sheet, [8, 18, 20, 14, 14, 20, 20, 12, 14, 10, 18, 12, 28, 12, 48, 24, 24, 24])
  setDateTimeFormat(sheet, 1, 5, data.length)
  setDateTimeFormat(sheet, 2, 5, data.length)
  setCurrencyFormat(sheet, 4, 5, data.length)
  return sheet
}

export function buildSalaryExportWorkbook(input: SalaryExportInput) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, buildSummarySheet(input), '薪资汇总')
  XLSX.utils.book_append_sheet(workbook, buildSubjectSheet(input), '按科目汇总')
  XLSX.utils.book_append_sheet(workbook, buildDetailSheet(input), '流水明细')
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
