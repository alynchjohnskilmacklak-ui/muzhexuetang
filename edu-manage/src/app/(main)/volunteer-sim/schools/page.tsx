'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
  Tag,
  Space,
  DatePicker,
} from 'antd'
import { toast } from 'sonner'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

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
  sourceUrl: string | null
  sourceNote: string | null
  infoVerifiedAt: string | null
  infoConfidence: string | null
}

type MissingFilter =
  | 'all'
  | 'complete'
  | 'any-missing'
  | 'no-address'
  | 'no-phone'
  | 'no-website'
  | 'no-tuition'
  | 'no-boarding-fee'
  | 'no-intro'
  | 'no-feature'
  | 'no-gaokao'
  | 'no-source'
  | 'unverified'

interface MissingFilterOption {
  key: MissingFilter
  label: string
}

const MISSING_FILTERS: MissingFilterOption[] = [
  { key: 'all', label: '全部学校' },
  { key: 'complete', label: '信息完整' },
  { key: 'any-missing', label: '信息缺失' },
  { key: 'no-address', label: '缺地址' },
  { key: 'no-phone', label: '缺电话' },
  { key: 'no-website', label: '缺官网' },
  { key: 'no-tuition', label: '缺学费' },
  { key: 'no-boarding-fee', label: '缺住宿费' },
  { key: 'no-intro', label: '缺简介' },
  { key: 'no-feature', label: '缺特色' },
  { key: 'no-gaokao', label: '缺升学情况' },
  { key: 'no-source', label: '缺来源' },
  { key: 'unverified', label: '待核实' },
]

// 完整性计算字段列表
const COMPLETENESS_FIELDS: (keyof SchoolInfo)[] = [
  'address', 'phone', 'website', 'tuitionFee', 'boardingFee',
  'keyFeature', 'gaokaoRate', 'intro', 'tips', 'sourceUrl',
  'sourceNote', 'infoConfidence', 'infoVerifiedAt',
]

function calcCompleteness(school: SchoolInfo): number {
  const filled = COMPLETENESS_FIELDS.filter((field) => {
    const v = school[field]
    if (v === null || v === undefined || v === '' || v === 'unknown') return false
    return true
  }).length
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100)
}

function getMissingFields(school: SchoolInfo): string[] {
  return COMPLETENESS_FIELDS.filter((field) => {
    const v = school[field]
    return v === null || v === undefined || v === '' || v === 'unknown'
  })
}

const TYPE_COLORS: Record<string, string> = {
  '省示范': 'red', '市重点': 'orange', '县中': 'blue', '民办': 'purple',
}

const TYPE_OPTIONS = ['省示范', '市重点', '县中', '民办']

const CONFIDENCE_OPTIONS = [
  { label: '官方来源', value: 'official' },
  { label: '学校官网/公众号', value: 'school' },
  { label: '媒体/教育平台', value: 'media' },
  { label: '家长反馈', value: 'parent' },
  { label: '待核实', value: 'unverified' },
]

const CONFIDENCE_LABELS: Record<string, string> = {
  official: '官方',
  school: '学校来源',
  media: '第三方',
  parent: '家长反馈',
  unverified: '待核实',
}

// 初中部备用地点 + 后续从数据动态补充
const BASE_LOCATIONS = [
  '新乐', '正定', '辛集', '市区', '无极', '元氏', '栾城', '高新区',
  '平山', '鹿泉', '行唐', '藁城', '晋州', '赵县', '井陉', '其他县区',
]

