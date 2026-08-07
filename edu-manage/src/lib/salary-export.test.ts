import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { classifySalaryPayCategory, writeSalaryExportWorkbook, type SalaryExportInput } from './salary-export'

const input: SalaryExportInput = {
  teacherName: '王老师',
  periodLabel: '本月',
  rangeLabel: '2026-07-01 至 2026-07-18',
  exportedAt: new Date('2026-07-18T10:00:00+08:00'),
  rows: [
    {
      id: 'tx-1', type: 'LESSON_PAY', typeLabel: '课时薪资', salaryBucket: 'SMALL_CLASS', amount: 44, description: '初二数学课时薪资',
      lessonDate: new Date('2026-07-10T00:00:00+08:00'), createdAt: new Date('2026-07-10T18:00:00+08:00'),
      courseName: '初二数学', className: '初二数学A班', subject: '数学', courseType: '班课', grade: '初二',
      lessonTime: '18:00-20:00', lessonMinutes: 120, studentNames: '', studentCount: null,
      lessonId: 'lesson-1', feedbackId: '',
    },
    {
      id: 'tx-2', type: 'FEEDBACK_BONUS', typeLabel: '反馈奖励', salaryBucket: 'INTENSIVE', amount: 1, description: '课堂反馈奖励：有效2人',
      lessonDate: new Date('2026-07-10T00:00:00+08:00'), createdAt: new Date('2026-07-10T20:10:00+08:00'),
      courseName: '初二数学', className: '初二数学A班', subject: '数学', courseType: '班课', grade: '初二',
      lessonTime: '18:00-20:00', lessonMinutes: 120, studentNames: '张三、李四', studentCount: 2,
      validFeedbackCount: 2, unitAmount: 0.5,
      lessonId: 'lesson-1', feedbackId: 'feedback-1',
    },
  ],
}

describe('salary export workbook', () => {
  it('contains summary, subject summary, and detailed transaction sheets', () => {
    const buffer = writeSalaryExportWorkbook(input)
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    expect(workbook.SheetNames).toEqual(['工资总览', '小班课时明细', '小班反馈明细', '个性化课时明细', '个性化反馈明细', '管理调整明细', '按科目汇总', '全部流水审计'])

    const summaryRows = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['工资总览'], { header: 1 })
    expect(summaryRows.flat()).toContain('合计')
    expect(summaryRows.flat()).toContain(45)
    expect(summaryRows.flat()).toContain('小班课课时工资')
    expect(summaryRows.flat()).toContain('个性化课程反馈奖励')

    const detailRows = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['全部流水审计'], { header: 1 })
    expect(detailRows[3]).toContain('详细说明')
    expect(detailRows[3]).toContain('工资分类')
    expect(detailRows.flat()).toContain('张三、李四')
    expect(detailRows.flat()).toContain('feedback-1')
    expect(detailRows[3]).toContain('有效反馈数')
    expect(detailRows[3]).toContain('计薪小时')
  })

  it('separates lesson, feedback, intensive and management transactions', () => {
    expect(classifySalaryPayCategory({ type: 'LESSON_PAY', salaryBucket: 'SMALL_CLASS' })).toBe('SMALL_CLASS_LESSON')
    expect(classifySalaryPayCategory({ type: 'FEEDBACK_BONUS', salaryBucket: 'SMALL_CLASS' })).toBe('SMALL_CLASS_FEEDBACK')
    expect(classifySalaryPayCategory({ type: 'LESSON_PAY_ADJUSTMENT', salaryBucket: 'INTENSIVE' })).toBe('INTENSIVE_LESSON')
    expect(classifySalaryPayCategory({ type: 'FEEDBACK_BONUS', salaryBucket: 'INTENSIVE' })).toBe('INTENSIVE_FEEDBACK')
    expect(classifySalaryPayCategory({ type: 'manual_adjust', salaryBucket: 'SMALL_CLASS' })).toBe('MANAGEMENT_ADJUSTMENT')
  })
})
