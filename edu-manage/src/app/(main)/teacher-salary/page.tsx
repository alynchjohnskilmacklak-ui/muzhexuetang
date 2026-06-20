'use client'

import {
  useState } from 'react'
import useSWR from 'swr'
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { toast } from 'sonner'
import { EditOutlined, EyeOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text, Title } = Typography
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const PERIOD_OPTIONS = [
  { label: '本月', value: 'month' },
  { label: '本周', value: 'week' },
  { label: '全部', value: 'all' },
]

const ONE_ON_ONE_GRADES = ['初一', '初二', '初三', '高一', '高二', '高三'] as const

const TYPE_META: Record<string, { color: string; label: string }> = {
  LESSON_PAY: { color: '#1D9E75', label: '课时薪资' },
  FEEDBACK_BONUS: { color: '#E8784A', label: '反馈奖励' },
}

interface TeacherOption {
  id: string
  name: string
}

interface SalarySummary {
  teacherId: string
  name: string
  lesson: number
  feedback: number
  total: number
}

interface SalaryTransaction {
  id: string
  teacherName: string
  type: string
  amount: number
  description?: string | null
  createdAt: string
}

interface SalaryPayload {
  teachers: TeacherOption[]
  summary: SalarySummary[]
  transactions: SalaryTransaction[]
}

interface FeedbackRecord {
  id: string
  lessonName: string
  status: string
  isValid: boolean
  studentCount: number
  knowledgePoints: string[]
  summary?: string | null
  createdAt: string
}

function SalaryConfigDrawer({ teacherId, teacherName, open, onClose, onSaved }: {
  teacherId: string
  teacherName: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  useSWR(
    open && teacherId ? `/api/admin/salary/config?teacherId=${teacherId}` : null,
    fetcher,
    {
      onSuccess: (data) => form.setFieldsValue({
        groupRateJunior: data.groupRateJunior,
        groupRateSenior: data.groupRateSenior,
        feedbackRateGroup: data.feedbackRateGroup,
        feedbackRateOneOne: data.feedbackRateOneOne,
        ...Object.fromEntries(ONE_ON_ONE_GRADES.map((grade) => [`oo_${grade}`, data.oneOnOneRates?.[grade]])),
      }),
    },
  )

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    const response = await fetch('/api/admin/salary/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        groupRateJunior: values.groupRateJunior,
        groupRateSenior: values.groupRateSenior,
        feedbackRateGroup: values.feedbackRateGroup,
        feedbackRateOneOne: values.feedbackRateOneOne,
        oneOnOneRates: Object.fromEntries(ONE_ON_ONE_GRADES.map((grade) => [grade, values[`oo_${grade}`]])),
      }),
    })
    setSaving(false)
    if (!response.ok) {
      toast.error('保存失败')
      return
    }
    toast.success('薪资配置已保存')
    onSaved()
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`薪资配置 · ${teacherName}`}
      width={420}
      footer={<Space><Button type="primary" loading={saving} onClick={handleSave} style={{ background: '#E8784A' }}>保存</Button><Button onClick={onClose}>取消</Button></Space>}
    >
      <Form form={form} layout="vertical" size="small">
        <Title level={5} style={{ marginTop: 0 }}>班课底薪（元/小时）</Title>
        <Row gutter={12}>
          <Col span={12}><Form.Item label="初中班课" name="groupRateJunior" rules={[{ required: true }]}><InputNumber min={0} max={999} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={12}><Form.Item label="高中班课" name="groupRateSenior" rules={[{ required: true }]}><InputNumber min={0} max={999} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Title level={5}>一对一底薪（元/小时）</Title>
        <Row gutter={12}>
          {ONE_ON_ONE_GRADES.map((grade) => (
            <Col span={8} key={grade}><Form.Item label={grade} name={`oo_${grade}`} rules={[{ required: true }]}><InputNumber min={0} max={999} step={1} style={{ width: '100%' }} /></Form.Item></Col>
          ))}
        </Row>
        <Title level={5}>课堂反馈奖励（元/人）</Title>
        <Row gutter={12}>
          <Col span={12}><Form.Item label="班课" name="feedbackRateGroup" rules={[{ required: true }]}><InputNumber min={0} max={99} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={12}><Form.Item label="一对一" name="feedbackRateOneOne" rules={[{ required: true }]}><InputNumber min={0} max={99} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Text type="secondary" style={{ fontSize: 11 }}>修改后仅影响未来薪资，已发放记录不会追溯修改。</Text>
      </Form>
    </Drawer>
  )
}

