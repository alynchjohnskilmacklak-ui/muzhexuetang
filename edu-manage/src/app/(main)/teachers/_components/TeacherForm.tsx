'use client'

import { useEffect, useState } from 'react'
import NextImage from 'next/image'
import { Alert, Modal, Form, Input, Select, InputNumber, Steps, message, Row, Col, Button, Space, DatePicker, Upload } from 'antd'
import { UserOutlined, BookOutlined, IdcardOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import dayjs from 'dayjs'
import { ALL_SUBJECTS } from '@/constants/subjects'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'
import { TIER_OPTIONS } from '@/constants/teacher-tier'

const EDU_OPTIONS = ['本科', '硕士', '博士在读', '博士', '其他'].map(value => ({ label: value, value }))

export function TeacherForm({
  open, onClose, initialData, mode = 'create',
}: { open: boolean; onClose: () => void; initialData?: Record<string, unknown> | null; mode?: 'create' | 'edit' }) {
  const [form] = Form.useForm()
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<{ message: string; field?: string } | null>(null)
  const [photoOptions, setPhotoOptions] = useState<{ label: string; value: string }[]>([])
  const avatar = Form.useWatch('avatar', form)
  const isMobile = useIsMobile() ?? false

  useEffect(() => {
    if (!open) return
    setCurrent(0)
    setSubmitError(null)
    fetch('/api/teacher-photos')
      .then(res => res.json())
      .then(data => setPhotoOptions(Array.isArray(data.photos) ? data.photos.map((item: { name: string; url: string }) => ({ label: item.name, value: item.url })) : []))
      .catch(() => setPhotoOptions([]))

    if (initialData) {
      form.setFieldsValue({
        ...initialData,
        subjects: typeof initialData.subjects === 'string'
          ? initialData.subjects.split(',').filter(Boolean)
          : initialData.subjects,
        joinedAt: initialData.joinedAt ? dayjs(initialData.joinedAt as string) : undefined,
        contractEnd: initialData.contractEnd ? dayjs(initialData.contractEnd as string) : undefined,
      })
    } else {
      form.resetFields()
    }
  }, [open, initialData, form])

  const stepFields: Record<number, string[]> = { 0: ['name', 'phone'], 1: [], 2: ['subjects'] }

  const handleNext = async () => {
    try {
      await form.validateFields(stepFields[current] || [])
      setSubmitError(null)
      setCurrent(value => value + 1)
    } catch {
      // antd will mark invalid fields
    }
  }

  const handleFinish = async () => {
    try {
      await form.validateFields(['name', 'phone', 'subjects'])
    } catch {
      return
    }
    setSubmitError(null)
    setLoading(true)
    try {
      const values = form.getFieldsValue(true)
      const url = mode === 'edit' && initialData?.id ? `/api/teachers/${initialData.id}` : '/api/teachers'
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          joinedAt: values.joinedAt ? values.joinedAt.toISOString() : undefined,
          contractEnd: values.contractEnd ? values.contractEnd.toISOString() : undefined,
          subjects: values.subjects.join(','),
        }),
      })
      const payload = await res.json().catch(() => ({})) as {
        error?: string
        field?: string
        loginEmail?: string
        initialPassword?: string | null
      }
      if (!res.ok) {
        const errorText = payload.error || `操作失败：${res.status}`
        setSubmitError({ message: errorText, field: payload.field })
        if (payload.field) form.setFields([{ name: payload.field, errors: [errorText] }])
        message.error(errorText)
        return
      }
      message.success(mode === 'edit' ? '教师信息已更新' : '教师添加成功')
      form.resetFields()
      setCurrent(0)
      onClose()
      if (mode === 'create' && payload.initialPassword && payload.loginEmail) {
        Modal.success({
          title: '教师账号已创建，请立即保存',
          width: isMobile ? 'calc(100vw - 32px)' : 460,
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
              <Alert type="warning" showIcon message="初始密码仅显示本次，关闭后无法再次查看" />
              <Input addonBefore="账号" value={payload.loginEmail} readOnly />
              <Input.Password addonBefore="密码" value={payload.initialPassword} readOnly visibilityToggle />
              <Button
                block
                onClick={() => {
                  void navigator.clipboard.writeText(`账号：${payload.loginEmail}\n初始密码：${payload.initialPassword}`)
                  message.success('账号和初始密码已复制')
                }}
              >
                复制登录信息
              </Button>
            </Space>
          ),
          okText: '我已保存',
        })
      }
    } catch {
      message.error('提交失败')
    } finally {
      setLoading(false)
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    accept: 'image/png,image/jpeg,image/webp',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const formData = new FormData()
        formData.append('file', file as File)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || '上传失败')
        form.setFieldValue('avatar', payload.url)
        message.success('照片已上传')
        onSuccess?.(payload)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '上传失败')
        onError?.(error as Error)
      }
    },
  }

  const steps = [
    { title: '基本信息', icon: <UserOutlined /> },
    { title: '教育背景', icon: <IdcardOutlined /> },
    { title: '授课设置', icon: <BookOutlined /> },
  ]

  return (
    <Modal
      title={mode === 'edit' ? '编辑教师' : '添加教师'}
      open={open}
      onCancel={onClose}
      width={isMobile ? '100%' : 720}
      className={isMobile ? 'ant-modal-mobile' : undefined}
      style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
      styles={isMobile ? { body: { height: 'calc(100vh - 110px)', overflow: 'auto' } } : undefined}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          {current > 0 && <Button onClick={() => setCurrent(value => value - 1)}>上一步</Button>}
          {current < 2 && <Button type="primary" onClick={handleNext} style={{ background: '#E8784A', borderColor: '#E8784A' }}>下一步</Button>}
          {current === 2 && <Button type="primary" onClick={handleFinish} loading={loading} style={{ background: '#E8784A', borderColor: '#E8784A' }}>{mode === 'edit' ? '保存' : '添加教师'}</Button>}
        </Space>
      }
    >
      <Steps current={current} items={steps} size="small" style={{ marginBottom: 24 }} />
      {submitError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setSubmitError(null)}
          message="教师信息未能保存"
          description={(
            <Space direction="vertical" size={8}>
              <span>{submitError.message}</span>
              {submitError.field && current !== 0 && (
                <Button size="small" onClick={() => setCurrent(0)}>
                  返回基本信息修改
                </Button>
              )}
            </Space>
          )}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical" size="middle" requiredMark={false}>
        {current === 0 && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="avatar" label="教师照片">
                <Space align="start" size={16} style={{ width: '100%' }}>
                  <div style={{ width: 104, height: 132, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #30333a', background: '#0f1011', display: 'grid', placeItems: 'center', color: '#8a8f98' }}>
                    {avatar ? <NextImage src={normalizeUploadUrl(avatar)} alt="教师照片" fill sizes="104px" unoptimized style={{ objectFit: 'cover', objectPosition: 'center top' }} /> : '暂无照片'}
                  </div>
                  <Space direction="vertical" style={{ flex: 1 }}>
                    <Select
                      allowClear
                      showSearch
                      placeholder="从 public/people 选择已有教师照片"
                      value={avatar || undefined}
                      onChange={(value) => form.setFieldValue('avatar', value)}
                      options={photoOptions}
                      style={{ width: '100%' }}
                    />
                    <Upload {...uploadProps}>
                      <Button icon={<UploadOutlined />}>上传新照片</Button>
                    </Upload>
                  </Space>
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input placeholder="教师姓名" /></Form.Item></Col>
            <Col span={12}><Form.Item name="gender" label="性别"><Select options={[{ label: '男', value: '男' }, { label: '女', value: '女' }]} placeholder="选填" allowClear /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="手机" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确手机号' }]}><Input type="tel" inputMode="numeric" placeholder="必填" /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="邮箱"><Input placeholder="选填" /></Form.Item></Col>
            <Col span={12}><Form.Item name="employmentType" label="任职类型" initialValue="FULL_TIME"><Select options={[{ label: '全职', value: 'FULL_TIME' }, { label: '兼职', value: 'PART_TIME' }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="tierLevel" label="教师等级" initialValue="NEW"><Select options={TIER_OPTIONS} /></Form.Item></Col>
            <Col span={12}><Form.Item name="joinedAt" label="入职日期"><DatePicker style={{ width: '100%' }} placeholder="选择日期" /></Form.Item></Col>
            <Col span={12}><Form.Item name="contractEnd" label="合同到期日"><DatePicker style={{ width: '100%' }} placeholder="选择日期" /></Form.Item></Col>
          </Row>
        )}
        {current === 1 && (
          <Row gutter={16}>
            <Col span={12}><Form.Item name="education" label="最高学历"><Select options={EDU_OPTIONS} placeholder="选填" allowClear /></Form.Item></Col>
            <Col span={12}><Form.Item name="university" label="毕业院校"><Input placeholder="选填" /></Form.Item></Col>
            <Col span={12}><Form.Item name="major" label="专业方向"><Input placeholder="选填" /></Form.Item></Col>
            <Col span={12}><Form.Item name="graduationYear" label="毕业年份"><InputNumber min={1970} max={new Date().getFullYear()} style={{ width: '100%' }} placeholder="选填" /></Form.Item></Col>
            <Col span={12}><Form.Item name="currentUnit" label="在职/在读单位"><Input placeholder="选填" /></Form.Item></Col>
          </Row>
        )}
        {current === 2 && (
          <Row gutter={16}>
            <Col span={24}><Form.Item name="subjects" label="授课科目" rules={[{ required: true, message: '至少选择一个科目' }]}><Select mode="multiple" placeholder="选择授课科目" options={ALL_SUBJECTS.map(subject => ({ label: subject, value: subject }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="monthlyHours" label="月课时目标"><InputNumber min={0} style={{ width: '100%' }} placeholder="40" /></Form.Item></Col>
            <Col span={24}><Form.Item name="bio" label="个人介绍"><Input.TextArea rows={3} placeholder="展示给家长看的教师亮点、教学风格或经历，200字以内" maxLength={200} showCount /></Form.Item></Col>
          </Row>
        )}
      </Form>
    </Modal>
  )
}
