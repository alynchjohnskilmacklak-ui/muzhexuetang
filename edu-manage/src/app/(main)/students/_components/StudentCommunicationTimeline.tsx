'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import {
  CalendarOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import {
  COMMUNICATION_TYPE_META,
  type CommunicationLogEntry,
  type CommunicationLogType,
} from '@/lib/student-communications'
import { BrandModal } from '@/components/Common/BrandModal'

const { Text, Paragraph } = Typography
const { TextArea } = Input

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('加载失败')
  return res.json()
})

export function StudentCommunicationTimeline({
  studentId,
  studentName,
  isMobile,
}: {
  studentId: string
  studentName: string
  isMobile?: boolean
}) {
  const { data, isLoading, mutate } = useSWR(
    `/api/students/${studentId}/communications`,
    fetcher
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const logs: CommunicationLogEntry[] = Array.isArray(data?.logs) ? data.logs : []

  const handleCreate = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/students/${studentId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: values.type,
          content: values.content,
          operatorName: values.operatorName,
          nextFollowUpDate: values.nextFollowUpDate || null,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        toast.error(payload.error || '登记失败')
        return
      }
      toast.success('家校回访记录已成功登记')
      setModalOpen(false)
      form.resetFields()
      await mutate()
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card
      title={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CustomerServiceOutlined style={{ color: 'var(--color-primary)' }} />
          <span>家校沟通与回访台账</span>
          <Tag color="cyan">{logs.length} 条记录</Tag>
        </div>
      )}
      extra={(
        <Space size={8}>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
          >
            登记回访
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => mutate()} />
        </Space>
      )}
      bordered={false}
      style={{
        borderRadius: 14,
        marginBottom: 16,
        background: '#ffffff',
        border: '1px solid #EDE9E1',
        boxShadow: '0 2px 8px rgba(23,47,41,.05)',
      }}
    >
      {isLoading ? (
        <div style={{ padding: '30px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : logs.length === 0 ? (
        <Empty
          description="暂无家校沟通或回访记录，点击右上角【登记回访】记录沟通流水"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div style={{ padding: '10px 4px 0' }}>
          <Timeline
            items={logs.map((item) => {
              const meta = COMMUNICATION_TYPE_META[item.type] || COMMUNICATION_TYPE_META.OTHER
              const isMsg = item.source === 'PARENT_MESSAGE'
              return {
                color: meta.color,
                children: (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 8px',
                        borderRadius: 4,
                        color: meta.color,
                        background: meta.bg,
                      }}>
                        {item.typeName || meta.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {item.operatorName}
                      </span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {item.createdAt.slice(0, 16).replace('T', ' ')}
                      </span>
                      {item.nextFollowUpDate && (
                        <span style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: '#FFF1EB',
                          color: '#E8784A',
                        }}>
                          待跟进：{item.nextFollowUpDate}
                        </span>
                      )}
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isMsg ? '#F9FBFD' : '#FAF8F5',
                      border: `1px solid ${isMsg ? '#E1EBF5' : '#EEE7E1'}`,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#1F2937',
                    }}>
                      {item.content}
                    </div>
                  </div>
                ),
              }
            })}
          />
        </div>
      )}

      {/* 登记沟通回访弹窗 */}
      <BrandModal
        title={`登记家校回访 · ${studentName}`}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="保存回访记录"
        width={isMobile ? '100%' : 520}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'PHONE', operatorName: '教研老师' }}
          style={{ marginTop: 14 }}
        >
          <Form.Item name="type" label="沟通形式" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="PHONE">电话回访</Radio.Button>
              <Radio.Button value="MEETING">课后面谈</Radio.Button>
              <Radio.Button value="WECHAT">微信沟通</Radio.Button>
              <Radio.Button value="RENEWAL">续费跟进</Radio.Button>
              <Radio.Button value="COMPLAINT">异常安抚</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="content"
            label="沟通摘要与反馈"
            rules={[{ required: true, message: '请填写沟通内容与家长反馈' }]}
          >
            <TextArea
              rows={4}
              placeholder="记录与家长的沟通重点，例如：反馈近期数学上课积极性提升，提醒家长配合督促周中错题整理..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="operatorName" label="跟进沟通人" rules={[{ required: true }]}>
              <Input placeholder="例如：胡思同老师 / 教研主管" maxLength={20} />
            </Form.Item>
            <Form.Item name="nextFollowUpDate" label="下次跟进日期（选填）">
              <Input type="date" placeholder="选择跟进日期" />
            </Form.Item>
          </div>
        </Form>
      </BrandModal>
    </Card>
  )
}
