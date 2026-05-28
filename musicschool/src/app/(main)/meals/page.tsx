'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Button, Card, Col, DatePicker, Form, Input, Modal, Row, Statistic, Switch,
  Table, Tabs, Tag, Typography, message,
} from 'antd'
import { DownloadOutlined, EditOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const { TextArea } = Input
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

type MealMenu = {
  id: string | null
  weekStart: string
  dayOfWeek: number
  mainDish: string
  sideDish: string | null
  allowDouble: boolean
  notes: string | null
  source?: 'date' | 'template'
}

type MealTemplate = {
  id: string
  weekday: number
  title: string | null
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  snack: string | null
  note: string | null
}

type MealReport = {
  id: string
  teacher: { id: string; name: string }
  submittedAt: string
  totalCount: number
  riceSingle: number
  riceDouble: number
  details: Array<{ studentId: string; studentName: string; portion: 'single' | 'double' }>
}

type MealSummary = {
  totalCount: number
  singleCount: number
  doubleCount: number
  unreportedTeachers: unknown[]
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

function weekNumber(value: Dayjs) {
  const firstDay = dayjs(`${value.year()}-01-01`).startOf('day')
  const elapsed = value.startOf('day').diff(firstDay, 'day')
  return Math.ceil((elapsed + firstDay.day() + 1) / 7)
}

export default function MealsPage() {
  const isMobile = useIsMobile()
  const [weekStart, setWeekStart] = useState(() => mondayOf(dayjs()))
  const [historyWeek, setHistoryWeek] = useState(() => mondayOf(dayjs()))
  const [menus, setMenus] = useState<MealMenu[]>([])
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [reports, setReports] = useState<MealReport[]>([])
  const [historyReports, setHistoryReports] = useState<MealReport[]>([])
  const [summary, setSummary] = useState<MealSummary>({ totalCount: 0, singleCount: 0, doubleCount: 0, unreportedTeachers: [] })
  const [editing, setEditing] = useState<{ dayOfWeek: number; menu?: MealMenu } | null>(null)
  const [templateEditing, setTemplateEditing] = useState<{ weekday: number; template?: MealTemplate } | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [templateForm] = Form.useForm()
  const today = dayjs().format('YYYY-MM-DD')

  const fetchMenus = useCallback(async () => {
    const res = await fetch(`/api/meals/menu?weekStart=${weekStart.format('YYYY-MM-DD')}`)
    const data = await res.json()
    setMenus(data.menus || [])
  }, [weekStart])

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/admin/meal-templates')
    const data = await res.json()
    setTemplates(data.templates || [])
  }, [])

  const fetchToday = useCallback(async () => {
    const [reportRes, summaryRes] = await Promise.all([
      fetch(`/api/meals/report?date=${today}`),
      fetch(`/api/meals/summary?date=${today}`),
    ])
    const reportData = await reportRes.json()
    const summaryData = await summaryRes.json()
    setReports(reportData.reports || [])
    setSummary(summaryData || {})
  }, [today])

  const fetchHistory = useCallback(async () => {
    const payloads = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      fetch(`/api/meals/report?date=${historyWeek.add(index, 'day').format('YYYY-MM-DD')}`).then((res) => res.json())
    ))
    setHistoryReports(payloads.flatMap((payload) => payload.reports || []))
  }, [historyWeek])

  useEffect(() => { fetchMenus() }, [fetchMenus])
  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => { fetchToday() }, [fetchToday])
  useEffect(() => { fetchHistory() }, [fetchHistory])

  const menuMap = useMemo(() => new Map(menus.map((menu) => [menu.dayOfWeek, menu])), [menus])
  const templateMap = useMemo(() => new Map(templates.map((template) => [template.weekday, template])), [templates])
  const rangeText = `${weekStart.format('YYYY年')}第${weekNumber(weekStart)}周 ${weekStart.format('MM-DD')} ~ ${weekStart.add(5, 'day').format('MM-DD')}`

  const openEditor = (dayOfWeek: number, menu?: MealMenu) => {
    setEditing({ dayOfWeek, menu })
    form.setFieldsValue({
      mainDish: menu?.mainDish,
      sideDish: menu?.sideDish,
      allowDouble: menu?.allowDouble || false,
      notes: menu?.notes,
    })
  }

  const openTemplateEditor = (weekday: number, template?: MealTemplate) => {
    setTemplateEditing({ weekday, template })
    templateForm.setFieldsValue({
      title: template?.title,
      breakfast: template?.breakfast,
      lunch: template?.lunch,
      dinner: template?.dinner,
      snack: template?.snack,
      note: template?.note,
    })
  }

  const saveMenu = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const res = await fetch(editing?.menu ? `/api/meals/menu/${editing.menu.id}` : '/api/meals/menu', {
        method: editing?.menu ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, weekStart: weekStart.format('YYYY-MM-DD'), dayOfWeek: editing?.dayOfWeek }),
      })
      if (!res.ok) throw new Error('save failed')
      message.success('菜单已保存')
      setEditing(null)
      form.resetFields()
      fetchMenus()
    } catch {
      message.error('菜单保存失败')
    } finally {
      setSaving(false)
    }
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
      fetchMenus()
    } catch {
      message.error('周期菜单保存失败')
    } finally {
      setSaving(false)
    }
  }

  const exportToday = () => {
    const summaryRows = reports.map((report) => ({
      教师: report.teacher.name,
      就餐人数: report.totalCount,
      单份人数: report.riceSingle,
      双份人数: report.riceDouble,
      上报时间: dayjs(report.submittedAt).format('YYYY-MM-DD HH:mm'),
    }))
    const detailRows = reports.flatMap((report) => (report.details || []).map((detail) => ({
      学员: detail.studentName,
      教师: report.teacher.name,
      份数: detail.portion === 'double' ? '双份' : '单份',
    })))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), '汇总')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), '明细')
    XLSX.writeFile(workbook, `就餐汇总-${today}.xlsx`)
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
      <Tabs items={[
        {
          key: 'menus',
          label: '本周菜单',
          children: (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 16 }}>
                <Text strong>{rangeText}</Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button icon={<LeftOutlined />} onClick={() => setWeekStart((value) => value.subtract(7, 'day'))}>上一周</Button>
                  <Button onClick={() => setWeekStart(mondayOf(dayjs()))}>本周</Button>
                  <Button icon={<RightOutlined />} onClick={() => setWeekStart((value) => value.add(7, 'day'))}>下一周</Button>
                </div>
              </div>
              <Row gutter={[12, 12]}>
                {WEEKDAYS.map((weekday, index) => {
                  const dayOfWeek = index + 1
                  const menu = menuMap.get(dayOfWeek)
                  const date = weekStart.add(index, 'day')
                  return (
                    <Col key={weekday} xs={24} md={8} xl={4}>
                      <Card style={{ minHeight: 220, borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
                        <Text type="secondary">{weekday} {date.format('M/D')}</Text>
                        {menu ? (
                          <>
                            {menu.source === 'template' && <Tag color="blue">周期菜单</Tag>}
                            <div style={{ fontSize: 24, fontWeight: 700, margin: '12px 0 8px' }}>{menu.mainDish}</div>
                            <Text type="secondary" style={{ display: 'block', minHeight: 42 }}>{menu.sideDish || '未填写菜品'}</Text>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
                              <Text>允许双份</Text>
                              <Switch checked={menu.allowDouble} disabled />
                            </div>
                            <Button icon={<EditOutlined />} onClick={() => openEditor(dayOfWeek, menu.id ? menu : undefined)}>编辑</Button>
                          </>
                        ) : (
                          <Button style={{ marginTop: 48 }} onClick={() => openEditor(dayOfWeek)}>点击设置</Button>
                        )}
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            </>
          ),
        },
        {
          key: 'templates',
          label: '周期菜单',
          children: (
            <Row gutter={[12, 12]}>
              {WEEKDAYS.map((weekday, index) => {
                const dayOfWeek = index + 1
                const template = templateMap.get(dayOfWeek)
                return (
                  <Col key={weekday} xs={24} md={8} xl={4}>
                    <Card style={{ minHeight: 250, borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
                      <Text type="secondary">{weekday}</Text>
                      {template ? (
                        <>
                          <div style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 8px' }}>{template.title || template.lunch || '周期菜单'}</div>
                          <Text style={{ display: 'block' }}>早餐：{template.breakfast || '暂未设置'}</Text>
                          <Text style={{ display: 'block' }}>午餐：{template.lunch || '暂未设置'}</Text>
                          <Text style={{ display: 'block' }}>晚餐：{template.dinner || '暂未设置'}</Text>
                          <Text style={{ display: 'block' }}>加餐：{template.snack || '暂未设置'}</Text>
                          <Text type="secondary" style={{ display: 'block', minHeight: 36, marginTop: 8 }}>{template.note || '无备注'}</Text>
                          <Button icon={<EditOutlined />} style={{ marginTop: 12 }} onClick={() => openTemplateEditor(dayOfWeek, template)}>编辑</Button>
                        </>
                      ) : (
                        <Button style={{ marginTop: 48 }} onClick={() => openTemplateEditor(dayOfWeek)}>点击设置</Button>
                      )}
                    </Card>
                  </Col>
                )
              })}
            </Row>
          ),
        },
        {
          key: 'reports',
          label: '教师上报',
          children: (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>今日 {today}</Text>
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                  ['总就餐人数', summary.totalCount || 0],
                  ['单份', summary.singleCount || 0],
                  ['双份', summary.doubleCount || 0],
                  ['未上报教师', summary.unreportedTeachers?.length || 0],
                ].map(([title, value]) => (
                  <Col xs={12} md={6} key={String(title)}>
                    <Card><Statistic title={title} value={value as number} suffix={title === '未上报教师' ? '位' : '人'} /></Card>
                  </Col>
                ))}
              </Row>
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
              <Table
                rowKey="id"
                dataSource={reports}
                columns={reportColumns}
                pagination={false}
                scroll={isMobile ? { x: 520 } : undefined}
                expandable={{
                  expandedRowRender: (report) => (
                    <Text>{(report.details || []).map((detail) => `${detail.studentName}（${detail.portion === 'double' ? '双份' : '单份'}）`).join('、') || '无明细'}</Text>
                  ),
                }}
              />
              <Button icon={<DownloadOutlined />} style={{ marginTop: 16 }} onClick={exportToday}>导出今日汇总</Button>
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

      <Modal title="编辑菜单" open={!!editing} onCancel={() => setEditing(null)} onOk={saveMenu} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="mainDish" label="主食" rules={[{ required: true, message: '请输入主食' }]}>
            <Input placeholder="如：米饭 / 面条 / 饺子" />
          </Form.Item>
          <Form.Item name="sideDish" label="菜品">
            <TextArea rows={3} placeholder="如：红烧肉、炒青菜、番茄蛋汤" />
          </Form.Item>
          <Form.Item name="allowDouble" label="是否允许双份主食" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="设置周期菜单" open={!!templateEditing} onCancel={() => setTemplateEditing(null)} onOk={saveTemplate} confirmLoading={saving}>
        <Form form={templateForm} layout="vertical">
          <Form.Item name="title" label="标题">
            <Input placeholder="如：暑假固定菜单" />
          </Form.Item>
          <Form.Item name="breakfast" label="早餐">
            <Input />
          </Form.Item>
          <Form.Item name="lunch" label="午餐" rules={[{ required: true, message: '请填写午餐' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dinner" label="晚餐">
            <Input />
          </Form.Item>
          <Form.Item name="snack" label="加餐">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
