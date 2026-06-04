'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, InputNumber,
  Select, Switch, Typography, Tag, Space, message,
} from 'antd'
import { EditOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography
const { TextArea } = Input

interface SchoolInfo {
  id: string
  schoolId: string
  name: string
  fullName: string
  type: string
  location: string
  address: string | null
  distanceFromXinle: string | null
  yiTong: number | null
  tongZhao: number
  allocationLine: number | null
  acceptsOtherCounty: boolean
  xinleAccessible: boolean
  xinleAccessibleOverride: boolean | null
  xinleAllocationId: string | null
  enrollment: number | null
  boardingAvail: boolean
  boardingFee: string | null
  tuitionFee: string | null
  keyFeature: string | null
  gaokaoRate: string | null
  intro: string | null
  tips: string | null
  website: string | null
  phone: string | null
}

const TYPE_COLORS: Record<string, string> = {
  '省示范': 'red', '市重点': 'orange', '县中': 'blue', '民办': 'purple',
}

const TYPE_OPTIONS = ['省示范', '市重点', '县中', '民办']
const LOCATION_OPTIONS = ['新乐', '正定', '辛集', '市区', '平山', '鹿泉', '行唐']

export default function SchoolsManagePage() {
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ open: boolean; school: SchoolInfo | null }>({ open: false, school: null })
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/schools')
    const data = await res.json()
    setSchools(data.schools || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSchools() }, [fetchSchools])

  const openEdit = (school: SchoolInfo) => {
    form.setFieldsValue(school)
    setEditModal({ open: true, school })
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    if (!editModal.school) return
    setSaving(true)
    const res = await fetch(`/api/schools/${editModal.school.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSaving(false)
    if (res.ok) {
      message.success('保存成功')
      setEditModal({ open: false, school: null })
      fetchSchools()
    } else {
      message.error('保存失败')
    }
  }

  const columns = [
    {
      title: '学校', dataIndex: 'name', width: 200,
      render: (name: string, row: SchoolInfo) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            <Tag color={TYPE_COLORS[row.type]} style={{ fontSize: 11 }}>{row.type}</Tag>
            <Tag style={{ fontSize: 11 }}>{row.location}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: '分数线', width: 160,
      render: (_: unknown, row: SchoolInfo) => (
        <div style={{ fontSize: 13 }}>
          {row.yiTong && <div>一统线：<Text strong style={{ color: '#E87545' }}>{row.yiTong}</Text></div>}
          <div>统招线：<Text strong>{row.tongZhao}</Text></div>
          {row.allocationLine && <div>分配线：<Text strong style={{ color: '#E8784A' }}>{row.allocationLine}</Text></div>}
        </div>
      ),
    },
    {
      title: '招生', dataIndex: 'enrollment', width: 80,
      render: (v: number | null) => v ? `约${v}人` : '—',
    },
    {
      title: '住宿', dataIndex: 'boardingAvail', width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '可住宿' : '走读'}</Tag>,
    },
    {
      title: '外县', dataIndex: 'acceptsOtherCounty', width: 70,
      render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? '是' : '否'}</Tag>,
    },
    {
      title: '学费', dataIndex: 'tuitionFee', width: 150,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: '特色', dataIndex: 'keyFeature',
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: '操作', width: 80, fixed: 'right' as const,
      render: (_: unknown, row: SchoolInfo) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
          编辑
        </Button>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>高中学校信息管理</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            编辑后家长端和志愿模拟页面同步更新
          </Text>
        </div>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={schools}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      <Modal
        title={`编辑 — ${editModal.school?.name}`}
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, school: null })}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        width={700}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="type" label="学校类型" rules={[{ required: true }]}>
              <Select options={TYPE_OPTIONS.map(t => ({ label: t, value: t }))} />
            </Form.Item>
            <Form.Item name="location" label="所在地" rules={[{ required: true }]}>
              <Select options={LOCATION_OPTIONS.map(l => ({ label: l, value: l }))} />
            </Form.Item>
            <Form.Item name="yiTong" label="一统线">
              <InputNumber style={{ width: '100%' }} placeholder="省示范填写" />
            </Form.Item>
            <Form.Item name="tongZhao" label="统招线" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="enrollment" label="年招生人数">
              <InputNumber style={{ width: '100%' }} placeholder="约多少人" />
            </Form.Item>
            <Form.Item name="boardingAvail" label="提供住宿" valuePropName="checked">
              <Switch checkedChildren="可住宿" unCheckedChildren="走读" />
            </Form.Item>
            <Form.Item name="acceptsOtherCounty" label="面向外县统招" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </div>
          <Form.Item name="keyFeature" label="核心特色（一句话亮点）">
            <Input placeholder="如：新乐本地最好高中，省级示范校，高考本科率超90%" />
          </Form.Item>
          <Form.Item name="gaokaoRate" label="高考升学率">
            <Input placeholder="如：本科上线率约90%+" />
          </Form.Item>
          <Form.Item name="intro" label="学校简介">
            <TextArea rows={4} placeholder="学校基本情况介绍" />
          </Form.Item>
          <Form.Item name="tips" label="新乐学生报考建议">
            <TextArea rows={3} placeholder="针对新乐学生的特别提示" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="xinleAllocationId" label="分配生 ID（对应内部 key）">
              <Input placeholder="如：xl1、mb7，无则留空" />
            </Form.Item>
            <Form.Item name="allocationLine" label="分配生录取最低分">
              <InputNumber style={{ width: '100%' }} placeholder="如：660，无分配生留空" />
            </Form.Item>
            <Form.Item name="xinleAccessible" label="新乐可报" valuePropName="checked">
              <Switch checkedChildren="可报" unCheckedChildren="不可报" />
            </Form.Item>
            <Form.Item name="xinleAccessibleOverride" label="手动覆盖推导">
              <Select
                allowClear
                placeholder="留空=自动推导"
                options={[
                  { label: '强制可报', value: true },
                  { label: '强制不可报', value: false },
                ]}
              />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="distanceFromXinle" label="距新乐距离">
              <Input placeholder="如：市区内，骑车可达" />
            </Form.Item>
            <Form.Item name="address" label="详细地址">
              <Input placeholder="学校地址" />
            </Form.Item>
            <Form.Item name="boardingFee" label="住宿费用">
              <Input placeholder="如：约300元/学期" />
            </Form.Item>
            <Form.Item name="tuitionFee" label="学费说明">
              <Input placeholder="如：公办，学费全免" />
            </Form.Item>
            <Form.Item name="phone" label="招生电话">
              <Input placeholder="0311-XXXXXXXX" />
            </Form.Item>
            <Form.Item name="website" label="官网">
              <Input placeholder="https://..." />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
