'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Card, Checkbox, Col, Drawer, Form, Input, message, Popconfirm, Radio, Row,
  Divider, Select, Space, Statistic, Table, Tabs, Tag, Typography,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const { TextArea } = Input

interface StudentItem {
  id: string
  name: string
  grade: string
  parentName: string | null
  wxBound: boolean
  roomId: string | null
  roomName: string
}

interface AcademicTermOption {
  id: string
  name: string
  status: string
}

interface NotificationRecord {
  id: string
  title: string
  content: string
  type: string
  pushStatus: string
  attempts: number
  lastError?: string | null
  pushError?: string | null
  qywxMsgId?: string | null
  createdAt: string
  student?: { name?: string } | null
}

interface ParentDispatchResult {
  notificationIds: string[]
  status: string
  error?: string
}

interface ImmediateDispatchSummary {
  results: ParentDispatchResult[]
  remainingNotificationIds: string[]
  error?: string
}

interface QywxStaffItem {
  id: string
  name: string
  role: string
  qywxUserId: string | null
}

interface ParentBindData {
  parents: Array<{
    id: string
    name: string
    phone: string | null
    children: string[]
    qywxExternalUserId: string | null
    qywxSenderUserId: string | null
  }>
  contacts: Array<{ external_userid: string; name: string; member: string }>
  staff: QywxStaffItem[]
  matchedStaffCount: number
  wecomError: string | null
}

