import { describe, expect, it } from 'vitest'
import { classifySalaryBucket, salaryBucketLabel } from './salary-bucket'

describe('salary bucket', () => {
  it('uses lesson and feedback relations as intensive evidence', () => {
    expect(classifySalaryBucket({ lessonIsIntensive: true })).toBe('INTENSIVE')
    expect(classifySalaryBucket({ feedbackIsIntensive: true })).toBe('INTENSIVE')
  })

  it('keeps historical manual intensive adjustments classifiable', () => {
    expect(classifySalaryBucket({ description: '一对二课程补发工资' })).toBe('INTENSIVE')
  })

  it('defaults unrelated transactions to small class', () => {
    expect(classifySalaryBucket({ description: '月度小班课补贴' })).toBe('SMALL_CLASS')
    expect(salaryBucketLabel('SMALL_CLASS')).toBe('小班课薪资')
    expect(salaryBucketLabel('INTENSIVE')).toBe('一对一/二/三薪资')
  })
})
