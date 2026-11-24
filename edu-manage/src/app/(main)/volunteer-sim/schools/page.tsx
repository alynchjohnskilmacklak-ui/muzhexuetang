'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card, Table, Button, Form, Input, InputNumber,
  Radio, Select, Switch, Typography, Tag, message, Space, DatePicker,
  Col, Row, Segmented,
} from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import type { ColumnsType } from 'antd/es/table'
import {
  EditOutlined, SearchOutlined, BankOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  getSchoolAdmissionHistory,
  type SchoolAdmissionLine,
  type SchoolAdmissionYearRecord,
} from '@/lib/school-admission-history'

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
  admissionHistory?: SchoolAdmissionYearRecord[] | null
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
  const isMobile = useIsMobile() ?? false
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ open: boolean; school: SchoolInfo | null }>({ open: false, school: null })
  const [form] = Form.useForm()
  const [admissionHistory, setAdmissionHistory] = useState<SchoolAdmissionYearRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [missingFilter, setMissingFilter] = useState<MissingFilter>('all')

  const stats = useMemo(() => {
    const total = schools.length
    const complete = schools.filter((s) => calcCompleteness(s) === 100).length
    const missing = schools.filter((s) => calcCompleteness(s) < 100).length
    const unverified = schools.filter((s) => !s.infoVerifiedAt || s.infoConfidence === 'unverified').length
    return { total, complete, missing, unverified }
  }, [schools])

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
      xinleAccessibleOverride: school.xinleAccessibleOverride === true
        ? 1
        : school.xinleAccessibleOverride === false
          ? 0
          : undefined,
      infoVerifiedAt: school.infoVerifiedAt ? dayjs(school.infoVerifiedAt) : null,
    })
    setAdmissionHistory(getSchoolAdmissionHistory(school))
    setEditModal({ open: true, school })
  }

  const updateAdmissionYear = (index: number, patch: Partial<SchoolAdmissionYearRecord>) => {
    setAdmissionHistory((current) => current.map((record, recordIndex) => {
      if (recordIndex !== index) return record
      const next = { ...record, ...patch }
      if (patch.year === 2024) next.fullScore = 670
      if (patch.year === 2025 || patch.year === 2026) next.fullScore = 800
      if (patch.year && ![2024, 2025, 2026].includes(patch.year) && [2024, 2025, 2026].includes(record.year)) {
        next.fullScore = 800
        next.sourceNote = '请根据该年度官方考试科目文件核实中考满分，再录入学校录取线。'
      }
      return next
    }))
  }

  const updateAdmissionLine = (recordIndex: number, lineIndex: number, patch: Partial<SchoolAdmissionLine>) => {
    setAdmissionHistory((current) => current.map((record, index) => index !== recordIndex ? record : {
      ...record,
      lines: record.lines.map((line, index) => {
        if (index !== lineIndex) return line
        return {
          ...line,
          ...patch,
          ...(patch.scope !== undefined && patch.scope !== line.scope
            ? { sourceScope: patch.scope, comparisonScope: patch.scope || null }
            : {}),
          ...(patch.score !== undefined ? { reviewRequired: false } : {}),
        }
      }),
    }))
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    if (!editModal.school) return
    const incompleteLine = admissionHistory.some((record) => record.lines.some((line) => {
      const hasAnyValue = Boolean(line.label.trim() || line.scope.trim() || line.score)
      return hasAnyValue && (!line.label.trim() || !line.scope.trim() || !Number.isInteger(line.score) || line.score <= 0 || line.score > record.fullScore)
    }))
    const duplicateYear = new Set(admissionHistory.map((record) => record.year)).size !== admissionHistory.length
    const invalidHistory = admissionHistory.some((record) => !Number.isInteger(record.year) || record.year < 2000 || record.year > 2100 || !Number.isInteger(record.fullScore) || record.fullScore < 1 || record.fullScore > 1000 || (record.sourceUrl && !/^https?:\/\//i.test(record.sourceUrl)))
    if (duplicateYear) {
      message.error('同一所学校的录取年份不能重复。')
      return
    }
    if (invalidHistory) {
      message.error('请检查历年记录的年份、当年满分和来源链接格式。')
      return
    }
    if (incompleteLine) {
      message.error('请补完整每条分数的名称、适用范围和有效分值；分值不能超过当年满分。')
      return
    }
    setSaving(true)

    const payload: Record<string, unknown> = { ...values }
    payload.admissionHistory = admissionHistory.map((record) => ({
      ...record,
      lines: record.lines.filter((line) => line.label.trim() && line.scope.trim() && Number.isInteger(line.score) && line.score > 0),
    }))
    payload.xinleAccessibleOverride = payload.xinleAccessibleOverride === 1
      ? true
      : payload.xinleAccessibleOverride === 0
        ? false
        : null
    if (payload.infoVerifiedAt instanceof dayjs || (payload.infoVerifiedAt && typeof payload.infoVerifiedAt === 'object')) {
      payload.infoVerifiedAt = (payload.infoVerifiedAt as dayjs.Dayjs).toISOString()
    }

    try {
      const res = await fetch(`/api/schools/${editModal.school.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json().catch(() => null) as { error?: string } | null
      if (res.ok) {
        message.success('保存成功')
        setEditModal({ open: false, school: null })
        fetchSchools()
      } else {
        message.error(result?.error || '保存失败，请稍后重试。')
      }
    } catch (error) {
      console.error('保存学校资料失败', error)
      message.error('网络暂不可用，学校资料尚未保存，请检查网络后重试。')
    } finally {
      setSaving(false)
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
    <PageLayout
      title="高中学校库"
      subtitle="初中部中考升学数据源 · 维护石家庄及新乐各高中录取线、名额政策与办学信息"
      actions={
        <Button icon={<ReloadOutlined />} onClick={fetchSchools} loading={loading}>
          刷新
        </Button>
      }
    >
      {/* 3 KPI overview cards */}
      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              border: missingFilter === 'all' ? '2px solid #14574D' : '1px solid #EEE7E1',
              background: '#FAF8F5',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px' } }}
            onClick={() => setMissingFilter('all')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#8D806F' }}>
              <BankOutlined style={{ color: '#14574D' }} />
              <span>学校总数</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#14574D', marginTop: 2 }}>
              {stats.total} <span style={{ fontSize: 12, fontWeight: 400 }}>所</span>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              border: missingFilter === 'complete' ? '2px solid #27A644' : '1px solid #EEE7E1',
              background: '#F0FDF4',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px' } }}
            onClick={() => setMissingFilter('complete')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#8D806F' }}>
              <CheckCircleOutlined style={{ color: '#27A644' }} />
              <span>信息完整</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#27A644', marginTop: 2 }}>
              {stats.complete} <span style={{ fontSize: 12, fontWeight: 400 }}>所</span>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              border: missingFilter === 'any-missing' ? '2px solid #E8784A' : '1px solid #EEE7E1',
              background: '#FFF9F5',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px' } }}
            onClick={() => setMissingFilter('any-missing')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#8D806F' }}>
              <ExclamationCircleOutlined style={{ color: '#E8784A' }} />
              <span>信息缺失</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#E8784A', marginTop: 2 }}>
              {stats.missing} <span style={{ fontSize: 12, fontWeight: 400 }}>所</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter toolbar */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, border: '1px solid #EEE7E1', marginBottom: 14 }}
        styles={{ body: { padding: 12 } }}
      >
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Segmented
              size="middle"
              value={['all', 'complete', 'any-missing', 'unverified'].includes(missingFilter) ? missingFilter : 'specific'}
              onChange={(val) => setMissingFilter(val as MissingFilter)}
              options={[
                { label: `全部 (${stats.total})`, value: 'all' },
                { label: `完整 (${stats.complete})`, value: 'complete' },
                { label: `缺失 (${stats.missing})`, value: 'any-missing' },
                { label: '待核实', value: 'unverified' },
              ]}
            />
            <Select
              allowClear
              placeholder="按具体缺失项筛选..."
              value={['all', 'complete', 'any-missing', 'unverified'].includes(missingFilter) ? undefined : missingFilter}
              onChange={(val) => setMissingFilter(val || 'all')}
              style={{ width: isMobile ? '100%' : 160 }}
              options={MISSING_FILTERS.filter((f) => !['all', 'complete', 'any-missing', 'unverified'].includes(f.key)).map((f) => ({
                label: f.label,
                value: f.key,
              }))}
            />
          </Space>
          <Input
            placeholder="搜索学校名称或代码..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 220, borderRadius: 8 }}
            allowClear
          />
        </Space>
      </Card>

      {/* Table or Mobile Cards */}
      {isMobile ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredSchools.map((row) => {
            const pct = calcCompleteness(row)
            const missing = getMissingFields(row)
            const color = pct === 100 ? '#1D9E75' : pct >= 70 ? '#C77F00' : '#E24B4A'
            return (
              <Card key={row.id} style={{ borderRadius: 14, border: '1px solid #EEE7E1' }} styles={{ body: { padding: 14 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#1F2329' }}>{row.name}</div>
                    <Space size={4} wrap style={{ marginTop: 4 }}>
                      <Tag color={TYPE_COLORS[row.type]} style={{ margin: 0, fontSize: 11 }}>{row.type}</Tag>
                      <Tag style={{ margin: 0, fontSize: 11 }}>{row.location}</Tag>
                      <Tag color={row.boardingAvail ? 'success' : 'default'} style={{ margin: 0, fontSize: 11 }}>{row.boardingAvail ? '可寄宿' : '走读'}</Tag>
                    </Space>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{pct}%</div>
                    <div style={{ fontSize: 10, color }}>{pct === 100 ? '完整' : pct >= 70 ? '部分缺失' : '严重缺失'}</div>
                  </div>
                </div>
                <div style={{ background: '#FAF8F5', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>
                  <div>统招线：<strong style={{ color: '#1F2329' }}>{row.tongZhao}分</strong> {row.yiTong ? ` · 一统：${row.yiTong}分` : ''} {row.allocationLine ? ` · 分配生：${row.allocationLine}分` : ''}</div>
                  {row.tuitionFee && <div style={{ color: '#8D806F', marginTop: 2 }}>学费：{row.tuitionFee}</div>}
                </div>
                {missing.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {missing.map((f) => (
                      <Tag key={f} color="error" style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>
                        缺{f === 'address' ? '地址' : f === 'phone' ? '电话' : f === 'website' ? '官网' : f === 'tuitionFee' ? '学费' : f === 'boardingFee' ? '住宿费' : f === 'keyFeature' ? '特色' : f === 'gaokaoRate' ? '升学率' : f === 'intro' ? '简介' : f === 'tips' ? '建议' : f === 'sourceUrl' ? '来源' : f}
                      </Tag>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} style={{ borderRadius: 6, background: 'var(--color-primary, #14574D)' }}>
                    编辑资料
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
          <Table
            columns={columns}
            dataSource={filteredSchools}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 所学校` }}
            scroll={{ x: 1100 }}
            size="middle"
          />
        </Card>
      )}

      <BrandModal
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
              <AdaptiveSelect options={TYPE_OPTIONS.map((t) => ({ label: t, value: t }))} />
            </Form.Item>
            <Form.Item name="location" label="所在地" rules={[{ required: true }]}>
              <AdaptiveSelect
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <Title level={5} style={{ fontSize: 14, margin: 0 }}>历年录取分数与满分</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                每年分别维护适用范围、分数线、满分和来源；校线来源未核验时请保留“待核验”。
              </Text>
            </div>
            <Button
              size="small"
              onClick={() => setAdmissionHistory((current) => {
                let year = new Date().getFullYear()
                while (current.some((record) => record.year === year)) year -= 1
                return [{
                  year,
                  fullScore: year === 2024 ? 670 : 800,
                  lines: [],
                  sourceName: null,
                  sourceUrl: null,
                  sourceNote: year >= 2024 ? null : '请先根据该年度官方考试科目文件核实中考满分，再录入学校录取线。',
                  confidence: 'unverified',
                  verifiedAt: null,
                }, ...current]
              })}
            >新增年份</Button>
          </div>

          {admissionHistory.length === 0 && (
            <div style={{ padding: 14, marginBottom: 12, borderRadius: 10, background: 'var(--color-surface-2)', color: 'var(--color-ink-muted)', fontSize: 12 }}>
              暂无年度分数记录。添加后，家长端会按年份显示校线、当年满分和来源。
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {admissionHistory.map((record, recordIndex) => (
              <section key={`${record.year}-${recordIndex}`} style={{ padding: 12, border: '1px solid var(--color-hairline)', borderRadius: 12, background: 'var(--color-surface-1)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                  <label style={{ flex: '1 1 110px', fontSize: 12, color: 'var(--color-ink-muted)' }}>
                    录取年份
                    <InputNumber
                      min={2000}
                      max={2100}
                      value={record.year}
                      onChange={(value) => updateAdmissionYear(recordIndex, { year: Number(value) || 2026 })}
                      style={{ display: 'block', width: '100%', marginTop: 4 }}
                    />
                  </label>
                  <label style={{ flex: '1 1 110px', fontSize: 12, color: 'var(--color-ink-muted)' }}>
                    当年中考满分
                    <InputNumber
                      min={1}
                      max={1000}
                      value={record.fullScore}
                      onChange={(value) => updateAdmissionYear(recordIndex, { fullScore: Number(value) || 1 })}
                      style={{ display: 'block', width: '100%', marginTop: 4 }}
                      addonAfter="分"
                    />
                  </label>
                  <Button danger type="link" onClick={() => setAdmissionHistory((current) => current.filter((_, index) => index !== recordIndex))}>
                    删除年份
                  </Button>
                </div>

                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600 }}>学校录取线</div>
                {record.lines.map((line, lineIndex) => (
                  <div key={`${lineIndex}-${line.label}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <label style={{ flex: '1 1 120px', fontSize: 11, color: 'var(--color-ink-muted)' }}>
                      分数线名称
                      <Input value={line.label} onChange={(event) => updateAdmissionLine(recordIndex, lineIndex, { label: event.target.value })} placeholder="如：统招线" style={{ display: 'block', marginTop: 4 }} />
                    </label>
                    <label style={{ flex: '1 1 130px', fontSize: 11, color: 'var(--color-ink-muted)' }}>
                      招生范围 / 类型
                      <Input value={line.scope} onChange={(event) => updateAdmissionLine(recordIndex, lineIndex, { scope: event.target.value })} placeholder="如：新乐、主城区、分配生" style={{ display: 'block', marginTop: 4 }} />
                    </label>
                    <label style={{ flex: '0 1 100px', minWidth: 90, fontSize: 11, color: 'var(--color-ink-muted)' }}>
                      录取分数
                      <InputNumber min={1} max={record.fullScore} value={line.score || null} onChange={(value) => updateAdmissionLine(recordIndex, lineIndex, { score: Number(value) || 0 })} style={{ display: 'block', width: '100%', marginTop: 4 }} />
                    </label>
                    <Button danger type="text" size="small" onClick={() => updateAdmissionYear(recordIndex, { lines: record.lines.filter((_, index) => index !== lineIndex) })}>
                      删除
                    </Button>
                    {line.reviewRequired && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexBasis: '100%', color: 'var(--color-warning-text)', fontSize: 12 }}>
                        <span>与 2025 同范围线相差至少 100 分，建议核对两年原表。</span>
                        <Button type="link" size="small" onClick={() => updateAdmissionLine(recordIndex, lineIndex, { reviewRequired: false })}>已人工核对</Button>
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  type="dashed"
                  size="small"
                  block
                  style={{ marginTop: 9 }}
                  onClick={() => updateAdmissionYear(recordIndex, { lines: [...record.lines, { label: '', scope: '', score: 0 }] })}
                >
                  添加分数线
                </Button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '0 10px', marginTop: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                    官方 / 学校资料来源名称
                    <Input value={record.sourceName ?? ''} onChange={(event) => updateAdmissionYear(recordIndex, { sourceName: event.target.value || null })} placeholder="如：石家庄市教育考试院录取线公告" style={{ display: 'block', marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                    来源链接
                    <Input type="url" value={record.sourceUrl ?? ''} onChange={(event) => updateAdmissionYear(recordIndex, { sourceUrl: event.target.value || null })} placeholder="https://..." style={{ display: 'block', marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                    数据可信度
                    <Select
                      value={record.confidence || 'unverified'}
                      onChange={(value) => updateAdmissionYear(recordIndex, { confidence: value })}
                      options={CONFIDENCE_OPTIONS}
                      style={{ display: 'block', width: '100%', marginTop: 4 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                    核验日期
                    <Input type="date" value={record.verifiedAt?.slice(0, 10) ?? ''} onChange={(event) => updateAdmissionYear(recordIndex, { verifiedAt: event.target.value || null })} style={{ display: 'block', marginTop: 4 }} />
                  </label>
                </div>
                <label style={{ display: 'block', marginTop: 8, fontSize: 11, color: 'var(--color-ink-muted)' }}>
                  口径说明
                  <Input value={record.sourceNote ?? ''} onChange={(event) => updateAdmissionYear(recordIndex, { sourceNote: event.target.value || null })} placeholder="说明适用地区、批次或核验情况" style={{ display: 'block', marginTop: 4 }} />
                </label>
              </section>
            ))}
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
            <Form.Item
              name="xinleAccessibleOverride"
              label="手动覆盖推导"
              extra={<Button type="link" size="small" onClick={() => form.setFieldValue('xinleAccessibleOverride', undefined)}>恢复自动推导</Button>}
            >
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: '强制可报', value: 1 },
                  { label: '强制不可报', value: 0 },
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
              <Input type="tel" inputMode="numeric" placeholder="0311-XXXXXXXX" />
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
              <AdaptiveSelect
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
      </BrandModal>
    </PageLayout>
  )
}
