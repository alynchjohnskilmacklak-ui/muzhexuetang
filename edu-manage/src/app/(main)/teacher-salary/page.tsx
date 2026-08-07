'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
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
import { DeleteOutlined, DollarOutlined, DownloadOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
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
  LESSON_PAY_ADJUSTMENT: { color: '#C77F00', label: '课时薪资结算调整' },
  FEEDBACK_BONUS: { color: '#E8784A', label: '反馈奖励' },
  manual_adjust: { color: '#534AB7', label: '手动调整' },
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
  adjustment: number
  smallClass: number
  intensive: number
  feedbackCount: number
  rewardCount: number
  total: number
}

interface SalaryTransaction {
  id: string
  teacherId: string
  teacherName: string
  type: string
  salaryBucket: 'SMALL_CLASS' | 'INTENSIVE'
  amount: number
  description?: string | null
  createdAt: string
}

function SalaryAdjustmentModal({ teacherId, teacherName, open, onClose, onSaved }: {
  teacherId: string
  teacherName: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const response = await fetch('/api/admin/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          amount: values.amount,
          description: values.description.trim(),
          salaryBucket: values.salaryBucket,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '调整失败')
      message.success('工资调整已记录')
      form.resetFields()
      onSaved()
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '调整失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`手动调整工资 · ${teacherName}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText="确定调整"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false} initialValues={{ salaryBucket: 'SMALL_CLASS' }}>
        <Form.Item
          label="工资归属"
          name="salaryBucket"
          rules={[{ required: true, message: '请选择工资归属' }]}
        >
          <Segmented
            block
            options={[
              { label: '小班课薪资', value: 'SMALL_CLASS' },
              { label: '一对一/二/三薪资', value: 'INTENSIVE' },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="调整金额（元）"
          name="amount"
          extra="正数表示增加工资，负数表示扣减工资"
          rules={[
            { required: true, message: '请输入调整金额' },
            { validator: (_, value) => typeof value === 'number' && Number.isFinite(value) && value !== 0 ? Promise.resolve() : Promise.reject(new Error('金额必须是非0有效数字')) },
          ]}
        >
          <InputNumber inputMode="decimal" precision={2} step={10} placeholder="例如：100 或 -50" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="调整原因" name="description" rules={[{ required: true, whitespace: true, message: '请填写调整原因' }]}>
          <Input.TextArea rows={3} maxLength={200} showCount placeholder="例如：6月优势工资补差" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

interface SalaryPayload {
  teachers: TeacherOption[]
  summary: SalarySummary[]
  transactions: SalaryTransaction[]
  total: number
  page: number
  limit: number
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
      message.error('保存失败')
      return
    }
    message.success('薪资配置已保存')
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
  const [salaryBucket, setSalaryBucket] = useState<'ALL' | 'SMALL_CLASS' | 'INTENSIVE'>('ALL')
  const [configDrawer, setConfigDrawer] = useState({ open: false, teacherId: '', teacherName: '' })
  const [feedbackDrawer, setFeedbackDrawer] = useState({ open: false, teacherId: '', teacherName: '' })
  const [adjustmentModal, setAdjustmentModal] = useState({ open: false, teacherId: '', teacherName: '' })
  const [pendingDelete, setPendingDelete] = useState<SalaryTransaction | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [transactionPage, setTransactionPage] = useState(1)
  const [exportingTeacherId, setExportingTeacherId] = useState('')
  const transactionPageSize = 50
  const query = new URLSearchParams({ period, page: String(transactionPage), limit: String(transactionPageSize) })
  if (filterTeacher) query.set('teacherId', filterTeacher)
  if (salaryBucket !== 'ALL') query.set('bucket', salaryBucket)
  const { data, isLoading, mutate } = useSWR<SalaryPayload>(`/api/admin/salary?${query.toString()}`, fetcher)

  useEffect(() => {
    setTransactionPage(1)
  }, [period, filterTeacher, salaryBucket])

  const teachers = data?.teachers ?? []
  const summary = data?.summary ?? []
  const transactions = data?.transactions ?? []
  const totalAll = summary.reduce((sum, item) => sum + item.total, 0)
  const totalSmallClass = summary.reduce((sum, item) => sum + item.smallClass, 0)
  const totalIntensive = summary.reduce((sum, item) => sum + item.intensive, 0)

  const exportTeacherSalary = async (teacherId: string, teacherName: string) => {
    if (exportingTeacherId) return
    setExportingTeacherId(teacherId)
    message.loading({ content: `正在导出${teacherName}老师的薪资流水...`, key: 'salary-export' })
    try {
      const params = new URLSearchParams({ teacherId, period })
      const response = await fetch(`/api/admin/salary/export?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || '导出失败')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
      const filename = encodedName ? decodeURIComponent(encodedName) : `${teacherName}老师薪资流水.xlsx`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      message.success({ content: '薪资核对表已导出，五类工资已分别汇总并附完整明细', key: 'salary-export' })
    } catch (error) {
      message.error({ content: error instanceof Error ? error.message : '导出失败', key: 'salary-export' })
    } finally {
      setExportingTeacherId('')
    }
  }

  const deleteManualAdjustment = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/salary?id=${encodeURIComponent(pendingDelete.id)}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '删除失败')
      message.success('手动调整已删除')
      setPendingDelete(null)
      await mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const summaryColumns = [
    { title: '教师', dataIndex: 'name', key: 'name', render: (name: string) => <Text strong>{name}</Text> },
    { title: '小班课薪资', dataIndex: 'smallClass', key: 'smallClass', width: 120, align: 'right' as const, render: (value: number) => <Text style={{ color: '#1D9E75' }}>¥{value.toFixed(2)}</Text> },
    { title: '个性化课程薪资', dataIndex: 'intensive', key: 'intensive', width: 145, align: 'right' as const, render: (value: number) => <Text style={{ color: '#534AB7' }}>¥{value.toFixed(2)}</Text> },
    { title: '课时工资', dataIndex: 'lesson', key: 'lesson', width: 110, align: 'right' as const, render: (value: number) => `¥${value.toFixed(2)}` },
    { title: '反馈奖励', dataIndex: 'feedback', key: 'feedback', width: 110, align: 'right' as const, render: (value: number) => `¥${value.toFixed(2)}` },
    { title: '管理调整', dataIndex: 'adjustment', key: 'adjustment', width: 110, align: 'right' as const, render: (value: number) => `¥${value.toFixed(2)}` },
    { title: '反馈次数', dataIndex: 'feedbackCount', key: 'feedbackCount', width: 90, align: 'right' as const },
    { title: '奖励次数', dataIndex: 'rewardCount', key: 'rewardCount', width: 90, align: 'right' as const },
    { title: '合计', dataIndex: 'total', key: 'total', width: 110, align: 'right' as const, render: (value: number) => <Text strong>¥{value.toFixed(2)}</Text> },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: unknown, row: SalarySummary) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => setConfigDrawer({ open: true, teacherId: row.teacherId, teacherName: row.name })}>配置</Button>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setFeedbackDrawer({ open: true, teacherId: row.teacherId, teacherName: row.name })}>反馈</Button>
          <Button size="small" icon={<DollarOutlined />} onClick={() => setAdjustmentModal({ open: true, teacherId: row.teacherId, teacherName: row.name })}>调整</Button>
          <Button size="small" icon={<DownloadOutlined />} loading={exportingTeacherId === row.teacherId} disabled={Boolean(exportingTeacherId) && exportingTeacherId !== row.teacherId} onClick={() => exportTeacherSalary(row.teacherId, row.name)}>导出</Button>
        </Space>
      ),
    },
  ]

  const detailColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName', width: 100 },
    {
      title: '薪资归属',
      dataIndex: 'salaryBucket',
      key: 'salaryBucket',
      width: 125,
      render: (value: SalaryTransaction['salaryBucket']) => (
        <Tag color={value === 'INTENSIVE' ? 'purple' : 'green'} style={{ borderRadius: 999 }}>
          {value === 'INTENSIVE' ? '一对一/二/三' : '小班课'}
        </Tag>
      ),
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 110, render: (value: string) => <Tag color={TYPE_META[value]?.color ?? 'default'} style={{ borderRadius: 999 }}>{TYPE_META[value]?.label ?? value}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true, render: (value?: string | null) => value || '-' },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 110, align: 'right' as const,
      render: (value: number) => <Text strong style={{ color: value >= 0 ? '#1D9E75' : '#E24B4A' }}>{value >= 0 ? '+' : '-'}¥{Math.abs(value).toFixed(2)}</Text>,
    },
    {
      title: '操作', key: 'action', width: 80, align: 'center' as const,
      render: (_: unknown, row: SalaryTransaction) => row.type === 'manual_adjust'
        ? <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={() => setPendingDelete(row)}>删除</Button>
        : null,
    },
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
          <Segmented
            value={salaryBucket}
            onChange={(value) => setSalaryBucket(value as typeof salaryBucket)}
            options={[
              { label: '全部流水', value: 'ALL' },
              { label: '小班课', value: 'SMALL_CLASS' },
              { label: '一对一/二/三', value: 'INTENSIVE' },
            ]}
          />
        </Space>

        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ height: '100%', borderRadius: 14, background: 'linear-gradient(135deg,#E8784A,#f0976a)' }}>
              <Statistic title={<span style={{ color: 'rgba(255,255,255,.82)' }}>教师工资总和</span>} value={totalAll} precision={2} prefix="¥" valueStyle={{ color: '#fff', fontWeight: 800 }} loading={isLoading} />
              <Text style={{ color: 'rgba(255,255,255,.82)', fontSize: 12 }}>小班课＋个性化课程</Text>
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card bordered={false} style={{ height: '100%', borderRadius: 14 }}>
              <Statistic title="小班课薪资" value={totalSmallClass} precision={2} prefix="¥" valueStyle={{ color: '#1D9E75' }} loading={isLoading} />
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card bordered={false} style={{ height: '100%', borderRadius: 14 }}>
              <Statistic title="一对一/二/三薪资" value={totalIntensive} precision={2} prefix="¥" valueStyle={{ color: '#534AB7' }} loading={isLoading} />
            </Card>
          </Col>
        </Row>

        <Tabs
          items={[
            {
              key: 'summary',
              label: '按教师汇总',
              children: <Table dataSource={summary} columns={summaryColumns} rowKey="teacherId" loading={isLoading} pagination={false} size="small" scroll={{ x: isMobile ? 680 : undefined }} locale={{ emptyText: '暂无数据' }} />,
            },
            {
              key: 'detail',
              label: salaryBucket === 'INTENSIVE' ? '一对一/二/三流水' : salaryBucket === 'SMALL_CLASS' ? '小班课流水' : '全部流水',
              children: <Table dataSource={transactions} columns={detailColumns} rowKey="id" loading={isLoading} pagination={{ current: transactionPage, pageSize: transactionPageSize, total: data?.total ?? 0, showSizeChanger: false, hideOnSinglePage: true, showTotal: (total) => `共 ${total} 条流水`, onChange: setTransactionPage }} size="small" scroll={{ x: isMobile ? 680 : undefined }} locale={{ emptyText: '暂无数据' }} />,
            },
          ]}
        />
      </Space>

      <SalaryConfigDrawer {...configDrawer} onClose={() => setConfigDrawer((prev) => ({ ...prev, open: false }))} onSaved={() => mutate()} />
      <SalaryAdjustmentModal {...adjustmentModal} onClose={() => setAdjustmentModal((prev) => ({ ...prev, open: false }))} onSaved={() => mutate()} />
      <Modal
        title="删除手动调整"
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onOk={deleteManualAdjustment}
        okText="删除"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        confirmLoading={deleting}
        destroyOnHidden
      >
        <Text>确定删除“{pendingDelete?.description || '手动调整'}”这条流水吗？删除后工资合计会同步变化。</Text>
      </Modal>
      <Drawer open={feedbackDrawer.open} onClose={() => setFeedbackDrawer((prev) => ({ ...prev, open: false }))} title={`课堂反馈 · ${feedbackDrawer.teacherName}`} width={isMobile ? '100%' : 860}>
        {feedbackDrawer.open && <FeedbackTab teacherId={feedbackDrawer.teacherId} />}
      </Drawer>
    </div>
  )
}
