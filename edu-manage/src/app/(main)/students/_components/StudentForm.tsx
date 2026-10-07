'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, InputNumber, Steps, message, Row, Col, Button, Space, Typography } from 'antd'
import { UserOutlined, PhoneOutlined, BookOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { MEMBERSHIP_OPTIONS } from '@/constants/membership'

const STATUS_OPTIONS = [
  { label: '潜客', value: 'LEAD' },
  { label: '试听', value: 'TRIAL' },
  { label: '在读', value: 'ACTIVE' },
  { label: '结课', value: 'COMPLETED' },
  { label: '离校', value: 'INACTIVE' },
]

const SOURCE_OPTIONS = ['朋友介绍', '网络搜索', '自然到访', '转介绍', '线下活动', '其他']

type Teacher = { id: string; name: string; subjects: string }
type StudyClass = { id: string; name: string; scheduleType: 'WEEKDAY_LATE' | 'WEEKEND'; gradeScope?: string[]; status: string }
type ParentOption = { id: string; name: string; email: string; students: Array<{ id: string; name: string; grade: string | null; birthYear: number | null }> }
const { Text } = Typography

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
  const [studyClasses, setStudyClasses] = useState<StudyClass[]>([])
  const [parentAccounts, setParentAccounts] = useState<ParentOption[]>([])
  const selectedParentId = Form.useWatch('existingParentUserId', form)
  const selectedGender = Form.useWatch('gender', form)
  const selectedName = Form.useWatch('name', form)
  const knownChildren = parentAccounts.find((parent) => parent.id === selectedParentId)?.students || []
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()

  useEffect(() => {
    if (open) {
      setCurrent(0)
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          birthYear: initialData.birthYear ? String(initialData.birthYear) : undefined,
          membershipLevel: initialData.membershipLevel || 'NORMAL',
          studyHallMemberships: Array.isArray(initialData.studyHallMemberships)
            ? initialData.studyHallMemberships.map((item) => {
                const membership = item as { classId?: string; purchasedDays?: number | null }
                return { classId: membership.classId, purchasedDays: membership.purchasedDays }
              })
            : [],
        })
      } else {
        form.resetFields()
        form.setFieldValue('division', division)
        form.setFieldValue('membershipLevel', 'NORMAL')
      }
      fetch('/api/teachers?limit=50').then(r => r.json()).then(d => {
        setTeachers(Array.isArray(d) ? d : (d.teachers || []))
      }).catch((error) => { console.warn('教师列表加载失败', error) })
      fetch('/api/study-hall').then(r => r.json()).then(d => {
        setStudyClasses(Array.isArray(d.classes) ? d.classes.filter((item: StudyClass) => item.status === 'ACTIVE') : [])
      }).catch((error) => { console.warn('作业班列表加载失败', error) })
      if (mode === 'create') fetch('/api/settings/parent-accounts?options=1').then(r => r.json()).then(d => {
        setParentAccounts(Array.isArray(d.accounts) ? d.accounts : [])
      }).catch((error) => { console.warn('家长账号选项加载失败', error) })
    }
  }, [open, initialData, form, division, mode])

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
      await form.validateFields()
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
    } catch (err) {
      console.error('[StudentForm] 提交学员失败', err)
      const isNetwork = err instanceof TypeError
      message.error(isNetwork ? '网络异常，请检查网络后重试' : '提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { title: '基本信息', icon: <UserOutlined /> },
    { title: '联系信息', icon: <PhoneOutlined /> },
    { title: '课程与作业班', icon: <BookOutlined /> },
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
              <Form.Item label="头像预览">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={selectedGender === '女' ? '/avatars/student-female.png' : '/avatars/student-male.png'}
                    alt="头像预览"
                    style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid #f0e7de' }}
                  />
                  <span style={{ fontSize: 12, color: '#9a8e7a' }}>{selectedGender === '女' ? '女生默认头像' : selectedGender === '男' ? '男生默认头像' : '选性别后自动分配'}</span>
                </div>
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
                <Input type="tel" inputMode="numeric" placeholder="选填" />
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
                <Input type="tel" inputMode="numeric" placeholder="选填" />
              </Form.Item>
            </Col>
            {mode === 'create' && <Col span={24}>
              <Form.Item name="existingParentUserId" label="绑定已有家长账号" extra="家里已有孩子在读时，直接选择同一账号。不选则按家长手机号匹配；无法安全识别时会提示确认。">
                <Select
                  showSearch
                  allowClear
                  placeholder="搜索家长姓名或登录邮箱（选填）"
                  optionFilterProp="label"
                  options={parentAccounts.map((parent) => ({ value: parent.id, label: `${parent.name}（${parent.email}）` }))}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  listHeight={240}
                  virtual={!isMobile}
                />
              </Form.Item>
            </Col>}
            {mode === 'create' && selectedParentId && knownChildren.length > 0 && <Col span={24}>
              <Form.Item name="reuseExistingStudentId" label="沿用已有学员档案（跨运营批次）" extra="如果是已有孩子进入新批次，选原档案，历史记录将保留；如果是家中另一名孩子，保持不选。">
                <Select
                  allowClear
                  placeholder="新孩子请保持不选"
                  options={knownChildren.map((child) => ({ value: child.id, label: `${child.name}${child.grade ? ` · ${child.grade}` : ''}${child.birthYear ? ` · ${child.birthYear}年生` : ''}${knownChildren.filter((other) => other.name === child.name).length > 1 ? ` · 档案${child.id.slice(-4)}` : ''}` }))}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  listHeight={240}
                  virtual={!isMobile}
                />
              </Form.Item>
            </Col>}
          </Row>
        )}

        {/* Step 3: 课程与作业班 */}
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
            <Col span={12}>
              <Form.Item name="membershipLevel" label="会员等级">
                <Select options={MEMBERSHIP_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.List name="studyHallMemberships">{(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }}>
                <div><Text strong>作业班报名</Text><br /><Text type="secondary">选择实际班级并填写购买天数；到勤一天扣一天。</Text></div>
                {fields.map((field) => <Row key={field.key} gutter={8} align="middle">
                  <Col xs={14} sm={16}><Form.Item {...field} name={[field.name, 'classId']} rules={[{ required: true, message: '请选择作业班' }]}><Select showSearch optionFilterProp="label" placeholder="选择晚托或周末班" options={studyClasses.map((item) => ({ value: item.id, label: `${item.name} · ${item.scheduleType === 'WEEKEND' ? '周末班' : '晚托'} · ${item.gradeScope?.join('、') || '不限年级'}` }))} /></Form.Item></Col>
                  <Col xs={8} sm={6}><Form.Item {...field} name={[field.name, 'purchasedDays']} rules={[{ required: true, message: '填写天数' }]}><InputNumber min={1} max={366} precision={0} addonAfter="天" placeholder="天数" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={2}><Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} aria-label="移除作业班" /></Col>
                </Row>)}
                <Button icon={<PlusOutlined />} onClick={() => add({ purchasedDays: 10 })}>添加作业班</Button>
              </Space>}</Form.List>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  )
}
