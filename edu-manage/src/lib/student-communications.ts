/**
 * 学员家校沟通与回访台账领域模型与解析服务
 */

export type CommunicationLogType =
  | 'PHONE'
  | 'MEETING'
  | 'WECHAT'
  | 'RENEWAL'
  | 'COMPLAINT'
  | 'OTHER'

export interface CommunicationLogEntry {
  id: string
  type: CommunicationLogType
  typeName: string
  content: string
  operatorName: string
  nextFollowUpDate?: string | null
  createdAt: string
  source?: 'MANUAL_LOG' | 'PARENT_MESSAGE'
}

export const COMMUNICATION_TYPE_META: Record<CommunicationLogType, { label: string; color: string; bg: string }> = {
  PHONE: { label: '电话回访', color: '#14574D', bg: '#E8F2F0' },
  MEETING: { label: '课后面谈', color: '#2B4E8C', bg: '#EBF1FA' },
  WECHAT: { label: '微信沟通', color: '#1E8E3E', bg: '#EAF7EE' },
  RENEWAL: { label: '续费跟进', color: '#A5823C', bg: '#FEF8E8' },
  COMPLAINT: { label: '异常安抚', color: '#E03E2D', bg: '#FEECEC' },
  OTHER: { label: '日常沟通', color: '#5A4E3A', bg: '#F3EFEA' },
}

const LOG_STORAGE_PREFIX = '__MZ_COMM_LOGS__:'

export function parseStudentCommunicationLogs(rawNotes?: string | null): {
  logs: CommunicationLogEntry[]
  plainNotes: string
} {
  if (!rawNotes || !rawNotes.trim()) {
    return { logs: [], plainNotes: '' }
  }

  const trimmed = rawNotes.trim()
  if (trimmed.startsWith(LOG_STORAGE_PREFIX)) {
    try {
      const payload = JSON.parse(trimmed.slice(LOG_STORAGE_PREFIX.length))
      return {
        logs: Array.isArray(payload.logs) ? payload.logs : [],
        plainNotes: String(payload.plainNotes || ''),
      }
    } catch {
      // 容错处理
      return { logs: [], plainNotes: trimmed }
    }
  }

  // 原有非结构化文本作为纯备注返回
  return { logs: [], plainNotes: trimmed }
}

export function serializeStudentCommunicationLogs(
  logs: CommunicationLogEntry[],
  plainNotes: string = '',
): string {
  return `${LOG_STORAGE_PREFIX}${JSON.stringify({ logs, plainNotes })}`
}

export function appendCommunicationLog(
  rawNotes: string | null | undefined,
  entry: Omit<CommunicationLogEntry, 'id' | 'createdAt'>,
): { newRawNotes: string; createdEntry: CommunicationLogEntry } {
  const { logs, plainNotes } = parseStudentCommunicationLogs(rawNotes)
  const createdEntry: CommunicationLogEntry = {
    ...entry,
    id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    source: 'MANUAL_LOG',
  }

  const updatedLogs = [createdEntry, ...logs]
  return {
    newRawNotes: serializeStudentCommunicationLogs(updatedLogs, plainNotes),
    createdEntry,
  }
}
