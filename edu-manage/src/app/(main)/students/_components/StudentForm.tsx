'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, InputNumber, Steps, message, Row, Col, Button, Space } from 'antd'
import { UserOutlined, PhoneOutlined, BookOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const STATUS_OPTIONS = [
  { label: '潜客', value: 'LEAD' },
  { label: '试听', value: 'TRIAL' },
  { label: '在读', value: 'ACTIVE' },
  { label: '结课', value: 'COMPLETED' },
  { label: '离校', value: 'INACTIVE' },
]

const SOURCE_OPTIONS = ['朋友介绍', '网络搜索', '自然到访', '转介绍', '线下活动', '其他']

type Teacher = { id: string; name: string; subjects: string }

export function StudentForm({
  open, onClose, initialData, mode = 'create',
}: {
  open: boolean
  onClose: () => void
  initialData?: Record<string, unknown> | null
  mode?: 'create' | 'edit'
}) {
  const [form] = Form.useForm()
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const isMobile = useIsMobile() ?? false

  useEffect(() => {
    if (open) {
      setCurrent(0)
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          birthYear: initialData.birthYear ? String(initialData.birthYear) : undefined,
        })
      } else {
        form.resetFields()
      }
      fetch('/api/teachers?limit=50').then(r => r.json()).then(d => {
        setTeachers(Array.isArray(d) ? d : (d.teachers || []))
      }).catch(() => {})
    }
  }, [open, initialData, form])

  // Only validate fields visible on the current step
  const stepFields: Record<number, string[]> = {
    0: ['name'],
    1: ['phone', 'parentName', 'parentPhone'],
    2: ['mainTeacherId', 'remainHours'],
  }

  const handleNext = async () => {
    try {
      const fields = stepFields[current] || []
      if (fields.length > 0) {
        await form.validateFields(fields)
      }
      setCurrent(c => c + 1)
    } catch {
      // validation errors shown by form
    }
  }

  const handleFinish = async () => {
    // Final validate: only check name is filled
    try {
      await form.validateFields(['name'])
    } catch {
      return
    }

    setLoading(true)
    try {
      const values = form.getFieldsValue(true)
      if (!values.name || String(values.name).trim().length === 0) {
        setCurrent(0)
        message.error('请输入姓名')
        return
      }

      const url = mode === 'edit' && initialData?.id
        ? `/api/students/${initialData.id}`
        : '/api/students'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        message.error(err?.error || `操作失败：${res.status}`)
        return
      }

      message.success(mode === 'edit' ? '学员信息已更新' : '学员添加成功')
      onClose()
    } catch {
      message.error('提交失败')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { title: '基本信息', icon: <UserOutlined /> },
    { title: '联系信息', icon: <PhoneOutlined /> },
    { title: '课程绑定', icon: <BookOutlined /> },
  ]

  const footer = (
    <Space>
      <Button onClick={onClose}>取消</Button>
      {current > 0 && <Button onClick={() => setCurrent(c => c - 1)}>上一步</Button>}
      {current < 2 && (
        <Button type="primary" onClick={handleNext} style={{ background: '#E87545', borderColor: '#E8784A' }}>
          下一步
        </Button>
      )}
      {current === 2 && (
        <Button type="primary" onClick={handleFinish} loading={loading} style={{ background: '#E87545', borderColor: '#E8784A' }}>
          {mode === 'edit' ? '保存' : '添加学员'}
        </Button>
      )}
    </Space>
  )

  return (
    <Modal
      title={mode === 'edit' ? '编辑学员' : '新增学员'}
      open={open}
      onCancel={onClose}
      footer={footer}
      width={isMobile ? '100%' : 640}
      className={isMobile ? 'ant-modal-mobile' : undefined}
      style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
      styles={isMobile ? { body: { height: 'calc(100vh - 110px)', overflow: 'auto' } } : undefined}
      destroyOnClose
    >
      <Steps current={current} items={steps} size="small" style={{ marginBottom: 24 }} />

      <Form form={form} layout="vertical" size="middle" requiredMark={false}>
        {/* Step 1: 基本信息 */}
        {current === 0 && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="学员姓名（必填）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="性别">
                <Select options={[{ label: '男', value: '男' }, { label: '女', value: '女' }]} placeholder="选填" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="birthYear" label="出生年份">
                <Input placeholder="如 2015" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="grade" label="年级">
                <Input placeholder="如 初一、高一" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="school" label="学校">
                <Input placeholder="所在学校" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source" label="来源渠道">
                <Select options={SOURCE_OPTIONS.map(s => ({ label: s, value: s }))} placeholder="选填" allowClear />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="备注">
                <Input.TextArea rows={2} placeholder="备注信息" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Step 2: 联系信息 */}
        {current === 1 && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="学员电话">
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parentName" label="家长姓名">
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parentPhone" label="家长手机">
                <Input placeholder="选填" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Step 3: 课程绑定 */}
        {current === 2 && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mainTeacherId" label="主教老师">
                <Select placeholder="选填" allowClear
                  options={teachers.map(t => ({ label: `${t.name}（${t.subjects}）`, value: t.id }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remainHours" label="初始课时余额">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            {mode === 'edit' && (
              <Col span={12}>
                <Form.Item name="status" label="学员状态">
                  <Select options={STATUS_OPTIONS} />
                </Form.Item>
              </Col>
            )}
          </Row>
        )}
      </Form>
    </Modal>
  )
}
