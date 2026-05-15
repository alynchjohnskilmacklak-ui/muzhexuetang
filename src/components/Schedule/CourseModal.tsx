'use client'

import { useState } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber, Radio, Space, Button, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

interface CourseModalProps {
  open: boolean
  onClose: () => void
}

export function CourseModal({ open, onClose }: CourseModalProps) {
  const [form] = Form.useForm()
  const [courseType, setCourseType] = useState<'single' | 'recurring'>('single')

  const handleOk = async () => {
    const values = await form.validateFields()
    message.success(courseType === 'single' ? '单次课程已创建' : `周期课程已创建，每周${values.timesPerWeek}次`)
    form.resetFields()
    onClose()
  }

  return (
    <Modal title="新建课程" open={open} onOk={handleOk} onCancel={onClose} width={560} okText="创建" cancelText="取消">
      <Form form={form} layout="vertical" initialValues={{ duration: 60, maxStudents: 20 }}>
        <Form.Item name="courseName" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
          <Input placeholder="例如：钢琴基础班" />
        </Form.Item>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="teacher" label="教师" rules={[{ required: true }]} style={{ width: 200 }}>
            <Select options={['王老师', '李老师', '张老师', '赵老师', '陈老师'].map(t => ({ value: t, label: t }))} placeholder="选择教师" />
          </Form.Item>
          <Form.Item name="room" label="教室" rules={[{ required: true }]} style={{ width: 200 }}>
            <Select options={['琴房A', '教室201', '教室302', '机房B', '画室'].map(r => ({ value: r, label: r }))} placeholder="选择教室" />
          </Form.Item>
          <Form.Item name="duration" label="时长(分钟)" style={{ width: 120 }}>
            <InputNumber min={30} max={240} step={30} style={{ width: '100%' }} />
          </Form.Item>
        </Space>
        <Form.Item label="课程类型">
          <Radio.Group value={courseType} onChange={e => setCourseType(e.target.value)}>
            <Radio.Button value="single">单次课</Radio.Button>
            <Radio.Button value="recurring">周期课</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {courseType === 'recurring' && (
          <Space>
            <Form.Item name="timesPerWeek" label="每周次数">
              <Select options={[1, 2, 3, 4, 5].map(n => ({ value: n, label: `每周${n}次` }))} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="weeks" label="持续周数">
              <Select options={[4, 8, 12, 16, 20].map(n => ({ value: n, label: `${n}周` }))} style={{ width: 100 }} />
            </Form.Item>
          </Space>
        )}
        <Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: '100%' }} placeholder="选择日期和时间" />
        </Form.Item>
        <Form.Item name="maxStudents" label="最大学员数">
          <InputNumber min={1} max={100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={2} placeholder="可选备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
