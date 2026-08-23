'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Card, Col, DatePicker, Form, Input, Modal, Row, Statistic, Switch,
  Table, Tabs, Tag, Typography, message,
} from 'antd'
import { DownOutlined, DownloadOutlined, EditOutlined, ReloadOutlined, UpOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useIsMobile } from '@/hooks/useIsMobile'
import { StudentMealLedger } from './StudentMealLedger'

const { Title, Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

type MealTemplate = {
  id: string
  weekday: number
  title: string | null
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  snack: string | null
  note: string | null
  allowDouble?: boolean
}

type MealReport = {
  id: string
  teacher: { id: string; name: string }
  submittedAt: string
  totalCount: number
  riceSingle: number
  riceDouble: number
  details: Array<{ studentId: string; studentName: string; portion: 'single' | 'double'; groupName?: string }>
}

type TeacherSummary = { id?: string; name?: string; groupName?: string }

type MealSummary = {
  totalCount: number
  singleCount: number
  doubleCount: number
  unreportedTeachers: TeacherSummary[]
  parentStats?: {
    eating: number
    notEating: number
    unselected: number
  }
}

function mondayOf(value: Dayjs) {
  const offset = value.day() === 0 ? 6 : value.day() - 1
  return value.startOf('day').subtract(offset, 'day')
}

export default function MealsPage() {
  const isMobile = useIsMobile() ?? false
  const [historyWeek, setHistoryWeek] = useState(() => mondayOf(dayjs()))
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [reports, setReports] = useState<MealReport[]>([])
  const [historyReports, setHistoryReports] = useState<MealReport[]>([])
  const [summary, setSummary] = useState<MealSummary>({ totalCount: 0, singleCount: 0, doubleCount: 0, unreportedTeachers: [] })
  const [templateEditing, setTemplateEditing] = useState<{ weekday: number; template?: MealTemplate } | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showUnreported, setShowUnreported] = useState(false)
  const [activeTab, setActiveTab] = useState('student-ledger')
  const [refreshingToday, setRefreshingToday] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Dayjs | null>(null)
  const [refreshError, setRefreshError] = useState('')
  const [templateForm] = Form.useForm()
  const today = dayjs().format('YYYY-MM-DD')

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/admin/meal-templates')
    const data = await res.json()
    setTemplates(data.templates || [])
  }, [])

  const fetchToday = useCallback(async () => {
    setRefreshingToday(true)
    try {
      const cacheBuster = Date.now()
      const [reportRes, summaryRes] = await Promise.all([
        fetch(`/api/meals/report?date=${today}&_=${cacheBuster}`, { cache: 'no-store' }),
        fetch(`/api/meals/summary?date=${today}&_=${cacheBuster}`, { cache: 'no-store' }),
      ])
      const reportData = await reportRes.json().catch(() => ({}))
      const summaryData = await summaryRes.json().catch(() => ({}))
      if (!reportRes.ok || !summaryRes.ok) {
        throw new Error(reportData.error || summaryData.error || '就餐记录刷新失败')
      }
      setReports(reportData.reports || [])
      setSummary(summaryData || {})
      setLastRefreshedAt(dayjs())
      setRefreshError('')
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : '就餐记录刷新失败')
    } finally {
      setRefreshingToday(false)
    }
  }, [today])

  const fetchHistory = useCallback(async () => {
    const payloads = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      fetch(`/api/meals/report?date=${historyWeek.add(index, 'day').format('YYYY-MM-DD')}`).then((res) => res.json())
    ))
    setHistoryReports(payloads.flatMap((payload) => payload.reports || []))
  }, [historyWeek])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => {
    void fetchToday()
    const timer = window.setInterval(() => void fetchToday(), 15000)
    const refreshOnVisible = () => { if (document.visibilityState === 'visible') void fetchToday() }
    const refreshOnReturn = () => void fetchToday()
    document.addEventListener('visibilitychange', refreshOnVisible)
    window.addEventListener('focus', refreshOnReturn)
    window.addEventListener('pageshow', refreshOnReturn)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshOnVisible)
      window.removeEventListener('focus', refreshOnReturn)
      window.removeEventListener('pageshow', refreshOnReturn)
    }
  }, [fetchToday])
  useEffect(() => { fetchHistory() }, [fetchHistory])

  const templateMap = useMemo(() => new Map(templates.map((template) => [template.weekday, template])), [templates])

  const groupedMealDetails = useMemo(() => {
    const groups = new Map<string, Array<MealReport['details'][number] & { teacherName: string; submittedAt: string }>>()
    const seen = new Set<string>()
    reports.forEach((report) => {
      report.details?.forEach((detail) => {
        const groupName = detail.groupName?.trim() || `${report.teacher.name}上报`
        const key = `${groupName}:${detail.studentId}`
        if (seen.has(key)) return
        seen.add(key)
        groups.set(groupName, [
          ...(groups.get(groupName) || []),
          { ...detail, groupName, teacherName: report.teacher.name, submittedAt: report.submittedAt },
        ])
      })
    })
    return [...groups.entries()].map(([groupName, details]) => ({ groupName, details }))
  }, [reports])

  const groupedTotal = useMemo(
    () => groupedMealDetails.reduce((sum, group) => sum + group.details.length, 0),
    [groupedMealDetails],
  )

  const openTemplateEditor = (weekday: number, template?: MealTemplate) => {
    setTemplateEditing({ weekday, template })
    templateForm.setFieldsValue({
      lunch: template?.lunch,
      allowDouble: template?.allowDouble !== false,
      note: template?.note,
    })
  }

  const saveTemplate = async () => {
    const values = await templateForm.validateFields()
    setSaving(true)
    try {
      const res = await fetch(templateEditing?.template ? `/api/admin/meal-templates/${templateEditing.template.id}` : '/api/admin/meal-templates', {
        method: templateEditing?.template ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, weekday: templateEditing?.weekday }),
      })
      if (!res.ok) throw new Error('save failed')
      message.success('周期菜单已保存')
      setTemplateEditing(null)
      templateForm.resetFields()
      fetchTemplates()
    } catch {
      message.error('周期菜单保存失败')
    } finally {
      setSaving(false)
    }
  }

  const exportToday = () => {
    const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows = [
      ['班级', '学员姓名', '份数', '教师', '上报时间'],
      ...groupedMealDetails.flatMap((group) => group.details.map((detail) => [
        group.groupName,
        detail.studentName,
        detail.portion === 'double' ? '双份' : '单份',
        detail.teacherName,
        dayjs(detail.submittedAt).format('YYYY-MM-DD HH:mm'),
      ])),
      ['合计', '', groupedTotal, '', ''],
    ]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `就餐汇总-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const reportColumns = [
    { title: '教师姓名', dataIndex: ['teacher', 'name'], key: 'teacher' },
    { title: '上报时间', dataIndex: 'submittedAt', key: 'submittedAt', render: (value: string) => dayjs(value).format('MM-DD HH:mm') },
    { title: '就餐人数', dataIndex: 'totalCount', key: 'totalCount' },
    { title: '双份人数', dataIndex: 'riceDouble', key: 'riceDouble' },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>就餐管理</Title>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key)
          if (key === 'reports') void fetchToday()
        }}
        items={[
        {
          key: 'student-ledger',
          label: '学生就餐台账',
          children: <StudentMealLedger />,
        },
        {
          key: 'templates',
          label: '周期菜单',
          children: (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}>
              {WEEKDAYS.map((weekday, index) => {
                const dayOfWeek = index + 1
                const template = templateMap.get(dayOfWeek)
                return (
                  <Card
                    key={weekday}
                    hoverable
                    onClick={() => !template && openTemplateEditor(dayOfWeek)}
                    style={{
                      borderRadius: 10,
                      minHeight: template ? 116 : 76,
                      border: template ? '1px solid #EEE7E1' : '1px dashed #E8D8CA',
                      background: template ? '#fff' : '#FCFBF9',
                    }}
                    styles={{ body: { padding: isMobile ? 10 : 12 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: template ? 8 : 0 }}>
                      <Text strong style={{ fontSize: 14, color: '#1F2329' }}>{weekday}</Text>
                      {template && (
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(event) => { event.stopPropagation(); openTemplateEditor(dayOfWeek, template) }}
                        >
                          编辑
                        </Button>
                      )}
                    </div>
                    {template ? (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <Text strong style={{ fontSize: 15, color: '#1F2329', lineHeight: 1.35 }}>{template.lunch || '未设置米饭配菜'}</Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <Tag color={template.allowDouble !== false ? 'green' : 'default'} style={{ margin: 0 }}>
                            {template.allowDouble !== false ? '可双倍米饭' : '不可双倍'}
                          </Tag>
                          {template.note && <Text type="secondary" style={{ fontSize: 12 }}>{template.note}</Text>}
                        </div>
                      </div>
                    ) : (
                      <Button type="link" size="small" style={{ padding: 0, height: 24 }} onClick={(event) => { event.stopPropagation(); openTemplateEditor(dayOfWeek) }}>
                        点击设置
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          ),
        },
        {
          key: 'reports',
          label: '教师上报',
          children: (
            <>
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, marginBottom: 12, padding: '10px 12px', borderRadius: 10,
                background: 'var(--color-primary-bg)', border: '1px solid var(--color-hairline)',
              }}>
                <div>
                  <Text strong style={{ display: 'block' }}>今日 {today} · 自动刷新已开启</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    每15秒刷新，重新进入页面也会立即刷新
                    {lastRefreshedAt ? ` · 上次 ${lastRefreshedAt.format('HH:mm:ss')}` : ''}
                  </Text>
                </div>
                <Button
                  icon={<ReloadOutlined />}
                  loading={refreshingToday}
                  onClick={() => void fetchToday()}
                >
                  立即刷新
                </Button>
              </div>
              {refreshError && (
                <Alert
                  type="error"
                  showIcon
                  message="教师就餐记录刷新失败"
                  description={refreshError}
                  style={{ marginBottom: 12 }}
                />
              )}
              <div className="meal-report-stat-grid">
                <Card className="meal-report-stat-card"><Statistic title="总就餐人数" value={summary.totalCount || groupedTotal} suffix="人" /></Card>
                <Card className="meal-report-stat-card"><Statistic title="未上报教师" value={summary.unreportedTeachers?.length || 0} suffix="位" /></Card>
              </div>
              {summary?.parentStats && (
                <Card title="家长自主选餐" style={{ marginTop: 12, marginBottom: 16, borderRadius: 10 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic title="选择用餐" value={summary.parentStats.eating} valueStyle={{ color: '#27a644' }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="选择不用餐" value={summary.parentStats.notEating} valueStyle={{ color: '#9a8e7a' }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="未选择" value={summary.parentStats.unselected} valueStyle={{ color: '#f5a623' }} />
                    </Col>
                  </Row>
                </Card>
              )}
              <div className="meal-report-section-heading">
                <div>
                  <Text strong>按班级分组</Text>
                  <Text type="secondary"> 展开查看具体学员与份数</Text>
                </div>
              </div>
              <div className="meal-report-group-list">
                {groupedMealDetails.map((group) => {
                  const expanded = expandedGroups.has(group.groupName)
                  return (
                    <section className="meal-report-class-group" key={group.groupName}>
                      <button
                        type="button"
                        className="meal-report-class-trigger"
                        aria-expanded={expanded}
                        onClick={() => setExpandedGroups((current) => {
                          const next = new Set(current)
                          if (next.has(group.groupName)) next.delete(group.groupName)
                          else next.add(group.groupName)
                          return next
                        })}
                      >
                        <span><strong>{group.groupName}</strong><small>{group.details.length} 人就餐</small></span>
                        {expanded ? <UpOutlined /> : <DownOutlined />}
                      </button>
                      {expanded && (
                        <div className="meal-report-class-details">
                          {group.details.map((detail) => (
                            <div key={`${group.groupName}-${detail.studentId}`}>
                              <span>{detail.studentName}</span>
                              <span>{detail.portion === 'double' ? '双份' : '单份'} · {detail.teacherName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )
                })}
                {!groupedMealDetails.length && <Card><Text type="secondary">今日暂无教师上报明细</Text></Card>}
              </div>
              <div className="meal-report-total-row"><span>今日总计</span><strong>{groupedTotal} 人</strong></div>
              <button type="button" className="meal-report-unreported" onClick={() => setShowUnreported((value) => !value)}>
                <span>还有 {summary.unreportedTeachers?.length || 0} 位教师未上报</span>
                {showUnreported ? <UpOutlined /> : <DownOutlined />}
              </button>
              {showUnreported && !!summary.unreportedTeachers?.length && (
                <div className="meal-report-unreported-list">
                  {summary.unreportedTeachers.map((teacher, index) => (
                    <Tag key={teacher.id || `${teacher.name}-${index}`}>{teacher.name || '未命名教师'}{teacher.groupName ? ` · ${teacher.groupName}` : ''}</Tag>
                  ))}
                </div>
              )}
              <Button className="meal-report-export" type="primary" icon={<DownloadOutlined />} onClick={exportToday}>导出 CSV</Button>
            </>
          ),
        },
        {
          key: 'history',
          label: '历史记录',
          children: (
            <>
              <DatePicker picker="week" value={historyWeek} onChange={(value) => value && setHistoryWeek(mondayOf(value))} style={{ marginBottom: 12 }} />
              <Table
                rowKey="id"
                dataSource={historyReports}
                columns={[
                  ...reportColumns,
                  { title: '上报日期', dataIndex: 'reportDate', key: 'reportDate', render: (value: string) => dayjs(value).format('YYYY-MM-DD') },
                  { title: '明细', key: 'details', render: (_value: unknown, report: MealReport) => <Tag>{report.details?.length || 0} 名学员</Tag> },
                ]}
                scroll={isMobile ? { x: 680 } : undefined}
              />
            </>
          ),
        },
      ]} />

      <Modal title="设置周期菜单" open={!!templateEditing} onCancel={() => setTemplateEditing(null)} onOk={saveTemplate} confirmLoading={saving}>
        <Form form={templateForm} layout="vertical">
          <Form.Item name="lunch" label="午餐菜品（如：红烧肉）" rules={[{ required: true, message: '请填写午餐' }]}>
            <Input placeholder="填写今日菜品" />
          </Form.Item>
          <Form.Item name="allowDouble" label="是否允许双倍米饭" valuePropName="checked">
            <Switch checkedChildren="允许" unCheckedChildren="不允许" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
