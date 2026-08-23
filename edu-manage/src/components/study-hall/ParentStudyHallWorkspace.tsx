'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, DatePicker, Empty, Image, Space, Tag, Typography, theme } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, EyeOutlined, ReadOutlined, TeamOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'
import { LearningRecordSwitcher } from '@/components/Parent/LearningRecordSwitcher'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { ResponsiveDialog } from '@/components/Common/ResponsiveDialog'
import { protectedUploadFallback } from '@/lib/upload-url'
import { groupByRelativeDate } from '@/lib/date/group-relative'

const { Title, Text, Paragraph } = Typography
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '加载失败')
  return payload
}

type Entry = {
  id: string; studentId: string; homeworkStatus: string; homeworkItems: string[]; teacherComment?: string | null
  imageUrls: string[]; checkedIn: boolean; checkInAt?: string | null; checkOutAt?: string | null
  attendanceStatus?: 'PRESENT' | 'PERSONAL_LEAVE' | 'ABSENT' | 'UNRECORDED'
  contentType?: 'HOMEWORK' | 'LESSON'; beforeImageUrls?: string[]; afterImageUrls?: string[]; lessonImageUrls?: string[]
  session?: { label: string; startTime: string; endTime: string } | null
  classRecord: { studyDate: string; recordedBy: { name: string }; studyClass: { id: string; name: string; scheduleType: string } }
}
type ParentData = {
  students: Array<{ id: string; name: string; grade?: string | null }>
  memberships: Array<{ id: string; status: string; studentId: string; studyClass: { id: string; name: string } }>
  entries: Entry[]
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: '已完成', color: 'success' }, PARTIAL: { label: '部分完成', color: 'warning' },
  NEEDS_FOLLOW_UP: { label: '需要跟进', color: 'error' }, NOT_RECORDED: { label: '暂未登记', color: 'default' },
}