export default function SchoolsManagePage() {
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ open: boolean; school: SchoolInfo | null }>({ open: false, school: null })
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [missingFilter, setMissingFilter] = useState<MissingFilter>('all')

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/schools')
    const data = await res.json()
    setSchools(data.schools || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSchools() }, [fetchSchools])

  // 从数据中动态生成地点选项
  const locationOptions = useMemo(() => {
    const set = new Set<string>(BASE_LOCATIONS)
    schools.forEach((s) => { if (s.location) set.add(s.location) })
    return Array.from(set).sort()
  }, [schools])

  const filteredSchools = useMemo(() => {
    let list = schools
    if (searchText.trim()) {
      const kw = searchText.trim().toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.fullName.toLowerCase().includes(kw) ||
          s.schoolId.toLowerCase().includes(kw),
      )
    }
    if (missingFilter === 'all') return list
    if (missingFilter === 'complete') return list.filter((s) => calcCompleteness(s) === 100)
    if (missingFilter === 'any-missing') return list.filter((s) => calcCompleteness(s) < 100)
    if (missingFilter === 'unverified')
      return list.filter((s) => !s.infoConfidence || s.infoConfidence === 'unverified' || s.infoConfidence === 'unknown')
    const fieldMap: Record<string, string> = {
      'no-address': 'address',
      'no-phone': 'phone',
      'no-website': 'website',
      'no-tuition': 'tuitionFee',
      'no-boarding-fee': 'boardingFee',
      'no-intro': 'intro',
      'no-feature': 'keyFeature',
      'no-gaokao': 'gaokaoRate',
      'no-source': 'sourceUrl',
    }
    const field = fieldMap[missingFilter]
    if (field) return list.filter((s) => !s[field as keyof SchoolInfo])
    return list
  }, [schools, searchText, missingFilter])

  const openEdit = (school: SchoolInfo) => {
    form.setFieldsValue({
      ...school,
      infoVerifiedAt: school.infoVerifiedAt ? dayjs(school.infoVerifiedAt) : null,
    })
    setEditModal({ open: true, school })
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    if (!editModal.school) return
    setSaving(true)

    const payload: Record<string, unknown> = { ...values }
    if (payload.infoVerifiedAt instanceof dayjs || (payload.infoVerifiedAt && typeof payload.infoVerifiedAt === 'object')) {
      payload.infoVerifiedAt = (payload.infoVerifiedAt as dayjs.Dayjs).toISOString()
    }

    const res = await fetch(`/api/schools/${editModal.school.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('保存成功')
      setEditModal({ open: false, school: null })
      fetchSchools()
    } else {
      toast.error('保存失败')
    }
  }

  const columns: ColumnsType<SchoolInfo> = [
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
      title: '分数线', width: 140,
      render: (_: unknown, row: SchoolInfo) => (
        <div style={{ fontSize: 13 }}>
          {row.yiTong && <div>{row.type === '民办' ? '市区统招分' : '一统'}：{row.yiTong}</div>}
          <div>统招：<Text strong>{row.tongZhao}</Text></div>
          {row.allocationLine && <div>分配：<Text strong style={{ color: '#E8784A' }}>{row.allocationLine}</Text></div>}
        </div>
      ),
    },
    {
      title: '住宿', dataIndex: 'boardingAvail', width: 70,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '可住' : '走读'}</Tag>,
    },
    {
      title: '学费', dataIndex: 'tuitionFee', width: 120,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v || <Tag color="red" style={{ fontSize: 10 }}>缺学费</Tag>}</Text>,
    },
    {
      title: '信息来源', dataIndex: 'infoConfidence', width: 90,
      render: (v: string) => {
        const label = CONFIDENCE_LABELS[v] || '待核实'
        const color =
          v === 'official' ? 'green' :
          v === 'school' || v === 'media' ? 'blue' :
          v === 'parent' ? 'orange' : 'default'
        return <Tag color={color} style={{ fontSize: 11 }}>{label}</Tag>
      },
    },
    {
      title: '完整度', width: 90,
      sorter: (a, b) => calcCompleteness(a) - calcCompleteness(b),
      render: (_: unknown, row: SchoolInfo) => {
        const pct = calcCompleteness(row)
        const color = pct === 100 ? '#1D9E75' : pct >= 70 ? '#C77F00' : '#E24B4A'
        const label = pct === 100 ? '完整' : pct >= 70 ? '部分缺失' : '严重缺失'
        return (
          <div>
            <Text strong style={{ color, fontSize: 14 }}>{pct}%</Text>
            <div style={{ fontSize: 10, color }}>{label}</div>
          </div>
        )
      },
    },
    {
      title: '缺失字段', width: 180,
      render: (_: unknown, row: SchoolInfo) => {
        const missing = getMissingFields(row)
        if (missing.length === 0) return <Tag color="success" style={{ fontSize: 11 }}>完整</Tag>
        return (
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {missing.map((f) => {
              const shortLabels: Record<string, string> = {
                address: '地址', phone: '电话', website: '官网',
                tuitionFee: '学费', boardingFee: '住宿费', keyFeature: '特色',
                gaokaoRate: '升学率', intro: '简介', tips: '建议',
                sourceUrl: '来源', sourceNote: '来源说明', infoConfidence: '可信度',
                infoVerifiedAt: '核验时间',
              }
              return (
                <Tag key={f} color="error" style={{ fontSize: 10, margin: 1 }}>
                  缺{shortLabels[f] || f}
                </Tag>
              )
            })}
          </div>
        )
      },
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
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>高中学校信息管理</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            本模块为初中部中考志愿模拟模块 · 编辑后家长端和志愿模拟页面同步更新
          </Text>
        </div>
      </div>

      {/* Search + Filter toolbar */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          placeholder="搜索学校名称..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Space wrap size={[4, 4]}>
          {MISSING_FILTERS.map((f) => (
            <Tag
              key={f.key}
              style={{
                cursor: 'pointer', fontSize: 12, padding: '2px 10px',
                borderColor: missingFilter === f.key ? '#E8784A' : undefined,
                color: missingFilter === f.key ? '#E8784A' : undefined,
              }}
              color={missingFilter === f.key ? undefined : undefined}
              onClick={() => setMissingFilter(f.key)}
            >
              {f.label}
            </Tag>
          ))}
        </Space>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={filteredSchools}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1100 }}
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
        width={760}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {/* 基本信息 */}
          <Title level={5} style={{ fontSize: 14, marginBottom: 8 }}>基本信息</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="type" label="学校类型" rules={[{ required: true }]}>
              <Select options={TYPE_OPTIONS.map((t) => ({ label: t, value: t }))} />
            </Form.Item>
            <Form.Item name="location" label="所在地" rules={[{ required: true }]}>
              <Select
                showSearch
                options={locationOptions.map((l) => ({ label: l, value: l }))}
                placeholder="选择或输入地区"
              />
            </Form.Item>
            <Form.Item name="yiTong" label="一统线 / 市区统招分">
              <InputNumber style={{ width: '100%' }} placeholder="省示范填写" />
            </Form.Item>
            <Form.Item name="tongZhao" label="统招线" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="allocationLine" label="分配生录取最低分">
              <InputNumber style={{ width: '100%' }} placeholder="如：660，无分配生留空" />
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

          {/* 可报性 */}
          <Title level={5} style={{ fontSize: 14, marginBottom: 8, marginTop: 16 }}>新乐可报性设置</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="xinleAllocationId" label="分配生 ID（对应内部 key）">
              <Input placeholder="如：xl1、mb7，无则留空" />
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

          {/* 地址与联系方式 */}
          <Title level={5} style={{ fontSize: 14, marginBottom: 8, marginTop: 16 }}>地址与联系方式</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="address" label="详细地址">
              <Input placeholder="学校地址" />
            </Form.Item>
            <Form.Item name="distanceFromXinle" label="距新乐距离">
              <Input placeholder="如：市区内，骑车可达" />
            </Form.Item>
            <Form.Item name="phone" label="招生电话">
              <Input placeholder="0311-XXXXXXXX" />
            </Form.Item>
            <Form.Item name="website" label="官网">
              <Input placeholder="https://..." />
            </Form.Item>
          </div>

          {/* 费用与特色 */}
          <Title level={5} style={{ fontSize: 14, marginBottom: 8, marginTop: 16 }}>费用与特色</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="boardingFee" label="住宿费用">
              <Input placeholder="如：约300元/学期" />
            </Form.Item>
            <Form.Item name="tuitionFee" label="学费说明">
              <Input placeholder="如：公办，学费全免" />
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

          {/* 信息来源 */}
          <Title level={5} style={{ fontSize: 14, marginBottom: 8, marginTop: 16 }}>信息来源与核验</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="sourceUrl" label="信息来源 URL">
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item name="sourceNote" label="来源说明">
              <Input placeholder="如：石家庄市教育局官网2025年招生计划" />
            </Form.Item>
            <Form.Item name="infoConfidence" label="信息可信度">
              <Select
                allowClear
                placeholder="选择可信度等级"
                options={CONFIDENCE_OPTIONS}
              />
            </Form.Item>
            <Form.Item name="infoVerifiedAt" label="信息核验时间">
              <DatePicker style={{ width: '100%' }} placeholder="选择核验日期" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