function FeedbackTab({ teacherId }: { teacherId: string }) {
  const { data, isLoading } = useSWR<{ feedbacks: FeedbackRecord[] }>(`/api/admin/classroom-feedback?teacherId=${teacherId}&limit=50`, fetcher)
  const feedbacks = data?.feedbacks ?? []
  const columns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { title: '班级', dataIndex: 'lessonName', key: 'lessonName', width: 140, render: (value: string) => value || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (value: string) => <Tag color={value === 'PUBLISHED' ? 'green' : 'orange'} style={{ borderRadius: 999 }}>{value === 'PUBLISHED' ? '已发布' : '草稿'}</Tag> },
    { title: '有效', dataIndex: 'isValid', key: 'isValid', width: 80, render: (value: boolean) => <Tag color={value ? 'green' : 'red'} style={{ borderRadius: 999 }}>{value ? '有效' : '无效'}</Tag> },
    { title: '学员数', dataIndex: 'studentCount', key: 'studentCount', width: 80, align: 'right' as const },
    { title: '知识点', dataIndex: 'knowledgePoints', key: 'knowledgePoints', render: (value: string[]) => (value ?? []).slice(0, 3).map((item) => <Tag key={item}>{item}</Tag>) },
    { title: '课堂小结', dataIndex: 'summary', key: 'summary', ellipsis: true, render: (value?: string | null) => value || '-' },
  ]
  return <Table dataSource={feedbacks} columns={columns} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 860 }} locale={{ emptyText: '暂无反馈记录' }} />
}

export default function TeacherSalaryAdminPage() {
  const isMobile = useIsMobile() ?? false
  const [period, setPeriod] = useState('month')
  const [filterTeacher, setFilterTeacher] = useState('')
  const [configDrawer, setConfigDrawer] = useState({ open: false, teacherId: '', teacherName: '' })
  const [feedbackDrawer, setFeedbackDrawer] = useState({ open: false, teacherId: '', teacherName: '' })
  const query = filterTeacher ? `period=${period}&teacherId=${filterTeacher}` : `period=${period}`
  const { data, isLoading, mutate } = useSWR<SalaryPayload>(`/api/admin/salary?${query}`, fetcher)

  const teachers = data?.teachers ?? []
  const summary = data?.summary ?? []
  const transactions = data?.transactions ?? []
  const totalAll = summary.reduce((sum, item) => sum + item.total, 0)

  const summaryColumns = [
    { title: '教师', dataIndex: 'name', key: 'name', render: (name: string) => <Text strong>{name}</Text> },
    { title: '课时薪资', dataIndex: 'lesson', key: 'lesson', width: 110, align: 'right' as const, render: (value: number) => <Text style={{ color: '#1D9E75' }}>¥{value.toFixed(2)}</Text> },
    { title: '反馈奖励', dataIndex: 'feedback', key: 'feedback', width: 110, align: 'right' as const, render: (value: number) => <Text style={{ color: '#E8784A' }}>¥{value.toFixed(2)}</Text> },
    { title: '合计', dataIndex: 'total', key: 'total', width: 110, align: 'right' as const, render: (value: number) => <Text strong>¥{value.toFixed(2)}</Text> },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, row: SalarySummary) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => setConfigDrawer({ open: true, teacherId: row.teacherId, teacherName: row.name })}>配置</Button>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setFeedbackDrawer({ open: true, teacherId: row.teacherId, teacherName: row.name })}>反馈</Button>
        </Space>
      ),
    },
  ]

  const detailColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName', width: 100 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 110, render: (value: string) => <Tag color={TYPE_META[value]?.color ?? 'default'} style={{ borderRadius: 999 }}>{TYPE_META[value]?.label ?? value}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true, render: (value?: string | null) => value || '-' },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' as const, render: (value: number) => <Text strong style={{ color: '#1D9E75' }}>+¥{value.toFixed(2)}</Text> },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>教师薪资管理</Title>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={(value) => setPeriod(value as string)} />
          <Select
            allowClear
            placeholder="筛选教师"
            value={filterTeacher || undefined}
            onChange={(value) => setFilterTeacher(value ?? '')}
            options={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
            style={{ width: 160 }}
          />
        </Space>

        <Card bordered={false} style={{ borderRadius: 8, background: 'linear-gradient(135deg,#E8784A,#f0976a)' }}>
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,.82)', fontSize: 13 }}>总薪资支出（{PERIOD_OPTIONS.find((item) => item.value === period)?.label}）</span>}
            value={totalAll}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#fff', fontWeight: 700, fontSize: isMobile ? 22 : 28 }}
            loading={isLoading}
          />
        </Card>

        <Tabs
          items={[
            {
              key: 'summary',
              label: '按教师汇总',
              children: <Table dataSource={summary} columns={summaryColumns} rowKey="teacherId" loading={isLoading} pagination={false} size="small" scroll={{ x: isMobile ? 680 : undefined }} locale={{ emptyText: '暂无数据' }} />,
            },
            {
              key: 'detail',
              label: '全部流水',
              children: <Table dataSource={transactions} columns={detailColumns} rowKey="id" loading={isLoading} pagination={{ pageSize: 30, hideOnSinglePage: true }} size="small" scroll={{ x: isMobile ? 680 : undefined }} locale={{ emptyText: '暂无数据' }} />,
            },
          ]}
        />
      </Space>

      <SalaryConfigDrawer {...configDrawer} onClose={() => setConfigDrawer((prev) => ({ ...prev, open: false }))} onSaved={() => mutate()} />
      <Drawer open={feedbackDrawer.open} onClose={() => setFeedbackDrawer((prev) => ({ ...prev, open: false }))} title={`课堂反馈 · ${feedbackDrawer.teacherName}`} width={isMobile ? '100%' : 860}>
        {feedbackDrawer.open && <FeedbackTab teacherId={feedbackDrawer.teacherId} />}
      </Drawer>
    </div>
  )
}
