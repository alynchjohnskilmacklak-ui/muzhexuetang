'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Card, Checkbox, Col, Drawer, Form, Input, message, Radio, Row,
  Divider, Select, Space, Statistic, Table, Tabs, Tag, Typography,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'

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

interface NotificationRecord {
  id: string
  title: string
  content: string
  type: string
  pushStatus: string
  attempts: number
  lastError?: string | null
  createdAt: string
  student?: { name?: string } | null
}

export default function AdminNotificationsPage() {
  const [students, setStudents] = useState<StudentItem[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [gradeFilter, setGradeFilter] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [stats, setStats] = useState({ todaySent: 0, totalSent: 0, totalFailed: 0 })
  const [records, setRecords] = useState<NotificationRecord[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [sending, setSending] = useState(false)
  const [form] = Form.useForm()
  const [pushType, setPushType] = useState<string>('system')
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: NotificationRecord | null }>({ open: false, record: null })
  const [bindOpen, setBindOpen] = useState(false)
  const [bindData, setBindData] = useState<{ parents: Array<{ id: string; name: string; phone: string | null; children: string[] }>; contacts: Array<{ external_userid: string; name: string; member: string }> }>({ parents: [], contacts: [] })
  const [bindLoading, setBindLoading] = useState(false)

  const openBindDrawer = async () => {
    setBindOpen(true)
    setBindLoading(true)
    try {
      const res = await fetch('/api/qywx/bind-management')
      const data = await res.json()
      if (data.parents) setBindData({ parents: data.parents, contacts: data.contacts || [] })
      else message.error(data.error || '加载失败')
    } catch { message.error('加载绑定信息失败') } finally { setBindLoading(false) }
  }

  const handleBind = async (userId: string, externalUserId: string, senderUserId: string) => {
    try {
      const res = await fetch('/api/qywx/bind-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, externalUserId, senderUserId }),
      })
      if (res.ok) { message.success('绑定成功'); openBindDrawer(); fetchStudents() }
      else message.error('绑定失败')
    } catch { message.error('绑定失败') }
  }

  const handleUnbind = async (userId: string) => {
    try {
      const res = await fetch(`/api/qywx/bind-management?userId=${userId}`, { method: 'DELETE' })
      if (res.ok) { message.success('已解除绑定'); openBindDrawer(); fetchStudents() }
      else message.error('解除失败')
    } catch { message.error('解除失败') }
  }

  const fetchStudents = useCallback(async () => {
    const res = await fetch('/api/notifications/students')
    const data = await res.json()
    setStudents(data.students || [])
    setGrades(data.grades || [])
  }, [])

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

  useEffect(() => { fetchStudents(); fetchStats(); fetchRecords() }, [fetchStudents, fetchStats, fetchRecords])

  const filteredStudents = useMemo(() => students.filter((student) => {
    const matchGrade = !gradeFilter || student.grade === gradeFilter
    const matchSearch = !searchKeyword || student.name.includes(searchKeyword.trim())
    return matchGrade && matchSearch
  }), [students, gradeFilter, searchKeyword])

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
  const previewName = selectedItems.length === 1 ? selectedItems[0].name : '所选学员'

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => (
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    ))
  }

  const handleSend = async () => {
    if (selectedStudents.length === 0) {
      message.warning('请至少选择一名学员')
      return
    }

    try {
      const values = pushType === 'system'
        ? await form.validateFields(['title', 'content'])
        : {}
      setSending(true)
      let successCount = 0
      let failCount = 0

      for (const studentId of selectedStudents) {
        const res = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            title: values.title || (pushType === 'wxpusher_feedback' ? '课堂反馈通知' : '平安回家通知'),
            content: values.content || '',
            type: pushType,
          }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.pushStatus !== 'failed') successCount += 1
        else failCount += 1
      }

      if (failCount === 0) {
        message.success(`已成功发送给 ${successCount} 名学员`)
      } else {
        message.warning(`成功 ${successCount} 人，失败 ${failCount} 人`)
      }
      setSelectedStudents([])
      form.resetFields()
      fetchStats()
      fetchRecords()
    } catch {
      message.error('发送失败')
    } finally {
      setSending(false)
    }
  }

  const handleResend = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/resend`, { method: 'POST' })
      if (res.ok) { message.success('重发成功'); fetchRecords() }
      else message.error('重发失败')
    } catch { message.error('重发失败') }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 4 }}>消息通知</Title>
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
        向家长发送系统通知或企业微信汇总卡片
      </Text>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { title: '今日已发', value: stats.todaySent },
          { title: '累计发送', value: stats.totalSent },
          { title: '发送失败', value: stats.totalFailed },
        ].map((item) => (
          <Col xs={8} key={item.title}>
            <Card><Statistic title={item.title} value={item.value} /></Card>
          </Col>
        ))}
        <Col xs={24} style={{ textAlign: 'right', marginBottom: -12 }}>
          <Button icon={<SearchOutlined />} onClick={openBindDrawer} loading={bindLoading && bindOpen} style={{ borderRadius: 8 }}>
            家长绑定管理
          </Button>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="send"
        items={[
          {
            key: 'send',
            label: '发送通知',
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={10}>
                  <Card title={(
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span>选择学员</span>
                      <span style={{ fontSize: 12, color: '#9a8e7a' }}>已选 {selectedStudents.length} 人</span>
                    </div>
                  )}>
                    <Select
                      placeholder="按年级筛选"
                      allowClear
                      getPopupContainer={() => document.body}
                      listHeight={240}
                      style={{ width: '100%', marginBottom: 8 }}
                      value={gradeFilter || undefined}
                      onChange={(value) => setGradeFilter(value || '')}
                      options={grades.map((grade) => ({ label: grade, value: grade }))}
                    />
                    <Input
                      placeholder="搜索学员姓名"
                      prefix={<SearchOutlined />}
                      value={searchKeyword}
                      onChange={(event) => setSearchKeyword(event.target.value)}
                      style={{ marginBottom: 8 }}
                      allowClear
                    />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <Button size="small" onClick={() => setSelectedStudents(filteredStudents.map((student) => student.id))}>
                        全选当前({filteredStudents.length})
                      </Button>
                      <Button size="small" onClick={() => setSelectedStudents([])}>取消全选</Button>
                    </div>
                    <div data-scroll-lock style={{ maxHeight: 400, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                      {Object.entries(groupedFiltered).map(([grade, gradeStudents]) => {
                        const ids = gradeStudents.map((student) => student.id)
                        const allChecked = ids.every((id) => selectedStudents.includes(id))
                        const partlyChecked = ids.some((id) => selectedStudents.includes(id)) && !allChecked
                        return (
                          <div key={grade} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,.06)', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, fontWeight: 600, color: '#5a4e3a' }}>{grade} ({gradeStudents.length}人)</Text>
                              <Checkbox
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
                                  onClick={() => toggleStudent(student.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '7px 8px', borderRadius: 8, marginBottom: 2, cursor: 'pointer',
                                    backgroundColor: checked ? 'rgba(232,117,69,.08)' : 'transparent',
                                    border: checked ? '1px solid rgba(232,117,69,.3)' : '1px solid transparent',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Checkbox checked={checked} onChange={() => toggleStudent(student.id)} onClick={(event) => event.stopPropagation()} />
                                    <Text style={{ fontSize: 14 }}>{student.name}</Text>
                                  </div>
                                  <Tag color={student.wxBound ? 'success' : 'default'} style={{ fontSize: 11, margin: 0 }}>
                                    {student.wxBound ? '微信已绑定' : '未绑定'}
                                  </Tag>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <Card title="编写通知">
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
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>家长在客户端查看，不发送微信</Text>
                        </Radio>
                        <Radio value="wxpusher_feedback" disabled={hasUnboundSelected}>
                          <Text>课堂反馈微信推送</Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            通过企业微信发送汇总卡片到家长微信（每家长每日 1 条，多条自动合并为当日汇总）
                          </Text>
                        </Radio>
                        <Radio value="wxpusher_safe" disabled={hasUnboundSelected}>
                          <Text>平安回家微信推送</Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            通过企业微信发送汇总卡片到家长微信（每家长每日 1 条，多条自动合并为当日汇总）
                          </Text>
                        </Radio>
                      </Radio.Group>
                    </div>

                    {hasUnboundSelected && pushType !== 'system' && (
                      <Alert type="warning" showIcon message="所选学员中存在家长微信未添加为企微学员，无法接收微信推送（请在企业微信「学员联系-加学员」中添加后重试）" style={{ marginBottom: 12, borderRadius: 8 }} />
                    )}

                    <Button
                      type="primary"
                      block
                      loading={sending}
                      onClick={handleSend}
                      disabled={selectedStudents.length === 0 || (pushType !== 'system' && hasUnboundSelected)}
                      style={{ background: '#E8784A', borderColor: '#E8784A', borderRadius: 8, height: 40 }}
                    >
                      {selectedStudents.length > 0 ? `发送通知（${selectedStudents.length}人）` : '发送通知'}
                    </Button>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'records',
            label: '发送记录',
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
                      if (value === 'wxpusher_safe') return <Tag color="green">平安回家</Tag>
                      if (value === 'leave') return <Tag color="orange">请假通知</Tag>
                      return <Tag>{value}</Tag>
                    },
                  },
                  {
                    title: '微信推送', dataIndex: 'pushStatus', key: 'pushStatus', width: 140,
                    render: (value: string, record) => {
                      if (value === 'none') return <span style={{ color: '#62666d' }}>-</span>
                      if (value === 'sent') return <Tag color="success">已推送{record.attempts > 0 ? `(第${record.attempts}次)` : ''}</Tag>
                      if (value === 'failed') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="error">推送失败</Tag>
                          {record.attempts > 0 && <span style={{ fontSize: 11, color: '#62666d' }}>重试{record.attempts}次</span>}
                          {record.lastError && <span style={{ fontSize: 11, color: '#c41d7f' }} title={record.lastError}>{record.lastError.slice(0, 20)}{record.lastError.length > 20 ? '…' : ''}</span>}
                        </Space>
                      )
                      if (value === 'no_bind') return <Tag color="warning">未加学员</Tag>
                      if (value === 'pending_confirm') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="processing">待企微确认</Tag>
                          <span style={{ fontSize: 11, color: '#62666d' }}>在企微群发助手中确认发送</span>
                        </Space>
                      )
                      if (value === 'merged_today') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="purple">今日已合并</Tag>
                          <span style={{ fontSize: 11, color: '#62666d' }}>已并入当日汇总卡片</span>
                        </Space>
                      )
                      if (value === 'limit_today') return (
                        <Space direction="vertical" size={0}>
                          <Tag color="orange">今日已达上限</Tag>
                          <span style={{ fontSize: 11, color: '#62666d' }}>明日自动重试</span>
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
                    title: '操作', key: 'action', width: 120,
                    render: (_: unknown, record) => (
                      <Space size={4}>
                        <Button type="link" size="small" onClick={() => setDetailModal({ open: true, record })}>查看</Button>
                        {record.pushStatus === 'failed' && (
                          <Button type="link" size="small" onClick={() => handleResend(record.id)}>重发</Button>
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
        title="家长微信绑定管理"
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        width={640}
        loading={bindLoading}
        extra={<Button onClick={() => setBindOpen(false)}>关闭</Button>}
      >
        <Alert
          type="info"
          showIcon
          style={{ borderRadius: 8, marginBottom: 16 }}
          message="绑定说明"
          description="在企业微信「学员联系-加学员」中将家长微信添加为学员后，家长出现在下方「企微学员候选」中。为家长账号选择对应学员完成关联，之后发送微信通知即可送达。每个学员只能绑定一个家长账号。"
        />
        {bindData.parents.length === 0 && bindData.contacts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: '#9a8e7a' }}>
            暂无可绑定数据：所有家长均已绑定，或企微中暂无可添加的学员
          </div>
        )}
        {bindData.parents.map((parent) => (
          <Card
            key={parent.id}
            size="small"
            style={{ marginBottom: 8, borderRadius: 10 }}
            title={<span>{parent.name}（{parent.children.join('、') || '无在读学生'}）</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{parent.phone || '无手机号'}</Text>}
          >
            <Space style={{ width: '100%' }} direction="vertical" size={4}>
              <Select
                placeholder="选择企微学员"
                style={{ width: '100%' }}
                getPopupContainer={() => document.body}
                options={bindData.contacts.map((c) => ({
                  label: `${c.name}（${c.member}）`,
                  value: `${c.external_userid}::${c.member}`,
                }))}
                onChange={(value) => {
                  const [externalUserId, senderUserId] = value.split('::')
                  handleBind(parent.id, externalUserId, senderUserId)
                }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>选择后自动完成绑定；如需解除，请先在企微中删除该学员或联系技术人员</Text>
            </Space>
          </Card>
        ))}
      </Drawer>
      <Drawer
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, record: null })}
        extra={<Button onClick={() => setDetailModal({ open: false, record: null })}>关闭</Button>}
        width={600}
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
                 detailModal.record.type === 'wxpusher_safe' ? '平安回家' :
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
