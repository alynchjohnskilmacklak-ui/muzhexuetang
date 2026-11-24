'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Alert, Checkbox, Form, Input, InputNumber, Radio, Steps, message, Row, Col, Button, Space, Spin, Typography, Modal } from 'antd'
import { UserOutlined, PhoneOutlined, BookOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { BrandModal } from '@/components/Common/BrandModal'
import { SafeFormModal } from '@/components/Common/SafeFormModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { MEMBERSHIP_OPTIONS } from '@/constants/membership'
import { distinctChoiceLabels } from '@/lib/distinct-choice-labels'

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
type ParentOption = { id: string; name: string; email: string; students: Array<{ id: string; name: string; grade: string | null; birthYear: number | null; parentPhone?: string | null; termMemberships?: Array<{ status: string; term: { name: string } }> }> }
type StudentFormOptionCache = {
  teachers?: { division: string; expiresAt: number; data: Teacher[] }
  studyClasses?: { division: string; expiresAt: number; data: StudyClass[] }
  parentAccounts?: { expiresAt: number; data: ParentOption[] }
}

async function fetchOptionJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : `请求失败（${response.status}）`)
  }
  return payload || {}
}

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
  const [teacherOptionsLoading, setTeacherOptionsLoading] = useState(false)
  const [studyClassOptionsLoading, setStudyClassOptionsLoading] = useState(false)
  const [parentOptionsLoading, setParentOptionsLoading] = useState(false)
  const [optionErrors, setOptionErrors] = useState<Record<string, string>>({})
  const [optionRetry, setOptionRetry] = useState(0)
  const optionCacheRef = useRef<StudentFormOptionCache>({})
  const selectedParentId = Form.useWatch('existingParentUserId', form)
  const selectedParentPhone = Form.useWatch('parentPhone', form)
  const selectedGender = Form.useWatch('gender', form)
  const selectedName = Form.useWatch('name', form)
  const selectedBirthYear = Form.useWatch('birthYear', form)
  const selectedReuseStudentId = Form.useWatch('reuseExistingStudentId', form)
  const phoneMatchedParents = selectedParentPhone?.trim()
    ? parentAccounts.filter((parent) => parent.students.some((child) => child.parentPhone?.trim() === selectedParentPhone.trim()))
    : []
  const knownParent = parentAccounts.find((parent) => parent.id === selectedParentId)
    || (!selectedParentId && phoneMatchedParents.length === 1 ? phoneMatchedParents[0] : undefined)
  const knownChildren = knownParent?.students || []
  const knownChildChoiceLabels = distinctChoiceLabels(
    knownChildren,
    (child) => [
      child.name,
      child.grade,
      child.birthYear ? `${child.birthYear}年生` : null,
      child.termMemberships?.length ? child.termMemberships.map((item) => item.term.name).join('、') : null,
    ].filter(Boolean).join(' · '),
  )
  const sameNameChildren = selectedName?.trim()
    ? knownChildren.filter((child) => child.name.trim() === selectedName.trim())
    : []
  const likelySameChildren = sameNameChildren.filter((child) => {
    const year = Number(selectedBirthYear)
    return !child.birthYear || !year || child.birthYear === year
  })
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const divisionKey = division || 'JUNIOR'
  const needsTeacherAndClassOptions = current >= 2
  const needsParentOptions = mode === 'create' && current >= 1
  const optionsLoading = (needsTeacherAndClassOptions && (teacherOptionsLoading || studyClassOptionsLoading))
    || (needsParentOptions && parentOptionsLoading)

  useEffect(() => {
    if (mode === 'create' && open) form.setFieldValue('confirmNewStudentIdentity', false)
  }, [form, mode, open, selectedParentId, selectedParentPhone, selectedName, selectedBirthYear, selectedReuseStudentId])

  useEffect(() => {
    if (!open) {
      setCurrent(0)
      setTeacherOptionsLoading(false)
      setStudyClassOptionsLoading(false)
      setParentOptionsLoading(false)
      setOptionErrors({})
      return
    }
    setCurrent(0)
    setOptionErrors({})
    if (initialData) {
      form.setFieldsValue({
        ...initialData,
        birthYear: initialData.birthYear != null ? Number(initialData.birthYear) : undefined,
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
  }, [open, initialData, form, division, mode])

  useEffect(() => {
    if (!open || !needsParentOptions) return
    const cached = optionCacheRef.current.parentAccounts
    if (cached && cached.expiresAt > Date.now()) {
      setParentAccounts(cached.data)
      setOptionErrors((currentErrors) => ({ ...currentErrors, parentAccounts: '' }))
      return
    }

    const controller = new AbortController()
    setParentOptionsLoading(true)
    setOptionErrors((currentErrors) => ({ ...currentErrors, parentAccounts: '' }))
    void fetchOptionJson('/api/settings/parent-accounts?options=1', controller.signal)
      .then((data) => {
        if (!Array.isArray(data.accounts)) throw new Error('家长账号列表格式异常')
        const accounts = data.accounts as ParentOption[]
        setParentAccounts(accounts)
        optionCacheRef.current.parentAccounts = { data: accounts, expiresAt: Date.now() + 60_000 }
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setOptionErrors((currentErrors) => ({ ...currentErrors, parentAccounts: error instanceof Error ? error.message : '加载失败' }))
      })
      .finally(() => { if (!controller.signal.aborted) setParentOptionsLoading(false) })
    return () => controller.abort()
  }, [open, needsParentOptions, optionRetry])

  useEffect(() => {
    if (!open || !needsTeacherAndClassOptions) return
    const controller = new AbortController()
    const cached = optionCacheRef.current.teachers
    if (cached?.division === divisionKey && cached.expiresAt > Date.now()) {
      setTeachers(cached.data)
      setOptionErrors((currentErrors) => ({ ...currentErrors, teachers: '' }))
    } else {
      if (cached?.division !== divisionKey) setTeachers([])
      setTeacherOptionsLoading(true)
      setOptionErrors((currentErrors) => ({ ...currentErrors, teachers: '' }))
      void fetchOptionJson(`/api/teachers/options?division=${encodeURIComponent(divisionKey)}`, controller.signal)
        .then((data) => {
          if (!Array.isArray(data.teachers)) throw new Error('教师列表格式异常')
          const nextTeachers = data.teachers as Teacher[]
          setTeachers(nextTeachers)
          optionCacheRef.current.teachers = { division: divisionKey, data: nextTeachers, expiresAt: Date.now() + 60_000 }
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          setOptionErrors((currentErrors) => ({ ...currentErrors, teachers: error instanceof Error ? error.message : '加载失败' }))
        })
        .finally(() => { if (!controller.signal.aborted) setTeacherOptionsLoading(false) })
    }

    const cachedClasses = optionCacheRef.current.studyClasses
    if (cachedClasses?.division === divisionKey && cachedClasses.expiresAt > Date.now()) {
      setStudyClasses(cachedClasses.data)
      setOptionErrors((currentErrors) => ({ ...currentErrors, studyClasses: '' }))
    } else {
      if (cachedClasses?.division !== divisionKey) setStudyClasses([])
      setStudyClassOptionsLoading(true)
      setOptionErrors((currentErrors) => ({ ...currentErrors, studyClasses: '' }))
      void fetchOptionJson('/api/study-hall?options=1', controller.signal)
        .then((data) => {
          if (!Array.isArray(data.classes)) throw new Error('作业班列表格式异常')
          const nextClasses = (data.classes as StudyClass[]).filter((item) => item.status === 'ACTIVE')
          setStudyClasses(nextClasses)
          optionCacheRef.current.studyClasses = { division: divisionKey, data: nextClasses, expiresAt: Date.now() + 60_000 }
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          setOptionErrors((currentErrors) => ({ ...currentErrors, studyClasses: error instanceof Error ? error.message : '加载失败' }))
        })
        .finally(() => { if (!controller.signal.aborted) setStudyClassOptionsLoading(false) })
    }

    return () => controller.abort()
  }, [open, needsTeacherAndClassOptions, divisionKey, optionRetry])

  const retryFailedOptions = () => {
    if (optionErrors.parentAccounts) delete optionCacheRef.current.parentAccounts
    if (optionErrors.teachers) delete optionCacheRef.current.teachers
    if (optionErrors.studyClasses) delete optionCacheRef.current.studyClasses
    setOptionRetry((value) => value + 1)
  }

  // Only validate fields visible on the current step
  const stepFields: Record<number, string[]> = {
    0: ['name'],
    1: ['phone', 'parentName', 'parentPhone'],
    2: ['mainTeacherId'],
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
      delete values.remainHours
      if (!values.name || String(values.name).trim().length === 0) {
        setCurrent(0)
        message.error('请输入姓名')
        return
      }
      if (mode === 'create' && likelySameChildren.length > 0 && !values.reuseExistingStudentId && values.confirmNewStudentIdentity !== true) {
        setCurrent(1)
        message.warning('发现这个家庭已有相似学员档案，请选择沿用历史档案，或确认本次是另一名孩子。')
        return
      }
      delete values.confirmNewStudentIdentity

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

      const payload = await res.json().catch(() => ({})) as {
        parentEmail?: string | null
        parentPlainPassword?: string | null
      }
      message.success(mode === 'edit' ? '学员信息已更新' : '学员添加成功')
      onClose()
      if (mode === 'create' && payload.parentEmail && payload.parentPlainPassword) {
        Modal.success({
          title: '家长账号已创建，请保存登录信息',
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
              <Alert type="info" showIcon message="初始密码为学员姓名拼音（小写、无空格），首次登录后建议修改。" />
              <Input addonBefore="账号" value={payload.parentEmail} readOnly />
              <Input.Password addonBefore="密码" value={payload.parentPlainPassword} readOnly visibilityToggle />
              <Button
                block
                onClick={() => {
                  void navigator.clipboard.writeText(`账号：${payload.parentEmail}\n初始密码：${payload.parentPlainPassword}`)
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
        <Button type="primary" onClick={handleNext} style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
          下一步
        </Button>
      )}
      {current === 2 && (
        <Button type="primary" onClick={handleFinish} loading={loading} style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
          {mode === 'edit' ? '保存' : '添加学员'}
        </Button>
      )}
    </Space>
  )

  const isDirty = Boolean(selectedName?.trim() || selectedParentPhone?.trim() || current > 0)

  return (
    <SafeFormModal
      title={mode === 'edit' ? '编辑学员' : '新增学员'}
      open={open}
      onClose={onClose}
      dirty={isDirty}
      footer={footer}
      width={isMobile ? '100%' : 640}
      className={isMobile ? 'ant-modal-mobile' : undefined}
      style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
      styles={isMobile ? { body: { height: 'calc(100vh - 110px)', overflow: 'auto' } } : undefined}
      destroyOnHidden
    >
      <Steps current={current} items={steps} size="small" style={{ marginBottom: 24 }} />

      {optionsLoading && (
        <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--color-ink-subtle)', fontSize: 12 }}>
          <Spin size="small" />正在准备本步骤需要的选项…
        </div>
      )}
      {Object.keys(optionErrors).some((key) => Boolean(optionErrors[key])) && (
        <Alert
          type="warning"
          showIcon
          message="部分选项暂未加载"
          description={`未加载：${[
            optionErrors.parentAccounts ? '家长账号' : '',
            optionErrors.teachers ? '教师列表' : '',
            optionErrors.studyClasses ? '作业班列表' : '',
          ].filter(Boolean).join('、')}。已填写内容会保留，请重试后再选择。`}
          action={<Button size="small" type="link" onClick={retryFailedOptions}>重试</Button>}
          style={{ marginBottom: 12, borderRadius: 10 }}
        />
      )}

      <Form form={form} layout="vertical" size="middle" requiredMark={false}>
        {/* Step 1: 基本信息 */}
        {current === 0 && (
          <>
          {mode === 'create' && <Alert
            type="info"
            showIcon
            message="跨运营批次报名，优先沿用原学员档案"
            description="如果孩子第一期已经建档，第二期请在下一步绑定原家长账号并选择已有学员。系统会新增本期归属，保留往期考勤、课堂反馈和缴费记录。"
            style={{ marginBottom: 16 }}
          />}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="学员姓名（必填）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="性别"
                extra={selectedGender
                  ? <Button type="link" size="small" onClick={() => form.setFieldValue('gender', undefined)}>清除选择</Button>
                  : '可不填'}
              >
                <Radio.Group
                  id="student-gender"
                  optionType="button"
                  buttonStyle="solid"
                  size="large"
                  aria-label="性别"
                  options={[{ label: '男', value: '男' }, { label: '女', value: '女' }]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="头像预览">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Image
                    src={selectedGender === '女' ? '/avatars/student-female.jpg' : '/avatars/student-male.jpg'}
                    alt="头像预览"
                    width={40}
                    height={40}
                    style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid #f0e7de' }}
                  />
                  <span style={{ fontSize: 12, color: '#9a8e7a' }}>{selectedGender === '女' ? '女生默认头像' : selectedGender === '男' ? '男生默认头像' : '选性别后自动分配'}</span>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="birthYear" label="出生年份" extra="直接输入四位年份，无需逐年滚动">
                <InputNumber
                  id="student-birth-year"
                  min={1900}
                  max={new Date().getFullYear()}
                  precision={0}
                  controls={false}
                  inputMode="numeric"
                  placeholder="如 2015"
                  aria-label="出生年份"
                  style={{ width: '100%' }}
                />
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
                <AdaptiveSelect options={SOURCE_OPTIONS.map(s => ({ label: s, value: s }))} placeholder="选填" allowClear />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="备注">
                <Input.TextArea rows={2} placeholder="备注信息" />
              </Form.Item>
            </Col>
          </Row>
          </>
        )}

        {/* Step 2: 联系信息 */}
        {current === 1 && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="学员手机号"
                rules={mode === 'create' ? [
                  { required: true, message: '请输入学员手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
                ] : []}
              >
                <Input type="tel" inputMode="numeric" placeholder={mode === 'create' ? '请输入11位手机号（必填）' : '选填'} />
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
            {mode === 'create' && !selectedParentId && phoneMatchedParents.length === 1 && <Col span={24}>
              <Alert
                type="success"
                showIcon
                message={`家长手机号已匹配到账号：${phoneMatchedParents[0].name}`}
                description="系统会使用这个已有家长账号；如孩子也在往期建过档，请在下面选择对应档案，避免重复创建。"
                style={{ marginBottom: 12 }}
              />
            </Col>}
            {mode === 'create' && !selectedParentId && phoneMatchedParents.length > 1 && <Col span={24}>
              <Alert
                type="warning"
                showIcon
                message="这个手机号对应多个家长账号"
                description="请先在“绑定已有家长账号”中选准家庭，再选择孩子的历史档案，避免关联到错误家庭。"
                style={{ marginBottom: 12 }}
              />
            </Col>}
            {mode === 'create' && <Col span={24}>
              <Form.Item name="existingParentUserId" label="绑定已有家长账号" extra="家里已有孩子在读时，直接选择同一账号。不选则按家长手机号匹配；无法安全识别时会提示确认。">
                <AdaptiveSelect
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
            {mode === 'create' && knownChildren.length > 0 && <Col span={24}>
              {sameNameChildren.length > 0 && <Alert
                type={likelySameChildren.length > 0 ? 'warning' : 'info'}
                showIcon
                message={likelySameChildren.length > 0 ? '发现这个家庭已有同名学员档案' : '发现同名档案，请核对出生年份'}
                description={likelySameChildren.length > 0
                  ? `如果是同一个孩子，请在下方选择历史档案；如果是另一名同名孩子，请保持“不沿用”，再继续新建。`
                  : `已有档案：${sameNameChildren.map((child) => `${child.name}${child.birthYear ? `（${child.birthYear}年生）` : ''}`).join('、')}。确认是不同孩子后再新建。`}
                style={{ marginBottom: 12 }}
              />}
              <Form.Item name="reuseExistingStudentId" label="沿用已有学员档案（跨运营批次）" extra="沿用后仍是同一名学员，只新增当前批次归属；历史课程与学习记录不会被覆盖。家中另一名孩子请保持不选。">
                <AdaptiveSelect
                  allowClear
                  placeholder="已有孩子继续报名请选择；新孩子请保持不选"
                  options={knownChildren.map((child) => ({
                    value: child.id,
                    label: knownChildChoiceLabels.get(child.id) || child.name,
                  }))}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  listHeight={240}
                  virtual={!isMobile}
                />
              </Form.Item>
              {likelySameChildren.length > 0 && !selectedReuseStudentId && (
                <Form.Item name="confirmNewStudentIdentity" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Checkbox>我已核实这是另一名孩子，需要新建独立档案</Checkbox>
                </Form.Item>
              )}
            </Col>}
          </Row>
        )}

        {/* Step 3: 课程与作业班 */}
        {current === 2 && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mainTeacherId" label="主教老师">
                <AdaptiveSelect placeholder="选填" allowClear
                  options={teachers.map(t => ({ label: `${t.name}（${t.subjects}）`, value: t.id }))} />
              </Form.Item>
            </Col>
            {mode === 'edit' && (
              <Col span={12}>
                <Form.Item name="status" label="学员状态">
                  <AdaptiveSelect options={STATUS_OPTIONS} />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item name="membershipLevel" label="会员等级">
                <AdaptiveSelect options={MEMBERSHIP_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.List name="studyHallMemberships">{(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }}>
                <div><Text strong>作业班报名</Text><br /><Text type="secondary">选择实际班级并填写购买天数；到勤一天扣一天。</Text></div>
                {fields.map((field) => <Row key={field.key} gutter={8} align="middle">
                  <Col xs={14} sm={16}><Form.Item {...field} name={[field.name, 'classId']} rules={[{ required: true, message: '请选择作业班' }]}><AdaptiveSelect showSearch optionFilterProp="label" placeholder="选择晚托或周末班" options={studyClasses.map((item) => ({ value: item.id, label: `${item.name} · ${item.scheduleType === 'WEEKEND' ? '周末班' : '晚托'} · ${item.gradeScope?.join('、') || '不限年级'}` }))} /></Form.Item></Col>
                  <Col xs={8} sm={6}><Form.Item {...field} name={[field.name, 'purchasedDays']} rules={[{ required: true, message: '填写天数' }]}><InputNumber min={1} max={366} precision={0} addonAfter="天" placeholder="天数" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={2}><Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} aria-label="移除作业班" /></Col>
                </Row>)}
                <Button icon={<PlusOutlined />} onClick={() => add({ purchasedDays: 10 })}>添加作业班</Button>
              </Space>}</Form.List>
            </Col>
          </Row>
        )}
      </Form>
    </SafeFormModal>
  )
}
