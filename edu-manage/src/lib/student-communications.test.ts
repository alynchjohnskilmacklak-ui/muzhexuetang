import { describe, expect, it } from 'vitest'
import {
  parseStudentCommunicationLogs,
  appendCommunicationLog,
  serializeStudentCommunicationLogs,
  type CommunicationLogEntry,
} from './student-communications'

describe('student-communications', () => {
  it('parses empty or legacy plain string notes gracefully', () => {
    expect(parseStudentCommunicationLogs(null)).toEqual({ logs: [], plainNotes: '' })
    expect(parseStudentCommunicationLogs('')).toEqual({ logs: [], plainNotes: '' })
    expect(parseStudentCommunicationLogs('学员家长希望多关注数学')).toEqual({
      logs: [],
      plainNotes: '学员家长希望多关注数学',
    })
  })

  it('serializes and parses communication logs cleanly', () => {
    const mockLogs: CommunicationLogEntry[] = [
      {
        id: 'c1',
        type: 'PHONE',
        typeName: '电话回访',
        content: '与家长沟通了月考数学成绩',
        operatorName: '胡思同老师',
        createdAt: '2026-11-19T10:00:00.000Z',
      },
    ]

    const serialized = serializeStudentCommunicationLogs(mockLogs, '基础备注信息')
    const parsed = parseStudentCommunicationLogs(serialized)

    expect(parsed.plainNotes).toBe('基础备注信息')
    expect(parsed.logs).toHaveLength(1)
    expect(parsed.logs[0].id).toBe('c1')
    expect(parsed.logs[0].type).toBe('PHONE')
  })

  it('prepends new communication log using appendCommunicationLog', () => {
    const initialRaw = '初始备注'
    const result = appendCommunicationLog(initialRaw, {
      type: 'MEETING',
      typeName: '课后面谈',
      content: '家长放学后来校沟通学习方法',
      operatorName: '教研主管',
      nextFollowUpDate: '2026-11-25',
    })

    expect(result.createdEntry.id).toBeDefined()
    expect(result.createdEntry.type).toBe('MEETING')
    expect(result.createdEntry.content).toBe('家长放学后来校沟通学习方法')

    const reParsed = parseStudentCommunicationLogs(result.newRawNotes)
    expect(reParsed.plainNotes).toBe('初始备注')
    expect(reParsed.logs).toHaveLength(1)
    expect(reParsed.logs[0].operatorName).toBe('教研主管')
  })
})
