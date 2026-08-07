'use client'

import { type ReactNode, useState } from 'react'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Avatar, Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Progress, Radio, Row, Select, Spin, Statistic, Table, Tag, message } from 'antd'
import { ArrowLeftOutlined, BookOutlined, CalendarOutlined, CheckCircleOutlined, DisconnectOutlined, DownloadOutlined, HeartOutlined, HistoryOutlined, LinkOutlined, MessageOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { ImageUploader } from '@/app/(main)/performance/_components/ImageUploader'
import { formatDeducted, formatRemaining } from '@/lib/lesson-units'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { StudentGrowthArchive } from '@/lib/student-growth/archive'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

type EnrollmentLine = {
  id: string
  remainHours?: number | null
  totalHours?: number | null
  group?: {
    name?: string | null
    lessonMinutes?: number | null
    course?: { name?: string | null; type?: string | null } | null
  } | null
}

function enrollmentBalanceLines(enrollments: EnrollmentLine[] | undefined, fallbackRemain: number, fallbackTotal: number) {
  if (!Array.isArray(enrollments) || !enrollments.length) {
    return [`剩余 ${formatRemaining(fallbackRemain, null, 40).text} / 共 ${formatRemaining(fallbackTotal, null, 40).text}`]
  }
  return enrollments.map((enrollment) => {
    const group = enrollment.group
    const label = group?.name || group?.course?.name || '课程'
    const courseType = group?.course?.type || null
    const lessonMinutes = Number(group?.lessonMinutes || 40)
    const remain = formatRemaining(Number(enrollment.remainHours || 0), courseType, lessonMinutes).text
    const total = formatRemaining(Number(enrollment.totalHours || 0), courseType, lessonMinutes).text
    return `${label}：剩余 ${remain} / 共 ${total}`
  })
}

function attendanceDeductedText(record: any) {
  const group = record.lesson?.group || record.enrollment?.group
  return formatDeducted(Number(record.hoursDeducted || 0), group?.course?.type || null, Number(group?.lessonMinutes || 40))
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const { data: student, isLoading, mutate } = useSWR(params.id ? `/api/students/${params.id}` : null, fetcher)
  const { data: growthArchive, isLoading: growthLoading, error: growthError } = useSWR<StudentGrowthArchive>(
    params.id ? `/api/admin/students/${params.id}/growth-archive` : null,
    fetcher,
  )
  const { data: parentAccountsData } = useSWR('/api/settings/parent-accounts', fetcher)
  const [parentModalOpen, setParentModalOpen] = useState(false)
  const [parentMode, setParentMode] = useState<'existing' | 'new'>('existing')
  const [linkingParent, setLinkingParent] = useState(false)
  const [quickPraiseOpen, setQuickPraiseOpen] = useState(false)
  const [growthFeedbackOpen, setGrowthFeedbackOpen] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [quickPraise, setQuickPraise] = useState('')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackMood, setFeedbackMood] = useState('GOOD')
  const [feedbackTags, setFeedbackTags] = useState<string[]>([])
  const [feedbackImages, setFeedbackImages] = useState<string[]>([])
  const [exportingFeedback, setExportingFeedback] = useState(false)
  const [parentForm] = Form.useForm()
  const parentAccounts = Array.isArray(parentAccountsData?.accounts) ? parentAccountsData.accounts : []

  if (isLoading) return <PageLayout title="学员详情"><div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div></PageLayout>
  if (!student) return <PageLayout title="学员详情"><Empty description="学员不存在" /></PageLayout>

  const remainHours = Number(student.remainHours || 0)
  const totalHours = Number(student.totalHours || 0)
  const prepaidUsedHours = Math.max(0, totalHours - remainHours)
  const taughtHours = Number(student.taughtHours || 0)
  const balanceLines = enrollmentBalanceLines(student.enrollments, remainHours, totalHours)

  const unlinkParent = async () => {
    Modal.confirm({
      title: '解除家长账号绑定',
      content: `确定解除 ${student.name} 与当前家长账号的绑定吗？`,
      okText: '确认解绑',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await fetch(`/api/students/${student.id}/link-parent`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          message.error(data.error || '解绑失败')
          return
        }
        message.success('已解绑家长账号')
        mutate()
      },
    })
  }

  const submitParentLink = async () => {
    const values = await parentForm.validateFields()
    setLinkingParent(true)
    try {
      const res = await fetch(`/api/students/${student.id}/link-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: parentMode, ...values }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        message.error(data.error || '操作失败')
        return
      }
      message.success(data.message || '绑定成功')
      setParentModalOpen(false)
      parentForm.resetFields()
      mutate()
      if (data.email && data.password) {
        Modal.success({
          title: '家长账号已创建',
          content: (
            <div>
              <p>登录账号：<strong>{data.email}</strong></p>
              <p>初始密码：<strong>{data.password}</strong></p>
              <p style={{ color: '#98A2B3', fontSize: 12 }}>请告知家长，首次登录后可修改密码。</p>
            </div>
          ),
        })
      }
    } finally {
      setLinkingParent(false)
    }
  }

  const submitStudentFeedback = async (quick: boolean) => {
    const content = (quick ? quickPraise : feedbackContent).trim()
    if (!content) {
      message.error(quick ? '请填写表扬内容' : '请填写成长反馈')
      return
    }
    setSubmittingFeedback(true)
    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          type: quick ? 'HIGHLIGHT' : 'DAILY',
          mood: quick ? 'GREAT' : feedbackMood,
          visibility: 'PARENT_ONLY',
          content,
          tags: quick ? ['表扬'] : feedbackTags,
          images: quick ? [] : feedbackImages,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '发送失败')
      message.success(quick ? '表扬已发送给家长' : '成长反馈已发送给家长')
      if (quick) {
        setQuickPraise('')
        setQuickPraiseOpen(false)
      } else {
        setFeedbackContent('')
        setFeedbackMood('GOOD')
        setFeedbackTags([])
        setFeedbackImages([])
        setGrowthFeedbackOpen(false)
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发送失败，请重试')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const exportFeedbackArchive = async () => {
    setExportingFeedback(true)
    try {
      const loadPage = async (page: number) => {
        const response = await fetch(
          `/api/admin/students/${student.id}/feedback-archive?page=${page}&pageSize=100`,
        )
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '反馈档案加载失败')
        return payload
      }
      const firstPage = await loadPage(1)
      const remainingPages = await Promise.all(
        Array.from(
          { length: Math.max(0, firstPage.pagination.totalPages - 1) },
          (_value, index) => loadPage(index + 2),
        ),
      )
      const archive = {
        ...firstPage,
        items: [firstPage, ...remainingPages].flatMap((page) => page.items),
      }
      const { renderParentFeedbackPdf } = await import('@/lib/classroom-feedback/parent-pdf')
      const { blob, embeddedImages, skippedImages } = await renderParentFeedbackPdf(archive)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${student.name}_家长版课堂反馈.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      if (skippedImages) {
        message.warning(
          `PDF已导出，已加入${embeddedImages}张课堂照片，另有${skippedImages}张读取失败`,
        )
      } else if (embeddedImages) {
        message.success(`家长版课堂反馈PDF已导出，已加入${embeddedImages}张课堂照片`)
      } else {
        message.success('家长版课堂反馈PDF已导出')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExportingFeedback(false)
    }
  }

  return (
    <PageLayout
      title={student.name}
      subtitle={`${student.grade || '未设年级'} · ${student.school || '未填写学校'} · ${student.status || '-'}`}
      actions={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<DownloadOutlined />} loading={exportingFeedback} onClick={exportFeedbackArchive}>导出家长版PDF</Button>
        <Button icon={<HistoryOutlined />} onClick={() => router.push(`/students/${student.id}/feedback-archive`)}>课堂反馈档案</Button>
        <Button icon={<HeartOutlined />} style={{ background: '#1D9E75', borderColor: '#1D9E75', color: '#ffffff' }} onClick={() => setQuickPraiseOpen(true)}>快速表扬</Button>
        <Button icon={<MessageOutlined />} style={{ background: '#534AB7', borderColor: '#534AB7', color: '#ffffff' }} onClick={() => setGrowthFeedbackOpen(true)}>成长反馈</Button>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/students')}>返回学员管理</Button>
      </div>}
    >
      <StudentGrowthArchivePanel
        archive={growthArchive}
        loading={growthLoading}
        error={growthError as Error | undefined}
        isMobile={isMobile}
        onViewAllFeedback={() => router.push(`/students/${student.id}/feedback-archive`)}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><Metric title="课程余额" value={balanceLines.slice(0, 2)} /></Col>
        <Col xs={12} lg={6}><Metric title="累计已上" value={`${taughtHours.toFixed(1)} 小时`} /></Col>
        <Col xs={12} lg={6}><Metric title="考勤记录" value={student.attendances?.length || 0} /></Col>
        <Col xs={12} lg={6}><Metric title="缴费记录" value={student.fees?.length || 0} /></Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Descriptions column={2} size="small" labelStyle={{ color: '#98A2B3' }} contentStyle={{ color: '#1F2329' }}>
          <Descriptions.Item label="姓名">{student.name}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag>{student.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="电话">{student.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="家长账号" span={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {student.parent ? (
                <>
                  <Tag color="green" icon={<LinkOutlined />}>
                    {student.parent.name || '家长'}（{student.parent.email}）
                  </Tag>
                  <Button size="small" danger icon={<DisconnectOutlined />} onClick={unlinkParent}>解绑</Button>
                </>
              ) : (
                <Tag color="orange">未绑定家长账号</Tag>
              )}
              <Button
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => {
                  setParentMode('existing')
                  setParentModalOpen(true)
                  parentForm.resetFields()
                }}
              >
                {student.parent ? '更换/合并家长账号' : '绑定家长账号'}
              </Button>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="家长电话">{student.parentPhone || '-'}</Descriptions.Item>
          <Descriptions.Item label="主教老师">{student.mainTeacher?.name || '-'}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 18 }}>
          <div style={{ color: '#98A2B3', marginBottom: 6 }}>课时进度</div>
          <Progress percent={totalHours ? Math.round((prepaidUsedHours / totalHours) * 100) : 0} strokeColor="#E8784A" />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="考勤记录" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.attendances || []}
              columns={[
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
                { title: '扣课时', key: 'hoursDeducted', render: (_: unknown, record: any) => attendanceDeductedText(record) },
                { title: '日期', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleDateString('zh-CN') },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="缴费记录" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.fees || []}
              columns={[
                { title: '类型', dataIndex: 'type' },
                { title: '金额', dataIndex: 'amount' },
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={`快速表扬 · ${student.name}`}
        open={quickPraiseOpen}
        onCancel={() => setQuickPraiseOpen(false)}
        onOk={() => submitStudentFeedback(true)}
        confirmLoading={submittingFeedback}
        okText="发送表扬"
        cancelText="取消"
        okButtonProps={{ style: { background: '#1D9E75', borderColor: '#1D9E75' } }}
      >
        <Input.TextArea value={quickPraise} onChange={event => setQuickPraise(event.target.value)} maxLength={300} showCount rows={4} placeholder="如：今天主动帮同学讲题，很棒！" />
      </Modal>

      <Modal
        title={`成长反馈 · ${student.name}`}
        open={growthFeedbackOpen}
        onCancel={() => setGrowthFeedbackOpen(false)}
        onOk={() => submitStudentFeedback(false)}
        confirmLoading={submittingFeedback}
        okText="发送反馈"
        cancelText="取消"
        width={640}
        okButtonProps={{ style: { background: '#534AB7', borderColor: '#534AB7' } }}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div><div style={{ marginBottom: 6 }}>反馈内容</div><Input.TextArea value={feedbackContent} onChange={event => setFeedbackContent(event.target.value)} maxLength={300} showCount rows={5} placeholder="记录孩子今天的课堂表现与成长变化" /></div>
          <div><div style={{ marginBottom: 6 }}>课堂状态</div><Radio.Group value={feedbackMood} onChange={event => setFeedbackMood(event.target.value)} optionType="button" buttonStyle="solid" options={[{ label: '很棒', value: 'GREAT' }, { label: '良好', value: 'GOOD' }, { label: '一般', value: 'OKAY' }, { label: '需关注', value: 'NEEDS_ATTENTION' }]} /></div>
          <div><div style={{ marginBottom: 6 }}>表现标签</div><Select mode="tags" value={feedbackTags} onChange={setFeedbackTags} maxCount={20} maxTagCount="responsive" tokenSeparators={[',', '，', '、']} placeholder="输入标签后回车，如：主动提问" style={{ width: '100%' }} /></div>
          <div><div style={{ marginBottom: 6 }}>课堂图片（可选）</div><ImageUploader value={feedbackImages} onChange={setFeedbackImages} /></div>
        </div>
      </Modal>

      <Modal
        title={student.parent ? '更换或合并家长账号' : '绑定家长账号'}
        open={parentModalOpen}
        onCancel={() => setParentModalOpen(false)}
        onOk={submitParentLink}
        confirmLoading={linkingParent}
        okText="确认绑定"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={parentMode}
            onChange={(event) => {
              setParentMode(event.target.value)
              parentForm.resetFields()
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="existing">绑定已有家长账号</Radio.Button>
            <Radio.Button value="new">新建家长账号</Radio.Button>
          </Radio.Group>
        </div>
        <Form form={parentForm} layout="vertical">
          {parentMode === 'existing' ? (
            <Form.Item name="existingParentUserId" label="选择家长账号" rules={[{ required: true, message: '请选择家长账号' }]}>
              <Select
                showSearch
                placeholder="搜索家长姓名或邮箱"
                filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                options={parentAccounts.map((parent: Record<string, unknown>) => {
                  const kids = Array.isArray(parent.students) ? parent.students as Record<string, unknown>[] : []
                  const kidNames = kids.map((kid) => kid.name).filter(Boolean).join('、') || '暂无'
                  return {
                    label: `${parent.name || '家长'}（${parent.email}） · 名下：${kidNames}`,
                    value: parent.id as string,
                  }
                })}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item name="email" label="登录邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
                <Input placeholder="例如：parent@example.com" />
              </Form.Item>
              <Form.Item name="name" label="家长姓名">
                <Input placeholder={`默认：${student.parentName || `${student.name}家长`}`} />
              </Form.Item>
              <Form.Item name="password" label="初始密码">
                <Input placeholder="默认：邮箱前缀" />
              </Form.Item>
            </>
          )}
        </Form>
        {parentMode === 'existing' && (
          <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 8, background: '#f5f2ee', padding: '8px 12px', borderRadius: 6 }}>
            选择已有家长账号后，这个孩子会直接出现在该家长端的孩子列表中。
          </div>
        )}
      </Modal>
    </PageLayout>
  )
}

function Metric({ title, value }: { title: string; value: ReactNode | ReactNode[] }) {
  const isSimple = typeof value === 'number' || typeof value === 'string'
  return (
    <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      {isSimple ? (
        <Statistic title={<span style={{ color: '#98A2B3' }}>{title}</span>} value={value as string | number} valueStyle={{ color: '#1F2329' }} />
      ) : (
        <div>
          <div style={{ color: '#98A2B3', fontSize: 14, marginBottom: 8 }}>{title}</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {(Array.isArray(value) ? value : [value]).map((item, index) => (
              <div key={index} style={{ color: '#1F2329', fontSize: 13, lineHeight: 1.5 }}>{item}</div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function formatArchiveDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '-'
}

function attendanceLabel(status: string) {
  return ({ PRESENT: '出勤', LEAVE: '请假', ABSENT: '缺勤', MAKEUP: '补课' } as Record<string, string>)[status] || status
}

function StudentGrowthArchivePanel({
  archive,
  loading,
  error,
  isMobile,
  onViewAllFeedback,
}: {
  archive?: StudentGrowthArchive
  loading: boolean
  error?: Error
  isMobile: boolean
  onViewAllFeedback: () => void
}) {
  if (loading) {
    return <Card bordered={false} style={{ marginBottom: 16, border: '1px solid var(--color-hairline)', borderRadius: 14 }}><div style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><Spin size="large" /></div></Card>
  }
  if (error || !archive) {
    return <Card bordered={false} style={{ marginBottom: 16, border: '1px solid var(--color-hairline)', borderRadius: 14 }}><Empty description={error?.message || '成长档案暂时无法加载'} /></Card>
  }

  const overviewItems = [
    { label: '累计反馈', value: `${archive.overview.feedbackCount} 次`, icon: <MessageOutlined /> },
    { label: '累计上课', value: `${Number(archive.overview.usedHours || 0) + Number(archive.overview.approvedIntensiveHours || 0)} 小时`, icon: <BookOutlined /> },
    { label: '剩余课时', value: `${archive.overview.remainingHours} 小时`, icon: <CheckCircleOutlined /> },
    { label: '最近反馈', value: formatArchiveDate(archive.overview.latestFeedbackDate), icon: <CalendarOutlined /> },
  ]

  return (
    <section style={{ marginBottom: 24, maxWidth: '100%', overflow: 'hidden' }}>
      <Card bordered={false} style={{ marginBottom: 12, border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar size={isMobile ? 52 : 64} style={{ background: 'var(--color-primary)', color: 'var(--color-surface-1)', fontWeight: 700 }}>
            {archive.student.name.slice(0, 1)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--color-ink)', fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>{archive.student.name}</div>
            <div style={{ color: 'var(--color-ink-muted)', marginTop: 4 }}>{archive.student.grade || '未设置年级'} · {archive.student.className || '未加入班级'}</div>
          </div>
          <Tag icon={<TeamOutlined />} style={{ marginLeft: isMobile ? 0 : 'auto', borderRadius: 9999 }}>{archive.attendance.summary.total} 条考勤记录</Tag>
        </div>
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {overviewItems.map((item) => (
          <Col xs={12} lg={6} key={item.label}>
            <Card bordered={false} style={{ height: '100%', border: '1px solid var(--color-hairline)', borderRadius: 14 }} styles={{ body: { padding: isMobile ? 12 : 16 } }}>
              <div style={{ color: 'var(--color-primary)', fontSize: 18 }}>{item.icon}</div>
              <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginTop: 8 }}>{item.label}</div>
              <div style={{ color: 'var(--color-ink)', fontSize: isMobile ? 16 : 20, fontWeight: 700, marginTop: 2 }}>{item.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="课堂反馈"
        extra={<Button type="link" onClick={onViewAllFeedback}>查看全部反馈</Button>}
        bordered={false}
        style={{ marginBottom: 12, border: '1px solid var(--color-hairline)', borderRadius: 14 }}
      >
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          dataSource={archive.feedback.items}
          columns={[
            { title: '日期', dataIndex: 'date', width: 120, render: formatArchiveDate },
            { title: '学科', dataIndex: 'subject', width: 100, render: (value: string) => <Tag color="orange">{value}</Tag> },
            { title: '教师', dataIndex: ['teacher', 'name'], width: 100 },
            { title: '课堂标签', dataIndex: 'tags', width: 180, render: (tags: string[]) => tags.length ? tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-' },
            { title: '简评', key: 'summary', width: 280, ellipsis: true, render: (_value, record) => record.summary || record.overallComment || '-' },
          ]}
          locale={{ emptyText: <Empty description="暂无课堂反馈" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={10}>
          <Card title="考勤情况" bordered={false} style={{ height: '100%', border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
            <Row gutter={[8, 12]}>
              <Col span={12}><Statistic title="总课次" value={archive.attendance.summary.total} /></Col>
              <Col span={12}><Statistic title="出勤率" value={archive.attendance.summary.rate ?? 0} suffix="%" /></Col>
              <Col span={12}><Statistic title="请假次数" value={archive.attendance.summary.leave} /></Col>
              <Col span={12}><Statistic title="缺勤次数" value={archive.attendance.summary.absent} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="课时情况" bordered={false} style={{ height: '100%', border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
            <Row gutter={[8, 12]} style={{ marginBottom: 12 }}>
              <Col span={8}><Statistic title="购买课时" value={archive.hours.totalHours} /></Col>
              <Col span={8}><Statistic title="已消耗" value={archive.hours.usedHours} /></Col>
              <Col span={8}><Statistic title="剩余" value={archive.hours.remainingHours} /></Col>
            </Row>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              dataSource={archive.hours.transactions}
              columns={[
                { title: '日期', dataIndex: 'createdAt', width: 110, render: formatArchiveDate },
                { title: '类型', dataIndex: 'type', width: 130 },
                { title: '变动', dataIndex: 'amount', width: 90 },
                { title: '原因', dataIndex: 'reason', width: 200, render: (value: string | null) => value || '-' },
              ]}
              locale={{ emptyText: <Empty description="暂无课时流水" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="成绩变化" bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
        {archive.grades.trend.length ? (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            dataSource={archive.grades.trend}
            columns={[
              { title: '日期', dataIndex: 'date', width: 120, render: formatArchiveDate },
              { title: '考试', dataIndex: 'assessmentName', width: 180 },
              { title: '学科', dataIndex: 'subject', width: 100 },
              { title: '成绩', key: 'score', width: 120, render: (_value, record) => `${record.score}/${record.fullScore}` },
              { title: '得分率', dataIndex: 'percentage', width: 100, render: (value: number) => `${value}%` },
            ]}
          />
        ) : <Empty description="暂无成绩数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Card>

      {archive.attendance.recentRecords.length > 0 && (
        <div style={{ marginTop: 8, color: 'var(--color-ink-subtle)', fontSize: 12 }}>
          最近考勤：{formatArchiveDate(archive.attendance.recentRecords[0].date)} · {attendanceLabel(archive.attendance.recentRecords[0].status)}
        </div>
      )}
    </section>
  )
}