export function NotificationsTab({ embedded = false }: { embedded?: boolean } = {}) {
  const isMobile = useIsMobile() ?? false
  const [students, setStudents] = useState<StudentItem[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [terms, setTerms] = useState<AcademicTermOption[]>([])
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedTermName, setSelectedTermName] = useState('')
  const [termLoading, setTermLoading] = useState(true)
  const [studentListLoading, setStudentListLoading] = useState(false)
  const [studentListError, setStudentListError] = useState('')
  const [termSwitching, setTermSwitching] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [gradeFilter, setGradeFilter] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [stats, setStats] = useState({ todaySent: 0, totalSent: 0, totalFailed: 0 })
  const [records, setRecords] = useState<NotificationRecord[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [sending, setSending] = useState(false)
  const [dispatchingRecordIds, setDispatchingRecordIds] = useState<string[]>([])
  const [testingParentMass, setTestingParentMass] = useState(false)
  const [form] = Form.useForm()
  const [pushType, setPushType] = useState<string>('system')
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: NotificationRecord | null }>({ open: false, record: null })
  const [bindOpen, setBindOpen] = useState(false)
  const [bindData, setBindData] = useState<ParentBindData>({ parents: [], contacts: [], staff: [], matchedStaffCount: 0, wecomError: null })
  const [bindLoading, setBindLoading] = useState(false)
  const [bindLoadError, setBindLoadError] = useState<string | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string>()
  const [staffQywxUserId, setStaffQywxUserId] = useState('')
  const [staffBindingId, setStaffBindingId] = useState<string | null>(null)
  const [parentBindingId, setParentBindingId] = useState<string | null>(null)
  const [parentUnbindingId, setParentUnbindingId] = useState<string | null>(null)
  const [parentSelections, setParentSelections] = useState<Record<string, { externalUserId: string; senderUserId: string }>>({})
  const qywxBlockedIp = bindData.wecomError?.match(/from ip:\s*([\d.]+)/i)?.[1] || null
  const qywxIpBlocked = Boolean(bindData.wecomError && (/60020|not allow to access from your ip/i.test(bindData.wecomError)))

  const closeBindDrawer = () => {
    setBindOpen(false)
    setParentSelections({})
  }

  const openBindDrawer = async () => {
    setBindOpen(true)
    setBindLoading(true)
    setBindLoadError(null)
    try {
      const res = await fetch('/api/qywx/bind-management')
      const data = await res.json() as Partial<ParentBindData> & { error?: string }
      if (!res.ok) {
        setBindLoadError(data.error || '加载绑定信息失败')
        setBindData({ parents: [], contacts: [], staff: [], matchedStaffCount: 0, wecomError: null })
        return
      }
      setBindData({
        parents: data.parents || [],
        contacts: data.contacts || [],
        staff: data.staff || [],
        matchedStaffCount: data.matchedStaffCount || 0,
        wecomError: data.wecomError || null,
      })
    } catch { setBindLoadError('连接服务器失败，请检查网络后重试') } finally { setBindLoading(false) }
  }

  const handleStaffBind = async () => {
    const qywxUserId = staffQywxUserId.trim()
    if (!selectedStaffId || !qywxUserId) {
      message.warning('请选择系统员工并填写企微成员 ID')
      return
    }
    setStaffBindingId(selectedStaffId)
    try {
      const res = await fetch('/api/qywx/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedStaffId, qywxUserId }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) throw new Error(data.error || '员工身份绑定失败')
      message.success('企微员工身份已关联')
      setSelectedStaffId(undefined)
      setStaffQywxUserId('')
      await openBindDrawer()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '员工身份绑定失败')
    } finally {
      setStaffBindingId(null)
    }
  }

  const handleBind = async (userId: string, externalUserId: string, senderUserId: string) => {
    setParentBindingId(userId)
    try {
      const res = await fetch('/api/qywx/bind-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, externalUserId, senderUserId }),
      })
      if (res.ok) {
        message.success('家长企微联系人已确认绑定')
        setParentSelections((current) => {
          const next = { ...current }
          delete next[userId]
          return next
        })
        await openBindDrawer()
        void fetchStudents(selectedTermId).catch((error) => {
          message.error(error instanceof Error ? error.message : '学员名单刷新失败')
        })
      }
      else {
        const data = await res.json().catch(() => null)
        message.error(data?.error || '绑定失败')
      }
    } catch {
      message.error('绑定失败，请检查网络后重试')
    } finally { setParentBindingId(null) }
  }

  const handleParentUnbind = async (userId: string) => {
    setParentUnbindingId(userId)
    try {
      const res = await fetch(`/api/qywx/bind-management?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) throw new Error(data.error || '取消绑定失败')
      message.success('已取消该家长的企微绑定')
      setParentSelections((current) => {
        const next = { ...current }
        delete next[userId]
        return next
      })
      await openBindDrawer()
      void fetchStudents(selectedTermId).catch((error) => {
        message.error(error instanceof Error ? error.message : '学员名单刷新失败')
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消绑定失败，请稍后重试')
    } finally {
      setParentUnbindingId(null)
    }
  }

  const fetchStudents = useCallback(async (termId: string) => {
    if (!termId) {
      setStudents([])
      setGrades([])
      setSelectedTermName('')
      setStudentListError('')
      return
    }
    setStudentListLoading(true)
    setStudentListError('')
    try {
      const res = await fetch(`/api/notifications/students?termId=${encodeURIComponent(termId)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({})) as {
        students?: StudentItem[]
        grades?: string[]
        term?: { id: string; name: string } | null
        error?: string
      }
      if (!res.ok) throw new Error(data.error || '当前批次学员加载失败')
      setStudents(data.students || [])
      setGrades(data.grades || [])
      setSelectedTermName(data.term?.name || '')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '当前批次学员加载失败'
      setStudentListError(errorMessage)
      throw error
    } finally {
      setStudentListLoading(false)
    }
  }, [])

  const handleTermChange = async (termId: string) => {
    if (!termId || termId === selectedTermId || termSwitching) return
    setTermSwitching(true)
    try {
      const response = await fetch('/api/admin/academic-terms/scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId }),
      })
      const payload = await response.json().catch(() => ({})) as { term?: AcademicTermOption; error?: string }
      if (!response.ok) throw new Error(payload.error || '切换运营批次失败')
      const nextTermId = payload.term?.id || termId
      setSelectedTermId(nextTermId)
      setSelectedStudents([])
      setStudents([])
      setGrades([])
      setSelectedTermName('')
      setStudentListError('')
      setGradeFilter('')
      setSearchKeyword('')
      await fetchStudents(nextTermId)
      message.success(`已切换到“${payload.term?.name || '所选批次'}”，已清空此前选择`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '切换运营批次失败')
    } finally {
      setTermSwitching(false)
    }
  }

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/notifications/stats')
    setStats(await res.json())
  }, [])

  const fetchRecords = useCallback(async (page = 1) => {
    const res = await fetch(`/api/notifications?page=${page}&limit=20`)
    const data = await res.json()
    setRecords(data.records || [])
    setTotalRecords(data.total || 0)
  }, [])

  useEffect(() => {
    let active = true
    const loadTermContext = async () => {
      setTermLoading(true)
      try {
        const res = await fetch('/api/admin/academic-terms', { cache: 'no-store' })
        const data = await res.json().catch(() => ({})) as {
          terms?: AcademicTermOption[]
          selectedTermId?: string | null
          error?: string
        }
        if (!res.ok) throw new Error(data.error || '运营批次加载失败')
        if (!active) return
        const availableTerms = data.terms || []
        const initialTermId = data.selectedTermId || availableTerms.find((term) => term.status === 'ACTIVE')?.id || ''
        setTerms(availableTerms)
        setSelectedTermId(initialTermId)
        if (initialTermId) await fetchStudents(initialTermId)
        else {
          setStudents([])
          setGrades([])
          setSelectedTermName('')
        }
      } catch (error) {
        if (active) message.error(error instanceof Error ? error.message : '运营批次加载失败')
      } finally {
        if (active) setTermLoading(false)
      }
    }
    void loadTermContext()
    void fetchStats()
    void fetchRecords()
    return () => { active = false }
  }, [fetchStats, fetchRecords, fetchStudents])

  const filteredStudents = useMemo(() => students.filter((student) => {
    const matchGrade = !gradeFilter || student.grade === gradeFilter
    const matchSearch = !searchKeyword || student.name.includes(searchKeyword.trim())
    return matchGrade && matchSearch
  }), [students, gradeFilter, searchKeyword])

  const duplicateNameCounts = useMemo(() => filteredStudents.reduce((counts, student) => {
    counts[student.name] = (counts[student.name] || 0) + 1
    return counts
  }, {} as Record<string, number>), [filteredStudents])

  const groupedFiltered = useMemo(() => filteredStudents.reduce((acc, student) => {
    const key = student.grade || '未设置年级'
    if (!acc[key]) acc[key] = []
    acc[key].push(student)
    return acc
  }, {} as Record<string, StudentItem[]>), [filteredStudents])

  const selectedItems = useMemo(
    () => students.filter((student) => selectedStudents.includes(student.id)),
    [students, selectedStudents],
  )
  const hasUnboundSelected = selectedItems.some((student) => !student.wxBound)
  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => (
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    ))
  }

  const dispatchQueuedNotifications = async (notificationIds: string[]): Promise<ImmediateDispatchSummary> => {
    const results: ParentDispatchResult[] = []
    const remainingNotificationIds: string[] = []

    for (let offset = 0; offset < notificationIds.length; offset += 1000) {
      let pendingIds = notificationIds.slice(offset, offset + 1000)
      let requestCount = 0

      while (pendingIds.length > 0) {
        requestCount += 1
        if (requestCount > 60) {
          return {
            results,
            remainingNotificationIds: [...remainingNotificationIds, ...pendingIds, ...notificationIds.slice(offset + 1000)],
            error: '企微任务分批处理次数过多，请刷新记录后继续',
          }
        }

        let response: Response
        let data: {
          results?: ParentDispatchResult[]
          remainingNotificationIds?: string[]
          error?: string
        } | null
        try {
          response = await fetch('/api/notifications/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationIds: pendingIds }),
          })
          data = await response.json().catch(() => null)
        } catch {
          return {
            results,
            remainingNotificationIds: [...remainingNotificationIds, ...pendingIds, ...notificationIds.slice(offset + 1000)],
            error: '连接服务器失败；仍排队的通知可在通知记录中继续处理',
          }
        }

        if (!response.ok || !data) {
          return {
            results,
            remainingNotificationIds: [...remainingNotificationIds, ...pendingIds, ...notificationIds.slice(offset + 1000)],
            error: data?.error || '企微任务处理请求失败',
          }
        }

        if (!Array.isArray(data.results) || !Array.isArray(data.remainingNotificationIds)) {
          return {
            results,
            remainingNotificationIds: [...remainingNotificationIds, ...pendingIds, ...notificationIds.slice(offset + 1000)],
            error: '服务器返回的处理结果格式无效，请刷新通知记录',
          }
        }

        results.push(...data.results)
        if (data.remainingNotificationIds.length >= pendingIds.length) {
          return {
            results,
            remainingNotificationIds: [...remainingNotificationIds, ...pendingIds, ...notificationIds.slice(offset + 1000)],
            error: '仍有通知处于排队状态，请刷新记录后继续处理',
          }
        }
        pendingIds = data.remainingNotificationIds
      }
    }

    return { results, remainingNotificationIds }
  }

  const handleSend = async () => {
    if (!selectedTermId) {
      message.warning('请先选择运营批次')
      return
    }
    if (selectedStudents.length === 0) {
      message.warning('请至少选择一名学员')
      return
    }

    try {
      const values = pushType === 'system'
        ? await form.validateFields(['title', 'content'])
        : {}
      setSending(true)
      let createdCount = 0
      let sentCount = 0
      let failCount = 0
      let firstError = ''
      const queuedNotificationIds: string[] = []

      for (const studentId of selectedStudents) {
        let res: Response
        let data: { id?: string; pushStatus?: string; pushError?: string | null; lastError?: string | null; error?: string } | null
        try {
          res = await fetch(`/api/notifications?termId=${encodeURIComponent(selectedTermId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId,
              title: values.title || (pushType === 'wxpusher_feedback' ? '课堂反馈通知' : '平安回家提醒'),
              content: values.content || '',
              type: pushType,
            }),
          })
          data = await res.json().catch(() => null)
        } catch {
          failCount += 1
          firstError ||= '连接中断，部分通知创建结果未确认；请刷新通知记录'
          continue
        }
        if (!res.ok || !data) {
          failCount += 1
          firstError ||= data?.error || '通知记录创建失败'
          continue
        }
        createdCount += 1
        if (data.pushStatus === 'sent') sentCount += 1
        else if (data.pushStatus === 'queued' && typeof data.id === 'string') queuedNotificationIds.push(data.id)
        else if (['failed', 'no_bind', 'limit_today'].includes(data.pushStatus || '') || (pushType !== 'system' && data.pushError)) {
          failCount += 1
          firstError ||= data.pushError || data.lastError || '企微任务未能创建'
        }
      }

      if (pushType === 'system') {
        message.success(`已创建 ${createdCount} 条家长端系统通知记录`)
      } else {
        let pendingTaskCount = 0
        let dispatchFailureCount = 0
        let resultNeedsReviewCount = 0
        let queueSummary: ImmediateDispatchSummary = { results: [], remainingNotificationIds: [] }
        if (queuedNotificationIds.length > 0) {
          queueSummary = await dispatchQueuedNotifications(queuedNotificationIds)
          if (queueSummary.results.length === 0 && !queueSummary.error && queueSummary.remainingNotificationIds.length === 0) {
            resultNeedsReviewCount += 1
          }
          for (const result of queueSummary.results) {
            if (result.status === 'pending_confirm') pendingTaskCount += 1
            else if (result.status === 'sent') sentCount += 1
            else if (['failed', 'no_bind', 'limit_today'].includes(result.status)) dispatchFailureCount += 1
            else resultNeedsReviewCount += 1
            firstError ||= result.error || ''
          }
        }
        firstError ||= queueSummary.error || ''
        const totalFailures = failCount + dispatchFailureCount
        const summary = `通知记录 ${createdCount} 条；企微待确认任务 ${pendingTaskCount} 个家长；已确认发送 ${sentCount} 个；处理失败 ${totalFailures} 处；状态待核对 ${resultNeedsReviewCount} 处；仍排队 ${queueSummary.remainingNotificationIds.length} 条`
        if (totalFailures > 0 || resultNeedsReviewCount > 0 || queueSummary.remainingNotificationIds.length > 0 || queueSummary.error) {
          message.warning(`${summary}${firstError ? `。${firstError}` : ''}`, 10)
        } else if (pendingTaskCount > 0) {
          message.info(`${summary}。请发送成员到企微群发助手手动确认；确认前家长不会收到。`, 10)
        } else {
          message.success(summary, 8)
        }
      }
      setSelectedStudents([])
      form.resetFields()
      void fetchStats()
      void fetchRecords()
    } catch {
      message.error('发送失败')
    } finally {
      setSending(false)
    }
  }

  const handleTestParentMass = async () => {
    setTestingParentMass(true)
    try {
      const res = await fetch('/api/qywx/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'parent-mass' }),
      })
      const data = await res.json().catch(() => null) as { ok?: boolean; taskCreated?: boolean; error?: string } | null
      if (!res.ok || !data?.ok || !data.taskCreated) throw new Error(data?.error || '企微测试任务未创建')
      message.success('专用测试联系人的待确认任务已创建。请到企微群发助手核对；确认前不会发送。', 8)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建测试任务失败')
    } finally {
      setTestingParentMass(false)
    }
  }

  const handleResend = async (id: string) => {
    if (dispatchingRecordIds.includes(id)) return
    setDispatchingRecordIds((current) => [...new Set([...current, id])])
    try {
      const res = await fetch(`/api/notifications/${id}/resend`, { method: 'POST' })
      const data = await res.json().catch(() => null) as { pushStatus?: string; error?: string } | null
      if (!res.ok) throw new Error(data?.error || '重新加入通知队列失败')
      if (data?.pushStatus === 'queued') {
        const summary = await dispatchQueuedNotifications([id])
        const pending = summary.results.filter((result) => result.status === 'pending_confirm').length
        const failures = summary.results.filter((result) => ['failed', 'no_bind', 'limit_today'].includes(result.status)).length
        const needsReview = summary.results.filter((result) => !['pending_confirm', 'sent', 'failed', 'no_bind', 'limit_today'].includes(result.status)).length
        const firstError = summary.error || summary.results.find((result) => result.error)?.error
        if (pending > 0) {
          message.info('企微待确认任务已创建，请发送成员到企微群发助手手动确认；确认前家长不会收到。', 8)
        } else if (failures > 0 || needsReview > 0 || summary.remainingNotificationIds.length > 0 || summary.error) {
          message.warning(firstError || '任务未全部完成，请刷新记录查看状态', 10)
        } else {
          message.info('通知状态已变化，请刷新记录确认当前状态', 6)
        }
      } else {
        message.success('通知已重新提交')
      }
      void fetchRecords()
      void fetchStats()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新提交失败')
    } finally {
      setDispatchingRecordIds((current) => current.filter((recordId) => recordId !== id))
    }
  }

  const handleDispatchQueued = async (id: string) => {
    if (dispatchingRecordIds.includes(id)) return
    setDispatchingRecordIds((current) => [...new Set([...current, id])])
    try {
      const summary = await dispatchQueuedNotifications([id])
      const pending = summary.results.filter((result) => result.status === 'pending_confirm').length
      const failures = summary.results.filter((result) => ['failed', 'no_bind', 'limit_today'].includes(result.status)).length
      const needsReview = summary.results.filter((result) => !['pending_confirm', 'sent', 'failed', 'no_bind', 'limit_today'].includes(result.status)).length
      const firstError = summary.error || summary.results.find((result) => result.error)?.error
      if (pending > 0) {
        message.info('企微待确认任务已创建，请发送成员到企微群发助手手动确认；确认前家长不会收到。', 8)
      } else if (failures > 0 || needsReview > 0 || summary.remainingNotificationIds.length > 0 || summary.error) {
        message.warning(firstError || '任务未全部完成，请刷新记录查看状态', 10)
      } else {
        message.info('该通知已不在排队状态，请刷新记录查看最新结果', 6)
      }
      void fetchRecords()
      void fetchStats()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '企微任务处理失败')
    } finally {
      setDispatchingRecordIds((current) => current.filter((recordId) => recordId !== id))
    }
  }

  return (
    <div style={embedded ? { width: '100%' } : { minHeight: '100vh', backgroundColor: '#faf8f5', padding: isMobile ? 12 : 24, maxWidth: 1200, margin: '0 auto' }}>
      {!embedded && (
        <>
          <Title level={4} style={{ marginBottom: 4 }}>消息通知</Title>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
            向家长创建系统通知或企微待确认任务；统计按通知记录计数，企微确认发送不代表家长已读
          </Text>
        </>
      )}

      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { title: '今日已发记录', value: stats.todaySent },
          { title: '累计已发记录', value: stats.totalSent },
          { title: '需处理记录', value: stats.totalFailed },
        ].map((item) => (
          <Col xs={8} key={item.title}>
            <Card><Statistic title={item.title} value={item.value} /></Card>
          </Col>
        ))}
        <Col xs={24} style={{ textAlign: 'right', marginBottom: -12 }}>
          <Button icon={<SearchOutlined />} onClick={openBindDrawer} loading={bindLoading && bindOpen} style={{ borderRadius: 8 }}>
            企微绑定管理
          </Button>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="send"
        items={[
          {
            key: 'send',
            label: '创建通知',
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={10}>
                  <Card title={(
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span>选择学员</span>
                      <span style={{ fontSize: 12, color: 'var(--color-ink-tertiary)' }}>已选 {selectedStudents.length} 人</span>
                    </div>
                  )}>
                    <Row gutter={8} style={{ marginBottom: 4 }}>
                      <Col xs={24} sm={14}>
                        <Select
                          aria-label="选择运营批次"
                          placeholder="请选择运营批次"
                          value={selectedTermId || undefined}
                          loading={termLoading || termSwitching}
                          disabled={termLoading || termSwitching || terms.length === 0}
                          getPopupContainer={() => document.body}
                          listHeight={240}
                          style={{ width: '100%', marginBottom: 8 }}
                          onChange={(value) => { void handleTermChange(value) }}
                          options={terms.map((term) => ({
                            label: `${term.name}${term.status === 'ACTIVE' ? '（当前）' : ''}`,
                            value: term.id,
                          }))}
                        />
                      </Col>
                      <Col xs={24} sm={10}>
                        <Select
                          aria-label="按年级筛选"
                          placeholder="按年级筛选"
                          allowClear
                          disabled={!selectedTermId || studentListLoading}
                          getPopupContainer={() => document.body}
                          listHeight={240}
                          style={{ width: '100%', marginBottom: 8 }}
                          value={gradeFilter || undefined}
                          onChange={(value) => setGradeFilter(value || '')}
                          options={grades.map((grade) => ({ label: grade, value: grade }))}
                        />
                      </Col>
                    </Row>
                    {studentListError ? (
                      <Alert type="error" showIcon message="当前批次学员加载失败" description={studentListError} style={{ marginBottom: 8 }} />
                    ) : selectedTermName ? (
                      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                        当前批次：{selectedTermName}，名单只显示该批次在册学员；切换批次会清空已选学员。
                      </Text>
                    ) : !termLoading ? (
                      <Alert type="info" showIcon message={terms.length ? '请选择运营批次。' : '当前没有运营批次，请先创建批次。'} style={{ marginBottom: 8 }} />
                    ) : null}
                    <Input
                      placeholder="搜索学员姓名"
                      prefix={<SearchOutlined />}
                      value={searchKeyword}
                      onChange={(event) => setSearchKeyword(event.target.value)}
                      style={{ marginBottom: 8 }}
                      allowClear
                      disabled={!selectedTermId || studentListLoading}
                    />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <Button size="small" disabled={!selectedTermId || studentListLoading || filteredStudents.length === 0} onClick={() => setSelectedStudents(filteredStudents.map((student) => student.id))}>
                        全选当前({filteredStudents.length})
                      </Button>
                      <Button size="small" disabled={selectedStudents.length === 0} onClick={() => setSelectedStudents([])}>取消全选</Button>
                    </div>
                    <div data-scroll-lock aria-busy={studentListLoading} style={{ maxHeight: 400, overflowY: 'auto', overscrollBehavior: 'contain', opacity: studentListLoading ? 0.65 : 1 }}>
                      {Object.entries(groupedFiltered).map(([grade, gradeStudents]) => {
                        const ids = gradeStudents.map((student) => student.id)
                        const allChecked = ids.every((id) => selectedStudents.includes(id))
                        const partlyChecked = ids.some((id) => selectedStudents.includes(id)) && !allChecked
                        return (
                          <div key={grade} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,.06)', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, fontWeight: 600, color: '#5a4e3a' }}>{grade} ({gradeStudents.length}人)</Text>
                              <Checkbox
                                disabled={studentListLoading}
                                checked={allChecked}
                                indeterminate={partlyChecked}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedStudents((prev) => [...new Set([...prev, ...ids])])
                                  } else {
                                    setSelectedStudents((prev) => prev.filter((id) => !ids.includes(id)))
                                  }
                                }}
                              >
                                <Text style={{ fontSize: 11 }}>全选本年级</Text>
                              </Checkbox>
                            </div>
                            {gradeStudents.map((student) => {
                              const checked = selectedStudents.includes(student.id)
                              return (
                                <div
                                  key={student.id}
                                  onClick={() => { if (!studentListLoading) toggleStudent(student.id) }}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '7px 8px', borderRadius: 8, marginBottom: 2, cursor: 'pointer',
                                    backgroundColor: checked ? 'rgba(232,117,69,.08)' : 'transparent',
                                    border: checked ? '1px solid rgba(232,117,69,.3)' : '1px solid transparent',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Checkbox disabled={studentListLoading} checked={checked} onChange={() => toggleStudent(student.id)} onClick={(event) => event.stopPropagation()} />
                                    <div>
                                      <Text style={{ fontSize: 14 }}>{student.name}</Text>
                                      {duplicateNameCounts[student.name] > 1 && (
                                        <Text type="secondary" style={{ display: 'block', fontSize: 11, lineHeight: 1.3 }}>
                                          {student.parentName ? `${student.parentName}家长` : '家长未设置'} · {student.roomName}
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                  <Tag color={student.wxBound ? 'success' : 'default'} style={{ fontSize: 11, margin: 0 }}>
                                    {student.wxBound ? '企微已绑定' : '未绑定'}
                                  </Tag>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                      {!studentListLoading && !studentListError && selectedTermId && filteredStudents.length === 0 && (
                        <Text type="secondary" style={{ display: 'block', padding: '18px 8px', textAlign: 'center' }}>
                          {searchKeyword || gradeFilter ? '当前批次没有符合条件的学员' : '当前批次暂无在册学员'}
                        </Text>
                      )}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                    <Card
                      title="编写通知"
                      extra={(
                        <Popconfirm
                          title="仅为配置的专用测试联系人创建企微待确认任务；不会自动发送。若随后在企微群发助手确认，测试联系人会收到测试卡片。继续？"
                          okText="创建测试任务"
                          cancelText="取消"
                          onConfirm={handleTestParentMass}
                        >
                          <Button size="small" loading={testingParentMass}>
                            {isMobile ? '测试企微' : '测试家长群发连通性'}
                          </Button>
                        </Popconfirm>
                      )}
                    >
                      <Alert
                        type="info"
                        showIcon
                        message="企微通道已启用且绑定齐全时，网站提交后会立即按家庭汇总并创建企微待确认任务。发送成员仍需在企微群发助手手动确认；每位家长每日最多一个任务，当天任务创建后新增提醒仍保留在家长端。未处理的排队记录可在通知记录中继续创建。"
                        style={{ marginBottom: 16, borderRadius: 8 }}
                      />
                    <Form form={form} layout="vertical">
                      {pushType === 'system' && (
                        <>
                          <Form.Item name="title" label="通知标题" rules={[{ required: true, message: '请输入标题' }]}>
                            <Input maxLength={50} />
                          </Form.Item>
                          <Form.Item name="content" label="通知内容" rules={[{ required: true, message: '请输入内容' }]}>
                            <TextArea rows={4} maxLength={200} showCount />
                          </Form.Item>
                        </>
                      )}
                    </Form>

                    <div style={{ marginBottom: 12 }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>发送方式</Text>
                      <Radio.Group value={pushType} onChange={(event) => setPushType(event.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Radio value="system">
                          <Text>仅系统通知</Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>家长在家长端查看，不创建企微任务</Text>
                        </Radio>
                        <Radio value="wxpusher_feedback" disabled={hasUnboundSelected}>
                          <Text>课堂反馈企微提醒</Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            使用固定提示模板，不在卡片展示评语或课堂照片；点击后进入家长端查看课堂反馈
                          </Text>
                        </Radio>
                        <Radio value="wxpusher_safe" disabled={hasUnboundSelected}>
                          <Text>平安回家提醒</Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            作为家校提醒合并到家庭当日简报，不表示实时到家或即时送达
                          </Text>
                        </Radio>
                      </Radio.Group>
                    </div>

                    {hasUnboundSelected && pushType !== 'system' && (
                      <Alert type="warning" showIcon message="所选学员中有家长账号尚未绑定企微联系人，不能创建待确认任务；通知记录仍会保留在家长端。请先完成企微绑定。" style={{ marginBottom: 12, borderRadius: 8 }} />
                    )}

                    <Button
                      type="primary"
                      block
                      loading={sending}
                      onClick={handleSend}
                      disabled={selectedStudents.length === 0 || (pushType !== 'system' && hasUnboundSelected)}
                       style={{ background: 'var(--color-brand-orange)', borderColor: 'var(--color-brand-orange)', borderRadius: 8, height: 40 }}
                    >
                      {selectedStudents.length > 0
                        ? `${pushType === 'system' ? '创建系统通知' : '创建通知并生成企微待确认任务'}（${selectedStudents.length}名学员）`
                        : pushType === 'system' ? '创建系统通知' : '创建通知并生成企微待确认任务'}
                    </Button>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'records',
            label: '通知记录',
            children: (
              <Table
                dataSource={records}
                rowKey="id"
                scroll={{ x: 'max-content' }}
                pagination={{ total: totalRecords, pageSize: 20, onChange: (page) => fetchRecords(page) }}
                columns={[
                  { title: '学员', dataIndex: ['student', 'name'], key: 'student', width: 80 },
                  { title: '标题', dataIndex: 'title', key: 'title' },
                  {
                    title: '类型', dataIndex: 'type', key: 'type', width: 120,
                    render: (value: string) => {
                      if (value === 'system') return <Tag>仅系统</Tag>
                      if (value === 'wxpusher_feedback') return <Tag color="blue">课堂反馈</Tag>
                      if (value === 'wxpusher_safe') return <Tag color="green">平安回家提醒</Tag>
                      if (value === 'leave') return <Tag color="orange">请假通知</Tag>
                      return <Tag>{value}</Tag>
                    },
                  },
                  {
                    title: '发送状态', dataIndex: 'pushStatus', key: 'pushStatus', width: 160,
                    render: (value: string, record) => {
                      if (value === 'none') return record.pushError ? (
                        <Space direction="vertical" size={0}>
                          <Tag>未进入企微队列</Tag>
                          <span style={{ fontSize: 11, color: 'var(--color-ink-tertiary)' }} title={record.pushError}>{record.pushError.slice(0, 28)}{record.pushError.length > 28 ? '…' : ''}</span>
                        </Space>
                      ) : <span style={{ color: 'var(--color-ink-tertiary)' }}>-</span>
                      if (value === 'sent') return <Tag color="success">{record.qywxMsgId ? '企微已确认发送' : '已发送'}</Tag>
                      if (value === 'failed') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="error">{record.qywxMsgId ? '企微任务状态异常' : '任务创建失败'}</Tag>
                           {record.attempts > 0 && <span style={{ fontSize: 11, color: 'var(--color-ink-tertiary)' }}>重试{record.attempts}次</span>}
                           {record.qywxMsgId && <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>已有企微任务，请先核对</span>}
                           {(record.lastError || record.pushError) && <span style={{ fontSize: 11, color: 'var(--color-error)' }} title={record.lastError || record.pushError || ''}>{(record.lastError || record.pushError || '').slice(0, 20)}{(record.lastError || record.pushError || '').length > 20 ? '…' : ''}</span>}
                        </Space>
                      )
                      if (value === 'no_bind') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="warning">未绑定企微联系人</Tag>
                          {record.pushError && <span style={{ fontSize: 11, color: 'var(--color-ink-tertiary)' }} title={record.pushError}>{record.pushError.slice(0, 28)}{record.pushError.length > 28 ? '…' : ''}</span>}
                        </Space>
                      )
                      if (value === 'pending_confirm') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="processing">待企微确认</Tag>
                           <span style={{ fontSize: 11, color: 'var(--color-ink-tertiary)' }}>到发送成员企微群发助手手动确认；确认前家长未收到</span>
                        </Space>
                      )
                      if (value === 'queued') return <Tag color="processing">等待创建企微任务</Tag>
                      if (value === 'processing') return <Tag color="processing">正在创建企微任务</Tag>
                      if (value === 'merged_today') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="orange">今日未发送</Tag>
                           <span style={{ fontSize: 11, color: 'var(--color-ink-tertiary)' }}>旧记录状态；请在家长端查看</span>
                        </Space>
                      )
                      if (value === 'limit_today') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="orange">今日未发送</Tag>
                           <span style={{ fontSize: 11, color: 'var(--color-ink-tertiary)' }}>该家长今日已有任务；本条仍保留在家长端</span>
                        </Space>
                      )
                      return <span>{value}</span>
                    },
                  },
                  {
                    title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 120,
                    render: (value: string) => {
                      const date = new Date(value)
                      return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                    },
                  },
                  {
                    title: '操作', key: 'action', width: 220,
                    render: (_: unknown, record) => (
                      <Space size={4}>
                        <Button type="link" size="small" onClick={() => setDetailModal({ open: true, record })}>查看</Button>
                        {record.pushStatus === 'queued' && (
                          <Button
                            type="link"
                            size="small"
                            loading={dispatchingRecordIds.includes(record.id)}
                            disabled={sending || (dispatchingRecordIds.length > 0 && !dispatchingRecordIds.includes(record.id))}
                            onClick={() => handleDispatchQueued(record.id)}
                          >
                            立即创建企微任务
                          </Button>
                        )}
                        {['failed', 'no_bind', 'limit_today', 'merged_today'].includes(record.pushStatus) && !record.qywxMsgId && (
                          <Button
                            type="link"
                            size="small"
                            loading={dispatchingRecordIds.includes(record.id)}
                            disabled={sending || (dispatchingRecordIds.length > 0 && !dispatchingRecordIds.includes(record.id))}
                            onClick={() => handleResend(record.id)}
                          >
                            重发
                          </Button>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <Drawer
        title="企业微信绑定管理"
        open={bindOpen}
        onClose={closeBindDrawer}
        width={isMobile ? '100vw' : 640}
        loading={bindLoading}
        extra={<Button onClick={closeBindDrawer}>关闭</Button>}
        styles={{ body: { padding: isMobile ? 12 : 24 } }}
      >
        <Alert
          type="info"
          showIcon
          style={{ borderRadius: 8, marginBottom: 16 }}
          message="按顺序完成 3 步"
          description={(
            <div>
              <ol style={{ margin: '0 0 8px', paddingLeft: 20, lineHeight: 1.65 }}>
                <li>先让企业微信信任本系统服务器的出口 IP。</li>
                <li>把系统老师/管理员与企业微信通讯录员工匹配。</li>
                <li>再把企微家长联系人匹配到对应的系统家长。</li>
              </ol>
              <Text type="secondary">此处只做账号关联，不会替你添加微信好友；推送消息还需老师在企微「群发助手」确认发送。</Text>
            </div>
          )}
        />
        {bindLoadError && (
          <Alert
            type="error"
            showIcon
            message="绑定信息加载失败"
            description={bindLoadError}
            action={<Button size="small" onClick={openBindDrawer}>重试</Button>}
            style={{ borderRadius: 8, marginBottom: 12 }}
          />
        )}
        {bindData.wecomError && (
          <Alert
            type="error"
            showIcon
            message={qywxIpBlocked ? '第 1 步：请把服务器 IP 加入企微可信 IP' : '企微联系人读取失败'}
            description={(
              <div>
                {qywxIpBlocked ? (
                  <>
                    <div>企微因安全设置拒绝了系统读取联系人（错误码 60020）。这是访问权限拦截，不代表家长联系人丢失。</div>
                    {qywxBlockedIp && (
                      <div style={{ marginTop: 8 }}>
                        请加入这个服务器出口 IP：<Text code copyable={{ text: qywxBlockedIp }}>{qywxBlockedIp}</Text>
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      请在企业微信管理后台（不是本网站设置页）打开本系统使用的自建应用，在「企业可信 IP」中添加{qywxBlockedIp ? '上面的地址' : '服务器当前的公网出口 IP'}并保存；稍等约 1 分钟后，点“已处理，重新检测”。
                    </div>
                    <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                      这里显示的是系统服务器访问企微时的出口 IP。请以此处地址为准；如果服务器出口 IP 会变化，需要先配置固定出口地址。
                    </Text>
                  </>
                ) : (
                  <div>
                    {bindData.wecomError.split(/,\s*hint:/i)[0]}。请检查客户联系 Secret 和接口权限，修复后重新检测。
                  </div>
                )}
                {bindData.wecomError.length > 140 && (
                  <details style={{ marginTop: 8, overflowWrap: 'anywhere' }}>
                    <summary style={{ cursor: 'pointer' }}>查看技术错误详情</summary>
                    <Text code style={{ display: 'block', marginTop: 6, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                      {bindData.wecomError}
                    </Text>
                  </details>
                )}
              </div>
            )}
            action={<Button size="small" onClick={openBindDrawer}>{qywxIpBlocked ? '已处理，重新检测' : '重新检测'}</Button>}
            style={{ borderRadius: 8, marginBottom: 12 }}
          />
        )}
        <Card
          size="small"
          title="第 2 步：绑定老师的企微账号"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>已绑定 {bindData.staff.filter((item) => item.qywxUserId).length}/{bindData.staff.length} 位</Text>}
          style={{ marginBottom: 16, borderRadius: 10 }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, lineHeight: 1.6 }}>
            选一位负责联系家长的老师，再填写他在企业微信通讯录里的 UserID。UserID 是员工编号，不是手机号，也不是家长微信号。
          </Text>
          <Space direction="vertical" size={10} style={{ display: 'flex' }}>
            <Select
              aria-label="选择系统员工"
              placeholder="选择系统员工"
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              showSearch
              optionFilterProp="label"
              options={bindData.staff.map((item) => ({
                value: item.id,
                label: `${item.name}（${item.role === 'admin' ? '管理员' : '教师'}${item.qywxUserId ? ` · 已绑定 ${item.qywxUserId}` : ''}）`,
              }))}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={240}
              virtual={false}
              style={{ width: '100%' }}
              disabled={bindLoading || bindData.staff.length === 0}
              notFoundContent="当前校区没有启用的管理员或教师账号"
            />
            <Input
              aria-label="企业微信成员 ID"
              placeholder="老师的企业微信 UserID（不是手机号）"
              value={staffQywxUserId}
              onChange={(event) => setStaffQywxUserId(event.target.value)}
              autoComplete="off"
              maxLength={128}
              style={{ fontSize: isMobile ? 16 : 14 }}
              disabled={bindLoading}
            />
            <Button
              type="primary"
              block={isMobile}
              onClick={handleStaffBind}
              loading={staffBindingId === selectedStaffId && Boolean(selectedStaffId)}
              disabled={bindLoading || !selectedStaffId || !staffQywxUserId.trim()}
            >
              保存并绑定员工
            </Button>
          </Space>
          {bindData.staff.length === 0 && !bindLoadError && (
            <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
              当前校区没有可绑定的启用员工账号，请先确认账号所属校区和状态。
            </Text>
          )}
          {!bindData.wecomError && bindData.staff.length > 0 && bindData.staff.every((item) => !item.qywxUserId) && (
            <Alert
              type="warning"
              showIcon
              message="还没有员工身份绑定"
              description="绑定至少一位实际负责家长联系的老师后，下面才能列出这位老师名下的企微家长。"
              style={{ marginTop: 12, borderRadius: 8 }}
            />
          )}
          {!bindData.wecomError && bindData.staff.some((item) => item.qywxUserId) && bindData.matchedStaffCount === 0 && (
            <Alert
              type="warning"
              showIcon
              message="企微成员 ID 尚未匹配到客户联系成员"
              description="请核对这里绑定的 UserID 是否与企业微信通讯录完全一致，并确认该员工已启用客户联系权限。"
              style={{ marginTop: 12, borderRadius: 8 }}
            />
          )}
        </Card>
        {bindData.parents.length === 0 && !bindLoadError && (
          <Alert
            type="success"
            showIcon
            message="当前没有符合条件的家长账号"
            description="请确认当前校区仍有启用中的家长账号和在读学员。"
            style={{ borderRadius: 8, marginBottom: 12 }}
          />
        )}
        {bindData.parents.length > 0 && bindData.contacts.length === 0 && !bindLoadError && !bindData.wecomError && bindData.matchedStaffCount > 0 && (
          <Alert
            type="info"
            showIcon
            message="当前没有可关联的企微家长联系人"
            description="请由已绑定的老师在企业微信「客户联系」中添加家长，并确认该老师仍保有客户联系权限，然后重新加载。"
            style={{ borderRadius: 8, marginBottom: 12 }}
          />
        )}
        {bindData.contacts.length > 0 && bindData.contacts.every((contact) =>
          bindData.parents.some((parent) => parent.qywxExternalUserId === contact.external_userid),
        ) && (
          <Alert
            type="info"
            showIcon
            message="当前企微联系人都已绑定"
            description="如需调整联系人归属，请先在已绑定的家长卡片中点“取消绑定”，再为正确的家长重新选择。"
            style={{ borderRadius: 8, marginBottom: 12 }}
          />
        )}
        {bindData.parents.length > 0 && (
          <div style={{ margin: '18px 0 10px' }}>
            <Text strong>第 3 步：将企微联系人匹配给家长</Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 4, lineHeight: 1.5 }}>
              先选择联系人，再点“确认绑定”才会保存；“取消选择”只会清除本次选择。一个企微联系人只能绑定一个系统家长。
            </Text>
          </div>
        )}
        {bindData.parents.map((parent) => {
          const isBound = Boolean(parent.qywxExternalUserId)
          const boundContact = bindData.contacts.find((contact) => contact.external_userid === parent.qywxExternalUserId)
          const boundStaff = bindData.staff.find((item) => item.qywxUserId === parent.qywxSenderUserId)
          const availableContacts = bindData.contacts.filter((contact) =>
            !bindData.parents.some((other) => other.id !== parent.id && other.qywxExternalUserId === contact.external_userid),
          )
          const selection = parentSelections[parent.id]
          const selectedValue = selection ? JSON.stringify(selection) : undefined
          return (
            <Card
              key={parent.id}
              size="small"
              style={{ marginBottom: 8, borderRadius: 10 }}
              title={<span>{parent.name}（{parent.children.join('、') || '无在读学生'}）</span>}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>{parent.phone || '无手机号'}</Text>}
            >
              <Space style={{ width: '100%' }} direction="vertical" size={8}>
                {isBound ? (
                  <>
                    <Alert
                      type="success"
                      showIcon
                      style={{ borderRadius: 8 }}
                      message={`已绑定企微联系人${boundContact?.name ? `：${boundContact.name}` : ''}`}
                      description={boundStaff ? `发送成员：${boundStaff.name}` : parent.qywxSenderUserId ? `企微发送成员：${parent.qywxSenderUserId}` : undefined}
                    />
                    <Popconfirm
                      title="确认取消这位家长的企微绑定？"
                      description="取消后，新的企微消息将无法发送给该联系人；之后可以重新绑定。"
                      okText="确认取消绑定"
                      cancelText="返回"
                      okButtonProps={{ danger: true, loading: parentUnbindingId === parent.id }}
                      onConfirm={() => handleParentUnbind(parent.id)}
                    >
                      <Button
                        danger
                        block={isMobile}
                        loading={parentUnbindingId === parent.id}
                        disabled={bindLoading || Boolean(parentBindingId) || Boolean(parentUnbindingId)}
                      >
                        取消绑定
                      </Button>
                    </Popconfirm>
                  </>
                ) : (
                  <>
                    <Select
                      aria-label={`为${parent.name}选择企微联系人`}
                      placeholder="选择企微联系人"
                      value={selectedValue}
                      style={{ width: '100%' }}
                      showSearch={availableContacts.length > 5}
                      optionFilterProp="label"
                      getPopupContainer={(trigger) => trigger.parentElement || document.body}
                      listHeight={240}
                      virtual={false}
                      disabled={bindLoading || availableContacts.length === 0 || Boolean(parentBindingId) || Boolean(parentUnbindingId)}
                      notFoundContent={bindData.wecomError
                        ? '请先处理上方企微读取错误'
                        : bindData.matchedStaffCount === 0
                          ? '请先绑定负责家长联系的企微员工'
                          : bindData.contacts.length === 0
                            ? '该员工名下暂无企微家长，请先在企微添加家长'
                            : '联系人已绑定其他家长，或当前暂无可选联系人'}
                      loading={bindLoading}
                      options={availableContacts.map((contact) => ({
                        label: `${contact.name}（${contact.member}）`,
                        value: JSON.stringify({ externalUserId: contact.external_userid, senderUserId: contact.member }),
                      }))}
                      onChange={(value) => {
                        const contact = availableContacts.find((item) =>
                          value === JSON.stringify({ externalUserId: item.external_userid, senderUserId: item.member }),
                        )
                        if (!contact) return
                        setParentSelections((current) => ({
                          ...current,
                          [parent.id]: { externalUserId: contact.external_userid, senderUserId: contact.member },
                        }))
                      }}
                    />
                    <Space direction={isMobile ? 'vertical' : 'horizontal'} size={8} style={{ width: '100%' }}>
                      <Button
                        type="primary"
                        block={isMobile}
                        loading={parentBindingId === parent.id}
                        disabled={!selection || bindLoading || Boolean(parentBindingId) || Boolean(parentUnbindingId)}
                        onClick={() => selection && handleBind(parent.id, selection.externalUserId, selection.senderUserId)}
                      >
                        确认绑定
                      </Button>
                      <Button
                        block={isMobile}
                        disabled={!selection || Boolean(parentBindingId) || Boolean(parentUnbindingId)}
                        onClick={() => setParentSelections((current) => {
                          const next = { ...current }
                          delete next[parent.id]
                          return next
                        })}
                      >
                        取消选择
                      </Button>
                    </Space>
                  </>
                )}
              </Space>
            </Card>
          )
        })}
      </Drawer>
      <Drawer
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, record: null })}
        extra={<Button onClick={() => setDetailModal({ open: false, record: null })}>关闭</Button>}
        width={isMobile ? '100vw' : 600}
        styles={{ body: { padding: isMobile ? 12 : 24 } }}
      >
        {detailModal.record && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Tag color={
                detailModal.record.type === 'wxpusher_feedback' ? 'blue' :
                detailModal.record.type === 'wxpusher_safe' ? 'green' :
                detailModal.record.type === 'leave' ? 'orange' : 'default'
              }>
                {detailModal.record.type === 'wxpusher_feedback' ? '课堂反馈' :
                 detailModal.record.type === 'wxpusher_safe' ? '平安回家提醒' :
                 detailModal.record.type === 'leave' ? '请假通知' : '系统通知'}
              </Tag>
            </div>
            <Typography.Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {detailModal.record.content}
            </Typography.Paragraph>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>关联内容：</Text>
              <Text style={{ fontSize: 12 }}>该关联内容暂不支持跳转</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                学员：{detailModal.record.student?.name || '—'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                时间：{new Date(detailModal.record.createdAt).toLocaleString('zh-CN')}
              </Text>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

