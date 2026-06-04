'use client'

import useSWR from 'swr'
import { Card, Form, Input, InputNumber, Button, Upload, Spin, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function OrgInfoTab() {
  const isMobile = useIsMobile() ?? false
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const { data, isLoading, mutate } = useSWR('/api/settings', fetcher)

  if (isLoading) return <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>

  const initial = data || {}

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      message.success('机构信息已更新')
      mutate()
    } else {
      message.error('保存失败')
    }
    setSaving(false)
  }

  return (
    <Card bordered={false} style={{ borderRadius: 10 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={initial}
        onFinish={handleSave}
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 0 : '0 24px', maxWidth: 640 }}>
          <Form.Item label="机构名称" name="orgName" rules={[{ required: true, message: '请输入机构名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="英文名称" name="orgNameEn">
            <Input />
          </Form.Item>
          <Form.Item label="联系电话" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="机构地址" name="address">
            <Input />
          </Form.Item>
          <Form.Item label="创办年份" name="founded">
            <InputNumber style={{ width: '100%' }} min={1900} max={2100} />
          </Form.Item>
          <Form.Item label="官方网站" name="website">
            <Input />
          </Form.Item>
        </div>
        <Form.Item label="Logo 上传" name="logoUrl">
          <Upload
            action="/api/upload"
            listType="picture-card"
            maxCount={1}
            showUploadList={{ showPreviewIcon: false }}
            onChange={(info) => {
              if (info.file.status === 'done') {
                const url = info.file.response?.url || info.file.response?.data?.url
                if (url) form.setFieldsValue({ logoUrl: url })
                message.success('Logo 上传成功')
              }
            }}
          >
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>上传</div>
          </Upload>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} style={{ background: '#E8784A' }}>
            保存修改
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
