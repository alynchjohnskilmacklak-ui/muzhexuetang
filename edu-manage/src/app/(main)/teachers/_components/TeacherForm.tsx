'use client'

import { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, InputNumber, Steps, Row, Col, Button, Space, DatePicker, Upload } from 'antd'
import { toast } from 'sonner'
import { UserOutlined, BookOutlined, IdcardOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import dayjs from 'dayjs'
import { ALL_SUBJECTS } from '@/constants/subjects'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'

const EDU_OPTIONS = ['本科', '硕士', '博士在读', '博士', '其他'].map(value => ({ label: value, value }))

export function TeacherForm({
  open, onClose, initialData, mode = 'create',
}: { open: boolean; onClose: () => void; initialData?: Record<string, unknown> | null; mode?: 'create' | 'edit' }) {
  const [form] = Form.useForm()
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [photoOptions, setPhotoOptions] = useState<{ label: string; value: string }[]>([])
  const avatar = Form.useWatch('avatar', form)
  const isMobile = useIsMobile() ?? false

  useEffect(() => {
    if (!open) return
    setCurrent(0)
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
      if (!res.ok) {
        const errorText = (await res.json().catch(() => ({}))).error || `操作失败：${res.status}`
        if (res.status === 409) {
          setCurrent(0)
          form.setFields([{ name: 'phone', errors: [errorText] }])
        }
        toast.error(errorText)
        return
      }
      toast.success(mode === 'edit' ? '教师信息已更新' : '教师添加成功')
      form.resetFields()
      setCurrent(0)
      onClose()
    } catch {
      toast.error('提交失败')
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
        toast.success('照片已上传')
        onSuccess?.(payload)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '上传失败')
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
      <Form form={form} layout="vertical" size="middle" requiredMark={false}>
        {current === 0 && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="avatar" label="教师照片">
                <Space align="start" size={16} style={{ width: '100%' }}>
                  <div style={{ width: 104, height: 132, borderRadius: 10, overflow: 'hidden', border: '1px solid #30333a', background: '#0f1011', display: 'grid', placeItems: 'center', color: '#8a8f98' }}>
                    {avatar ? <img src={normalizeUploadUrl(avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} /> : '暂无照片'}
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
            <Col span={12}><Form.Item name="phone" label="手机" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确手机号' }]}><Input placeholder="必填" /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="邮箱"><Input placeholder="选填" /></Form.Item></Col>
            <Col span={12}><Form.Item name="employmentType" label="任职类型" initialValue="FULL_TIME"><Select options={[{ label: '全职', value: 'FULL_TIME' }, { label: '兼职', value: 'PART_TIME' }]} /></Form.Item></Col>
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
