import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { writeSalaryExportWorkbook, type SalaryExportInput } from './salary-export'

const input: SalaryExportInput = {
  teacherName: '王老师',
  periodLabel: '本月',
  rangeLabel: '2026-07-01 至 2026-07-18',
  exportedAt: new Date('2026-07-18T10:00:00+08:00'),
  rows: [
    {
      id: 'tx-1', type: 'LESSON_PAY', typeLabel: '课时薪资', amount: 44, description: '初二数学课时薪资',
      lessonDate: new Date('2026-07-10T00:00:00+08:00'), createdAt: new Date('2026-07-10T18:00:00+08:00'),
      courseName: '初二数学', className: '初二数学A班', subject: '数学', courseType: '班课', grade: '初二',
      lessonTime: '18:00-20:00', lessonMinutes: 120, studentNames: '', studentCount: null,
      lessonId: 'lesson-1', feedbackId: '',
    },
    {
      id: 'tx-2', type: 'FEEDBACK_BONUS', typeLabel: '反馈奖励', amount: 1, description: '课堂反馈奖励：有效2人',
      lessonDate: new Date('2026-07-10T00:00:00+08:00'), createdAt: new Date('2026-07-10T20:10:00+08:00'),
      courseName: '初二数学', className: '初二数学A班', subject: '数学', courseType: '班课', grade: '初二',
      lessonTime: '18:00-20:00', lessonMinutes: 120, studentNames: '张三、李四', studentCount: 2,
      lessonId: 'lesson-1', feedbackId: 'feedback-1',
    },
  ],
}

describe('salary export workbook', () => {
  it('contains summary, subject summary, and detailed transaction sheets', () => {
    const buffer = writeSalaryExportWorkbook(input)
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    expect(workbook.SheetNames).toEqual(['薪资汇总', '按科目汇总', '流水明细'])

    const summaryRows = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['薪资汇总'], { header: 1 })
    expect(summaryRows.flat()).toContain('合计')
    expect(summaryRows.flat()).toContain(45)

    const detailRows = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['流水明细'], { header: 1 })
    expect(detailRows[3]).toContain('详细说明')
    expect(detailRows.flat()).toContain('张三、李四')
    expect(detailRows.flat()).toContain('feedback-1')
  })
})