export function ParentStudyHallWorkspace() {
  const isMobile = useIsMobile()
  const { token } = theme.useToken()
  const searchParams = useSearchParams()
  const highlightedEntryId = searchParams.get('entryId')
  const initialDate = searchParams.get('date')
  const [date, setDate] = useState(initialDate && dayjs(initialDate).isValid() ? dayjs(initialDate) : null)
  const [studentId, setStudentId] = useState<string>()
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(highlightedEntryId)
  const { data, error, isLoading } = useSWR<ParentData>('/api/parent/study-hall', fetcher, {
    refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true,
  })
  useEffect(() => {
    if (!highlightedEntryId) return
    setSelectedEntryId(highlightedEntryId)
    fetch('/api/parent/study-hall', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: highlightedEntryId }) }).catch(() => undefined)
  }, [highlightedEntryId])
  const entries = useMemo(() => (data?.entries || []).filter((entry) =>
    (!studentId || entry.studentId === studentId)
    && (!date || dayjs(entry.classRecord.studyDate).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')),
  ), [data, studentId, date])
  const entryGroups = useMemo(
    () => groupByRelativeDate(entries, entry => entry.classRecord.studyDate, 'today-week-earlier'),
    [entries],
  )
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || data?.entries.find((entry) => entry.id === selectedEntryId) || null
  const selectedStudent = data?.students.find((item) => item.id === selectedEntry?.studentId)
  const imageKeys = useMemo(() => selectedEntry ? [
    ...(selectedEntry.beforeImageUrls || []), ...(selectedEntry.afterImageUrls || []), ...(selectedEntry.lessonImageUrls || []), ...selectedEntry.imageUrls,
  ] : [], [selectedEntry])
  const { urlMap } = useSignedUrls(imageKeys)

  return <div style={{ width: '100%', maxWidth: '100%' }}>
    <LearningRecordSwitcher />
    <div style={{ marginBottom: 16 }}>
      <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>晚托作业</Title>
      <Text type="secondary">查看晚托作业班的到勤、作业完成情况、老师说明和照片；小班课与周末课请查看“课堂反馈”。</Text>
    </div>
    {error && <Alert type="error" showIcon message={error.message || '作业班记录加载失败'} style={{ marginBottom: 12 }} />}
    <div className="parent-record-filters">
      <div className="parent-record-segmented" role="group" aria-label="选择学员">
        <button type="button" aria-pressed={!studentId} onClick={() => setStudentId(undefined)}>全部</button>
        {(data?.students || []).map(student => <button type="button" key={student.id} aria-pressed={studentId === student.id} onClick={() => setStudentId(student.id)}>{student.name}</button>)}
      </div>
      <div className="parent-record-filter-row">
        <DatePicker inputReadOnly={Boolean(isMobile)} allowClear value={date} onChange={setDate} placeholder="全部日期" format="M月D日" className="parent-record-date-picker" />
      </div>
    </div>
    {!isLoading && (data?.memberships.length || 0) > 0 && (data?.entries.length || 0) === 0 && <Alert
      type="info"
      showIcon
      message={`孩子已加入 ${data?.memberships.length || 0} 个作业班`}
      description="老师完成当天登记后，这里会显示到勤、作业完成情况、前后照片或课堂讲解内容，并同步发送通知。"
      style={{ marginBottom: 14 }}
    />}
    <Card loading={isLoading} styles={{ body: { padding: isMobile ? 12 : 20 } }}>
      {entries.length === 0 ? <Empty description={<Space direction="vertical" size={5}>
        <Text strong>{(data?.memberships.length || 0) === 0 ? '孩子暂未加入晚托或周末作业班' : (studentId || date) ? '所选条件下还没有记录' : '老师暂未登记作业班记录'}</Text>
        <Text type="secondary">{(data?.memberships.length || 0) === 0 ? '如已经报名，请联系教务确认班级名单。' : (studentId || date) ? '可以清除孩子或日期筛选，查看其他记录。' : '登记后会显示到勤、任务完成情况和过程照片。'}</Text>
      </Space>} /> : <div className="parent-record-groups">
        {entryGroups.map(group => <section key={group.key} className="parent-record-group">
          <div className="parent-record-divider">{group.label}</div>
          <div className="parent-record-list">{group.items.map((entry) => {
          const student = data?.students.find((item) => item.id === entry.studentId)
          const meta = STATUS_META[entry.homeworkStatus] || STATUS_META.NOT_RECORDED
          const highlighted = highlightedEntryId === entry.id
          const photoCount = new Set([...(entry.beforeImageUrls || []), ...(entry.afterImageUrls || []), ...(entry.lessonImageUrls || []), ...entry.imageUrls]).size
          const attendance = entry.attendanceStatus === 'PERSONAL_LEAVE' ? '个人请假' : entry.attendanceStatus === 'ABSENT' ? '缺勤' : entry.checkedIn ? `到勤${entry.checkInAt ? ` ${dayjs(entry.checkInAt).format('HH:mm')}` : ''}` : '暂未登记到勤'
          const note = entry.teacherComment ? `老师说明：${entry.teacherComment}` : entry.homeworkItems.length ? `已登记 ${entry.homeworkItems.length} 项内容` : '老师已完成本次登记'
          return <article key={entry.id} className={`study-hall-parent-entry${highlighted ? ' is-highlighted' : ''}`}>
            <div className="study-hall-entry-top">
              <Text strong title={`${student?.name || '学员'} · ${entry.classRecord.studyClass.name}`}>{student?.name || '学员'} · {entry.classRecord.studyClass.name}</Text>
              <span className={`study-hall-entry-status is-${entry.homeworkStatus.toLowerCase()}`}>{meta.label}</span>
            </div>
            <div className="study-hall-entry-meta">
              <span><ClockCircleOutlined /> {dayjs(entry.classRecord.studyDate).format('M月D日 ddd')}</span>
              <span><CheckCircleOutlined /> {attendance}</span>
              {entry.session && <span><TeamOutlined /> {entry.session.label}</span>}
            </div>
            <div className="study-hall-entry-note" title={note}>{note}</div>
            <div className="study-hall-entry-foot">
              <span title={`登记教师：${entry.classRecord.recordedBy.name}`}>登记教师：{entry.classRecord.recordedBy.name}{photoCount ? ` · ${photoCount}张照片` : ''}</span>
              <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedEntryId(entry.id)}>查看</Button>
            </div>
          </article>
        })}</div>
        </section>)}
      </div>}
    </Card>
    <ResponsiveDialog open={Boolean(selectedEntry)} title={`${selectedStudent?.name || '学员'} · ${selectedEntry?.classRecord.studyClass.name || '晚托作业'}`} onClose={() => setSelectedEntryId(null)} footer={null} width={680} mobileHeight="92dvh" bodyStyle={{ padding: isMobile ? 14 : 20 }}>
      {selectedEntry && <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={(STATUS_META[selectedEntry.homeworkStatus] || STATUS_META.NOT_RECORDED).color}>{(STATUS_META[selectedEntry.homeworkStatus] || STATUS_META.NOT_RECORDED).label}</Tag>
          <Text type="secondary"><ClockCircleOutlined /> {dayjs(selectedEntry.classRecord.studyDate).format('YYYY年M月D日')}</Text>
          <Text type="secondary"><CheckCircleOutlined /> {selectedEntry.checkedIn ? '已到勤' : selectedEntry.attendanceStatus === 'PERSONAL_LEAVE' ? '个人请假' : selectedEntry.attendanceStatus === 'ABSENT' ? '缺勤' : '暂未登记'}</Text>
        </Space>
        {selectedEntry.homeworkItems.length > 0 && <div style={{ padding: '12px 14px', borderRadius: token.borderRadius, background: token.colorFillAlter }}><Text strong><ReadOutlined /> {selectedEntry.contentType === 'LESSON' ? '课堂讲解内容' : '今日作业'}</Text><ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>{selectedEntry.homeworkItems.map((item, index) => <li key={`${item}-${index}`}><Text>{item}</Text></li>)}</ul></div>}
        {selectedEntry.teacherComment && <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}><Text strong>老师说明：</Text>{selectedEntry.teacherComment}</Paragraph>}
        {[
          ...(selectedEntry.contentType === 'LESSON' ? [{ label: '课堂讲解照片', urls: selectedEntry.lessonImageUrls?.length ? selectedEntry.lessonImageUrls : selectedEntry.imageUrls }] : [
            { label: '作业开始前', urls: selectedEntry.beforeImageUrls || [] },
            { label: '作业完成后', urls: selectedEntry.afterImageUrls?.length ? selectedEntry.afterImageUrls : selectedEntry.imageUrls },
          ]),
        ].map((group) => group.urls.length > 0 && <div key={group.label}><Text strong>{group.label}</Text><Image.PreviewGroup><div className="study-hall-photo-grid">{group.urls.map((url) => <Image key={url} src={urlMap[url] || protectedUploadFallback(url)} width="100%" height={isMobile ? 108 : 132} style={{ objectFit: 'cover', borderRadius: token.borderRadius }} alt={`${selectedStudent?.name || '学员'}${group.label}`} />)}</div></Image.PreviewGroup></div>)}
        {!new Set([...(selectedEntry.beforeImageUrls || []), ...(selectedEntry.afterImageUrls || []), ...(selectedEntry.lessonImageUrls || []), ...selectedEntry.imageUrls]).size && <Alert type="info" showIcon message="老师本次没有上传照片" description="文字反馈和登记信息仍可正常查看。" />}
        <Text type="secondary" style={{ fontSize: 12 }}>登记教师：{selectedEntry.classRecord.recordedBy.name}</Text>
      </Space>}
    </ResponsiveDialog>
  </div>
}
