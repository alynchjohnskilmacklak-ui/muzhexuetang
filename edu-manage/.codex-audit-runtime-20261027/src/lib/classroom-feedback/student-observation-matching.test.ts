import { describe, expect, it } from 'vitest'
import { splitStudentObservationFragments } from './student-observation-matching'

describe('student observation name matching', () => {
  it('routes unique student mentions and keeps unnamed lesson content shared', () => {
    const result = splitStudentObservationFragments(
      '今天学习一元一次方程。王晨能独立完成移项。李雷需要检查符号。',
      [
        { id: 'student-wang', name: '王晨' },
        { id: 'student-li', name: '李雷' },
      ],
    )

    expect(result.sharedLessonNote).toBe('今天学习一元一次方程')
    expect(result.observationFragments.get('student-wang')).toEqual(['王晨能独立完成移项'])
    expect(result.observationFragments.get('student-li')).toEqual(['李雷需要检查符号'])
  })

  it('matches the longest roster name first when one name prefixes another', () => {
    const result = splitStudentObservationFragments('王晨阳独立解出方程。王晨完成了订正。', [
      { id: 'short', name: '王晨' },
      { id: 'long', name: '王晨阳' },
    ])

    expect(result.observationFragments.get('long')).toEqual(['王晨阳独立解出方程'])
    expect(result.observationFragments.get('short')).toEqual(['王晨完成了订正'])
  })

  it('does not assign a fragment that mentions multiple students to either student', () => {
    const result = splitStudentObservationFragments('王晨和李雷都完成了练习。下一节复习二元一次方程组。', [
      { id: 'wang', name: '王晨' },
      { id: 'li', name: '李雷' },
    ])

    expect(result.observationFragments.size).toBe(0)
    expect(result.sharedLessonNote).toBe('下一节复习二元一次方程组')
  })

  it('treats duplicate roster names as ambiguous instead of choosing the wrong student', () => {
    const result = splitStudentObservationFragments('李明今天主动回答问题。', [
      { id: 'li-a', name: '李明' },
      { id: 'li-b', name: '李明' },
    ])

    expect(result.observationFragments.size).toBe(0)
    expect(result.sharedLessonNote).toBe('')
  })

  it('splits Chinese and English punctuation and avoids duplicate fragments', () => {
    const result = splitStudentObservationFragments('  王晨回答正确，王晨回答正确；王晨补充了理由！今天学习整式。', [
      { id: 'wang', name: '王晨' },
    ])

    expect(result.observationFragments.get('wang')).toEqual(['王晨回答正确', '王晨补充了理由'])
    expect(result.sharedLessonNote).toBe('今天学习整式')
  })
})
