'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Divider, Form, InputNumber, Modal, Select,
  Spin, Switch, Tag, Typography,
} from 'antd'
import {
  ArrowLeftOutlined, SearchOutlined, TrophyOutlined,
  CloseOutlined, SwapOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import {
  CONTROL_LINES_2025,
  getAllocationBands,
  getAllocationQuotaByName,
  getMarketPercentile,
  getMarketRank,
  getScoreTag,
  getTopRecommendation,
  isXinleAccessible,
  SCORE_TAG_CONFIG,
  TOTAL_EXAMINEES_2025,
  XINLE_ALLOCATION_2025,
  type ScoreTag,
} from '@/data/volunteer-2025'

const { Title, Text } = Typography

const XINLE_SCHOOLS = Object.keys(XINLE_ALLOCATION_2025).filter((school) => school !== '超击武校')

interface DBSchool {
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

interface ProcessedSchool extends DBSchool {
  tag: ScoreTag
  gap: number
  quota: number
  accessible: boolean
}

const TAG_OPTIONS: ('全部' | ScoreTag)[] = ['全部', '分配生机会', '保底', '稳妥', '冲刺', '差距较大', '暂未达线']
const TYPE_OPTIONS = ['全部', '省示范', '市重点', '县中', '民办']

// Warm light theme tokens
const C = {
  canvas: '#faf8f5',
  surface1: '#ffffff',
  surface3: '#f5f2ee',
  hairline: 'rgba(0,0,0,.06)',
  hairlineStrong: 'rgba(0,0,0,.12)',
  ink: '#1a1201',
  inkMuted: '#5a4e3a',
  inkSubtle: '#9a8e7a',
  primary: '#E8784A',
  primaryBg: '#fff3ec',
  success: '#1D9E75',
  successBg: '#eaf7f1',
  warning: '#C77F00',
  error: '#E24B4A',
}

export default function VolunteerSimPage() {
  const router = useRouter()
  const [form] = Form.useForm()

  const [inputScore, setInputScore] = useState<number | null>(null)
  const [inputSchool, setInputSchool] = useState<string>('')
  const [inputRank, setInputRank] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [schools, setSchools] = useState<DBSchool[]>([])
  const [loading, setLoading] = useState(false)
  const [schoolsReady, setSchoolsReady] = useState(false)

  const [filterTag, setFilterTag] = useState<string>('全部')
  const [filterType, setFilterType] = useState<string>('全部')
  const [filterLocation, setFilterLocation] = useState<string>('全部')
  const [onlyAccessible, setOnlyAccessible] = useState(true)

  const [allocationSlot, setAllocationSlot] = useState<DBSchool | null>(null)
  const [tongzhaoSlots, setTongzhaoSlots] = useState<(DBSchool | null)[]>(Array(6).fill(null))

  const [detailSchool, setDetailSchool] = useState<ProcessedSchool | null>(null)

  useEffect(() => {
    fetch('/api/volunteer/schools')
      .then(r => r.json())
      .then(d => setSchools(d.schools || []))
      .catch(() => {})
      .finally(() => setSchoolsReady(true))
  }, [])

  const locations = useMemo(() => {
    const set = new Set<string>()
    schools.forEach(s => { if (s.location) set.add(s.location) })
    return Array.from(set).sort()
  }, [schools])

  function getAllocationQuota(school: DBSchool): number {
    if (!inputSchool) return 0
    return getAllocationQuotaByName(school.name, school.fullName, inputSchool)
  }

  const marketRank = submitted && inputScore !== null ? getMarketRank(inputScore) : null
  const percentile = submitted && inputScore !== null ? getMarketPercentile(inputScore) : '0.00'

  const processedSchools = useMemo((): ProcessedSchool[] => {
    if (!submitted || inputScore === null) return []
    return schools
      .map(school => {
        const quota = getAllocationQuota(school)
        const tag = getScoreTag(
          inputScore,
          school.tongZhao,
          school.allocationLine,
          quota,
          inputRank ?? 9999
        )
        const gap = inputScore - school.tongZhao
        const accessible = school.xinleAccessibleOverride ?? isXinleAccessible(school)
        return { ...school, tag, gap, quota, accessible }
      })
      .sort((a, b) => {
        if (a.accessible !== b.accessible) return a.accessible ? -1 : 1
        const pa = SCORE_TAG_CONFIG[a.tag].priority
        const pb = SCORE_TAG_CONFIG[b.tag].priority
        if (pa !== pb) return pa - pb
        return b.tongZhao - a.tongZhao
      })
  }, [schools, submitted, inputScore, inputSchool, inputRank])

  const filteredSchools = useMemo(() => {
    return processedSchools.filter(s => {
      if (onlyAccessible && !s.accessible) return false
      if (filterTag !== '全部' && s.tag !== filterTag) return false
      if (filterType !== '全部' && s.type !== filterType) return false
      if (filterLocation !== '全部' && s.location !== filterLocation) return false
      return true
    })
  }, [processedSchools, onlyAccessible, filterTag, filterType, filterLocation])

  // Tag counts reflect current visibility scope
  const tagCounts = useMemo(() => {
    const base = onlyAccessible ? processedSchools.filter(s => s.accessible) : processedSchools
    const counts: Record<string, number> = {}
    for (const t of TAG_OPTIONS) {
      counts[t] = t === '全部' ? base.length : base.filter(s => s.tag === t).length
    }
    return counts
  }, [processedSchools, onlyAccessible])

  // Accessibility summary counts
  const accessibleSummary = useMemo(() => {
    const accessible = processedSchools.filter(s => s.accessible)
    const counts: Record<string, number> = {}
    for (const t of TAG_OPTIONS) {
      if (t === '全部') continue
      counts[t] = accessible.filter(s => s.tag === t).length
    }
    return { total: accessible.length, counts }
  }, [processedSchools])

  // Allocation cascade bands
  const allocationBands = useMemo(() => {
    if (!submitted || inputScore === null || !inputSchool || inputRank === null) return null
    return getAllocationBands(
      inputSchool, inputRank, inputScore,
      (allocKey) => {
        const s = schools.find(school =>
          school.name === allocKey ||
          school.fullName === allocKey ||
          school.fullName.includes(allocKey) ||
          school.name.replace(/[(（][^)）]*[)）]\s*$/, '').trim() === allocKey
        )
        return s ? { tongZhao: s.tongZhao, allocationLine: s.allocationLine } : null
      }
    )
  }, [submitted, inputScore, inputSchool, inputRank, schools])

  const allocationTop = useMemo(() => {
    if (!allocationBands) return null
    return getTopRecommendation(allocationBands)
  }, [allocationBands])

  const handleSimulate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 300))
      setInputScore(values.score)
      setInputSchool(values.schoolName)
      setInputRank(values.schoolRank)
      setSubmitted(true)
      setAllocationSlot(null)
      setTongzhaoSlots(Array(6).fill(null))
      setTimeout(() => {
        document.getElementById('sim-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.resetFields()
    setSubmitted(false)
    setInputScore(null)
    setInputSchool('')
    setInputRank(null)
    setAllocationSlot(null)
    setTongzhaoSlots(Array(6).fill(null))
    setFilterTag('全部')
    setFilterType('全部')
    setFilterLocation('全部')
    setOnlyAccessible(true)
  }

  const addToAllocation = useCallback((school: DBSchool) => {
    setAllocationSlot(school)
  }, [])

  const removeAllocation = useCallback(() => {
    setAllocationSlot(null)
  }, [])

  const addToTongzhao = useCallback((school: DBSchool) => {
    setTongzhaoSlots(prev => {
      const idx = prev.findIndex(s => s?.schoolId === school.schoolId)
      if (idx !== -1) return prev
      const emptyIdx = prev.findIndex(s => s === null)
      if (emptyIdx === -1) return prev
      const next = [...prev]
      next[emptyIdx] = school
      return next
    })
  }, [])

  const removeTongzhao = useCallback((index: number) => {
    setTongzhaoSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }, [])

  const swapTongzhao = useCallback((from: number, to: number) => {
    setTongzhaoSlots(prev => {
      const next = [...prev]
      const tmp = next[from]
      next[from] = next[to]
      next[to] = tmp
      return next
    })
  }, [])

  const isInBasket = useCallback((schoolId: string) => {
    if (allocationSlot?.schoolId === schoolId) return true
    return tongzhaoSlots.some(s => s?.schoolId === schoolId)
  }, [allocationSlot, tongzhaoSlots])

  const tongzhaoFilled = tongzhaoSlots.filter(Boolean).length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: C.ink }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
          style={{ color: C.inkSubtle }}
        />
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, color: C.ink }}>志愿模拟填报</Title>
          <Text style={{ fontSize: 13, color: C.inkSubtle }}>
            基于2025年石家庄中考数据 · 仅限新乐市考生 · 结果仅供参考
          </Text>
        </div>
      </div>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 20, borderRadius: 10, background: '#fdf4e3', border: '1px solid #f0dca8' }}
        message={<span style={{ color: C.warning }}>重要提示</span>}
        description={<span style={{ color: C.inkMuted }}>本模拟基于2025年分数线（满分800分）和新乐籍分配生名额数据。每年分数线存在波动，请以当年官方公布数据为准，建议结合班主任意见综合判断。</span>}
      />

      {/* Input Area */}
      {!submitted ? (
        <div style={{
          background: C.surface1,
          border: `1px solid ${C.hairline}`,
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
            <SearchOutlined style={{ marginRight: 8, color: C.primary }} />
            输入学生信息
          </div>
          <Spin spinning={!schoolsReady} tip="正在加载学校数据...">
            <Form form={form} layout="vertical">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
                <Form.Item
                  name="score"
                  label={<span style={{ color: C.inkMuted, fontWeight: 500 }}>中考总分 <Text style={{ fontSize: 12, color: C.inkSubtle }}>（满分800分）</Text></span>}
                  rules={[
                    { required: true, message: '请输入分数' },
                    { type: 'number', min: 0, max: 800, message: '分数范围 0 - 800' },
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="例：678" min={0} max={800} size="large" />
                </Form.Item>
                <Form.Item
                  name="schoolName"
                  label={<span style={{ color: C.inkMuted, fontWeight: 500 }}>就读初中 <Text style={{ fontSize: 12, color: C.inkSubtle }}>（新乐市范围）</Text></span>}
                  rules={[{ required: true, message: '请选择初中' }]}
                >
                  <Select
                    placeholder="选择新乐初中"
                    size="large"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label as string || '').includes(input)
                    }
                    options={XINLE_SCHOOLS.map((school) => ({ label: school, value: school }))}
                  />
                </Form.Item>
                <Form.Item
                  name="schoolRank"
                  label={<span style={{ color: C.inkMuted, fontWeight: 500 }}>本校排名 <Text style={{ fontSize: 12, color: C.inkSubtle }}>（第几名）</Text></span>}
                  rules={[
                    { required: true, message: '请输入排名' },
                    { type: 'number', min: 1, message: '至少第1名' },
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="例：5" min={1} size="large" />
                </Form.Item>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={handleSimulate}
                loading={loading}
                style={{ background: C.primary, borderColor: C.primary, minWidth: 160 }}
              >
                开始模拟
              </Button>
            </Form>
          </Spin>
        </div>
      ) : (
        /* Summary bar — white card */
        <div style={{
          background: C.surface1,
          border: `1px solid ${C.hairline}`,
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>分数</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>{inputScore}</div>
            </div>
            <div style={{ width: 1, height: 32, background: C.hairline }} />
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>全市排名</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                {marketRank !== null ? `约第 ${marketRank.toLocaleString()} 名` : '—'}
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: C.hairline }} />
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>超越全市</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.success }}>
                {(100 - parseFloat(percentile)).toFixed(1)}%
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: C.hairline }} />
            <div>
              <Text style={{ color: C.inkSubtle, fontSize: 12 }}>新乐控制线</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                {CONTROL_LINES_2025['新乐市']}分
              </div>
            </div>
            <Tag color={inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市'] ? 'success' : 'error'}>
              {inputScore !== null && inputScore >= CONTROL_LINES_2025['新乐市'] ? '已过控制线' : '未过控制线'}
            </Tag>
          </div>
          <Button onClick={handleReset} style={{ color: C.inkMuted }}>重新输入</Button>
        </div>
      )}

      {submitted && (
        <div id="sim-result" style={{ display: 'flex', gap: 20 }}>
          {/* Left sidebar */}
          <div style={{
            width: 180,
            flexShrink: 0,
            background: C.surface1,
            border: `1px solid ${C.hairline}`,
            borderRadius: 14,
            padding: '16px 14px',
            height: 'fit-content',
            position: 'sticky',
            top: 80,
          }}>
            <Text strong style={{ color: C.ink, fontSize: 13 }}>分数匹配</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {TAG_OPTIONS.map(t => {
                const cfg = t === '全部' ? null : SCORE_TAG_CONFIG[t]
                return (
                  <div
                    key={t}
                    onClick={() => setFilterTag(t)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: filterTag === t ? C.primaryBg : 'transparent',
                      color: filterTag === t ? C.primary : C.inkMuted,
                      fontWeight: filterTag === t ? 600 : 400,
                      transition: 'background .15s',
                    }}
                  >
                    <span>{t}</span>
                    <span style={{ fontSize: 11, color: C.inkSubtle, minWidth: 18, textAlign: 'right' }}>
                      {tagCounts[t] ?? 0}
                    </span>
                  </div>
                )
              })}
            </div>

            <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

            <Text strong style={{ color: C.ink, fontSize: 13 }}>学校类型</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {TYPE_OPTIONS.map(t => (
                <div
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    background: filterType === t ? C.primaryBg : 'transparent',
                    color: filterType === t ? C.primary : C.inkMuted,
                    fontWeight: filterType === t ? 600 : 400,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>

            <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

            <Text strong style={{ color: C.ink, fontSize: 13 }}>地区</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                onClick={() => setFilterLocation('全部')}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  background: filterLocation === '全部' ? C.primaryBg : 'transparent',
                  color: filterLocation === '全部' ? C.primary : C.inkMuted,
                  fontWeight: filterLocation === '全部' ? 600 : 400,
                }}
              >
                全部
              </div>
              {locations.map(l => (
                <div
                  key={l}
                  onClick={() => setFilterLocation(l)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    background: filterLocation === l ? C.primaryBg : 'transparent',
                    color: filterLocation === l ? C.primary : C.inkMuted,
                    fontWeight: filterLocation === l ? 600 : 400,
                  }}
                >
                  {l}
                </div>
              ))}
            </div>

            <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: C.inkSubtle }}>仅新乐可报</Text>
              <Switch
                size="small"
                checked={onlyAccessible}
                onChange={setOnlyAccessible}
                checkedChildren="仅新乐可报"
                unCheckedChildren="显示全部"
              />
            </div>
            <Text style={{ fontSize: 11, color: C.inkSubtle, display: 'block', marginTop: 4 }}>
              关闭后显示全部学校（含新乐暂不可报，仅供参考扩展）
            </Text>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Accessibility summary bar */}
            <div style={{
              background: C.surface1,
              border: `1px solid ${C.hairline}`,
              borderRadius: 10,
              padding: '10px 16px',
              marginBottom: 12,
              fontSize: 13,
              color: C.inkMuted,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              <Text strong style={{ color: C.primary, fontSize: 15, marginRight: 4 }}>
                共 {accessibleSummary.total} 所新乐可报学校
              </Text>
              <span style={{ color: C.inkSubtle }}>·</span>
              {TAG_OPTIONS.filter(t => t !== '全部').map(t => {
                const cfg = SCORE_TAG_CONFIG[t]
                return (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: cfg.color, fontWeight: 600 }}>{t}</span>
                    <span style={{ color: C.inkSubtle }}>{accessibleSummary.counts[t] ?? 0}</span>
                  </span>
                )
              }).reduce((prev, curr) => <>{prev} <span style={{ color: C.inkSubtle }}>·</span> {curr}</>)}
            </div>

            {/* Allocation cascade analysis */}
            {allocationBands && allocationBands.length > 0 && (
              <div style={{
                background: C.surface1,
                border: `1px solid ${C.hairline}`,
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <Text strong style={{ fontSize: 15, color: C.ink }}>分配生志愿（只能填1所）</Text>
                </div>

                {/* Top recommendation */}
                {allocationTop ? (
                  (() => {
                    const topDb = schools.find(s => s.name === allocationTop.highSchoolName || s.fullName.includes(allocationTop.highSchoolName))
                    return (
                      <div style={{
                        background: C.primaryBg,
                        border: `1px solid ${C.primary}`,
                        borderRadius: 10,
                        padding: '14px 18px',
                        marginBottom: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14 }}>💡</span>
                          <Text strong style={{ fontSize: 15, color: C.primary }}>
                            分配生志愿首选建议：【{allocationTop.highSchoolName}】
                          </Text>
                        </div>
                        <Text style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.7 }}>
                          你校内第{allocationTop.bandLo < allocationTop.bandHi
                            ? `${allocationTop.bandLo}-${allocationTop.bandHi}`
                            : allocationTop.bandLo}名，落在{allocationTop.highSchoolName}名额区间（第{allocationTop.bandLo}-{allocationTop.bandHi}名），
                          分数{inputScore}已超分配线约{inputScore! - allocationTop.allocationLine}分，录取把握大。
                          分配生只能填1所，建议填报此校。
                        </Text>
                        <div style={{ marginTop: 10 }}>
                          {topDb ? (
                            <Button
                              type="primary"
                              size="small"
                              style={{ background: C.primary, borderColor: C.primary }}
                              disabled={!!allocationSlot}
                              onClick={() => addToAllocation(topDb)}
                            >
                              {allocationSlot ? '分配生位已占用' : '设为首选分配生志愿'}
                            </Button>
                          ) : (
                            <Text style={{ fontSize: 12, color: C.inkSubtle }}>
                              该校尚未录入数据库，请通过管理端补充后即可选择。
                            </Text>
                          )}
                        </div>
                      </div>
                    )
                  })()
                ) : allocationBands.some(b => b.tag === '推荐') ? (
                  <div style={{
                    background: '#fdf4e3',
                    border: '1px solid #f0dca8',
                    borderRadius: 10,
                    padding: '12px 18px',
                    marginBottom: 12,
                  }}>
                    <Text style={{ fontSize: 13, color: C.warning }}>
                      存在推荐学校但未匹配到数据库记录，请检查学校名称是否一致。
                    </Text>
                  </div>
                ) : null}

                {/* 推荐组（不含首选） + 保底组 */}
                {allocationBands.filter(b => b.tag === '推荐' && b !== allocationTop).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 13, color: C.inkMuted }}>其他匹配选项：</Text>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {allocationBands.filter(b => b.tag === '推荐' && b !== allocationTop).map(b => {
                        const db = schools.find(s => s.name === b.highSchoolName || s.fullName.includes(b.highSchoolName))
                        return (
                          <div key={b.highSchoolName} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 14px', borderRadius: 8,
                            background: C.surface3, border: `1px solid ${C.hairline}`,
                          }}>
                            <span style={{ fontSize: 13, color: C.ink }}>◎ {b.highSchoolName}</span>
                            <Text style={{ fontSize: 12, color: C.inkSubtle }}>
                              分配线 {b.allocationLine}分 · 名额第{b.bandLo}-{b.bandHi}名
                            </Text>
                            {db && (
                              <Button size="small" disabled={!!allocationSlot}
                                style={{ marginLeft: 'auto', fontSize: 11 }}
                                onClick={() => addToAllocation(db)}>
                                {allocationSlot ? '已占用' : '选为分配生'}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 保底组 */}
                {allocationBands.filter(b => b.tag === '保底').length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 13, color: C.success }}>保底选项（排名优于该档，把握很大）：</Text>
                    <div style={{ marginTop: 4, fontSize: 12, color: C.inkSubtle, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {allocationBands.filter(b => b.tag === '保底').map(b => (
                        <span key={b.highSchoolName} style={{
                          background: C.successBg, padding: '3px 8px', borderRadius: 6,
                          border: '1px solid #b6e2d2', color: C.success,
                        }}>
                          {b.highSchoolName}（分配线{b.allocationLine}分）
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 排名不足 */}
                {allocationBands.filter(b => b.tag === '排名不足').length > 0 && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                    background: '#fdf4e3', border: '1px solid #f0dca8',
                  }}>
                    <Text style={{ fontSize: 12, color: C.warning }}>
                      ⚠️ 以下学校因本校前序排名已占满名额，难以争取：
                    </Text>
                    <div style={{ marginTop: 4, fontSize: 12, color: C.inkSubtle }}>
                      {allocationBands.filter(b => b.tag === '排名不足').map(b =>
                        `${b.highSchoolName}（校内前${b.bandHi}名）`
                      ).join('、')}
                    </div>
                  </div>
                )}

                {/* 分数不足 */}
                {allocationBands.filter(b => b.tag === '分数不足').length > 0 && (
                  <div style={{
                    padding: '8px 14px', borderRadius: 8, marginBottom: 8,
                    background: C.surface3, border: `1px solid ${C.hairline}`,
                  }}>
                    <Text style={{ fontSize: 12, color: C.inkSubtle }}>
                      以下学校分数未达分配线：{allocationBands.filter(b => b.tag === '分数不足').map(b =>
                        `${b.highSchoolName}（需≥${b.allocationLine}分）`
                      ).join('、')}
                    </Text>
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{
                  marginTop: 12, padding: '8px 14px', borderRadius: 8,
                  background: C.surface3, border: `1px solid ${C.hairline}`,
                }}>
                  <Text style={{ fontSize: 11, color: C.inkSubtle, lineHeight: 1.6 }}>
                    说明：级联模型基于"全校学生按分数优先选最好学校"的理想假设。实际中部分学生有偏好（如宁可就近上新乐一中也不去市区），会使各档边界浮动。分配线为估算值（max(统招线-50, 460)），以当年官方为准。分配生录取还要求达到分配控制线、名额用不完不顺延。最终以官方录取为准，建议结合班主任意见。
                  </Text>
                </div>
              </div>
            )}

            {/* No allocation data warning */}
            {allocationBands && allocationBands.length === 0 && (
              <div style={{
                background: '#fdf4e3', border: '1px solid #f0dca8',
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              }}>
                <Text style={{ fontSize: 13, color: C.warning }}>
                  该初中（{inputSchool}）目前无分配生名额数据，请检查分配表是否覆盖此初中，或联系管理员核实。
                </Text>
              </div>
            )}

            {/* Category tabs */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
            }}>
              {TAG_OPTIONS.map(t => {
                const cfg = t === '全部' ? null : SCORE_TAG_CONFIG[t]
                return (
                  <div
                    key={t}
                    onClick={() => setFilterTag(t)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: filterTag === t ? 600 : 400,
                      background: filterTag === t
                        ? (cfg?.bg ?? C.primaryBg)
                        : C.surface3,
                      border: `1px solid ${filterTag === t ? (cfg?.border ?? C.hairlineStrong) : C.hairline}`,
                      color: filterTag === t ? (cfg?.color ?? C.primary) : C.inkMuted,
                      transition: 'all .15s',
                    }}
                  >
                    {t}
                    <span style={{ marginLeft: 6, fontSize: 11, color: C.inkSubtle }}>
                      {tagCounts[t] ?? 0}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* School cards */}
            {filteredSchools.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 60, color: C.inkSubtle,
                background: C.surface1, borderRadius: 14, border: `1px solid ${C.hairline}`,
              }}>
                <TrophyOutlined style={{ fontSize: 40, marginBottom: 12, color: C.hairline }} />
                <div style={{ fontSize: 15 }}>暂无匹配学校</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>请调整筛选条件或修改分数后重试</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredSchools.map(school => {
                  const cfg = SCORE_TAG_CONFIG[school.tag]
                  const inBasket = isInBasket(school.schoolId)
                  const allocFull = !!allocationSlot
                  const tongzhaoFull = tongzhaoFilled >= 6
                  const isAllocCandidate = school.tag === '分配生机会'

                  return (
                    <div
                      key={school.schoolId}
                      style={{
                        background: school.accessible ? C.surface1 : C.surface3,
                        border: `1px solid ${C.hairline}`,
                        borderLeft: `4px solid ${cfg.color}`,
                        borderRadius: 12,
                        padding: '16px 20px',
                        cursor: 'pointer',
                        opacity: school.accessible ? 1 : 0.7,
                        transition: 'border-color .15s, background .15s',
                      }}
                      onClick={() => setDetailSchool({ ...school, tag: school.tag, gap: school.gap, quota: school.quota, accessible: school.accessible })}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Tag style={{
                            background: cfg.bg, color: cfg.color,
                            border: `1px solid ${cfg.border}`, margin: 0, fontSize: 12,
                          }}>
                            {cfg.label}
                          </Tag>
                          <Tag style={{ margin: 0, fontSize: 11, background: 'transparent', color: C.inkMuted, border: `1px solid ${C.hairline}` }}>
                            {school.type}
                          </Tag>
                          <Tag style={{ margin: 0, fontSize: 11, background: 'transparent', color: C.inkMuted, border: `1px solid ${C.hairline}` }}>
                            {school.location}
                          </Tag>
                          {school.accessible ? (
                            <Tag style={{ margin: 0, fontSize: 11, background: C.successBg, color: C.success, border: '1px solid #b6e2d2' }}>
                              ✓ 新乐可报
                            </Tag>
                          ) : (
                            <Tag style={{ margin: 0, fontSize: 11, background: C.surface3, color: C.inkSubtle, border: `1px solid ${C.hairline}` }}>
                              ⊘ 新乐暂不可报
                            </Tag>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                          {isAllocCandidate && school.accessible && (
                            allocFull && allocationSlot?.schoolId === school.schoolId ? (
                              <Button size="small" disabled style={{ fontSize: 12 }}>✓ 已选</Button>
                            ) : (
                              <Button
                                size="small"
                                disabled={allocFull}
                                style={{
                                  fontSize: 12,
                                  borderColor: C.primary,
                                  color: C.primary,
                                }}
                                onClick={() => addToAllocation(school)}
                              >
                                +加入分配生
                              </Button>
                            )
                          )}
                          {inBasket && tongzhaoSlots.some(s => s?.schoolId === school.schoolId) ? (
                            <Button size="small" disabled style={{ fontSize: 12 }}>✓ 已选</Button>
                          ) : (
                            school.accessible && (
                              <Button
                                size="small"
                                disabled={tongzhaoFull}
                                style={{ fontSize: 12 }}
                                onClick={() => addToTongzhao(school)}
                              >
                                {tongzhaoFull ? '统招已满' : '+加入统招'}
                              </Button>
                            )
                          )}
                          {!school.accessible && (
                            <Button size="small" disabled style={{ fontSize: 12 }}>+加入统招</Button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Text strong style={{ fontSize: 16, color: C.ink }}>{school.name}</Text>
                          <Text style={{ fontSize: 12, color: C.inkSubtle, marginLeft: 8 }}>{school.fullName}</Text>
                          {!school.accessible && (
                            <Text style={{ fontSize: 11, color: C.inkSubtle, marginLeft: 8 }}>
                              该校未面向新乐招生，仅供了解
                            </Text>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {school.yiTong && (
                            <Text style={{ fontSize: 12, color: C.inkSubtle, display: 'block' }}>
                              一统线：<Text strong style={{ color: C.inkMuted }}>{school.yiTong}</Text>分
                            </Text>
                          )}
                          <Text style={{ fontSize: 14 }}>
                            统招线：
                            <Text strong style={{ color: school.gap >= 0 ? C.success : C.error, fontSize: 16 }}>
                              {school.tongZhao}
                            </Text>
                            分
                            <Text style={{ fontSize: 12, marginLeft: 4, color: school.gap >= 0 ? C.success : C.error }}>
                              ({school.gap >= 0 ? `高出${school.gap}分` : `差${Math.abs(school.gap)}分`})
                            </Text>
                          </Text>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: C.inkSubtle }}>
                        {school.keyFeature && <span>{school.keyFeature}</span>}
                        {school.gaokaoRate && <span>升学率：{school.gaokaoRate}</span>}
                        {school.boardingAvail && <span>可住宿</span>}
                        {school.tuitionFee && <span>{school.tuitionFee}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* School Detail Modal */}
      <Modal
        title={null}
        open={!!detailSchool}
        onCancel={() => setDetailSchool(null)}
        footer={null}
        width={640}
        styles={{
          content: { background: C.surface1, padding: 0 },
          header: { background: C.surface1 },
        }}
      >
        {detailSchool && (() => {
          const cfg = SCORE_TAG_CONFIG[detailSchool.tag]
          return (
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <Tag style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, margin: 0 }}>
                  {cfg.label}
                </Tag>
                {detailSchool.accessible ? (
                  <Tag style={{ margin: 0, background: C.successBg, color: C.success, border: '1px solid #b6e2d2' }}>
                    ✓ 新乐可报
                  </Tag>
                ) : (
                  <Tag style={{ margin: 0, background: C.surface3, color: C.inkSubtle, border: `1px solid ${C.hairline}` }}>
                    ⊘ 新乐暂不可报
                  </Tag>
                )}
              </div>

              <Title level={4} style={{ margin: '0 0 4px', color: C.ink, fontSize: 20 }}>
                {detailSchool.fullName}
              </Title>
              <Text style={{ color: C.inkSubtle, fontSize: 13 }}>{detailSchool.name}</Text>

              {/* Info grid */}
              <div style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 24px',
                padding: '16px',
                background: C.surface3,
                borderRadius: 10,
                border: `1px solid ${C.hairline}`,
              }}>
                <InfoRow label="学校类型" value={detailSchool.type} />
                <InfoRow label="所在地" value={detailSchool.location} />
                {detailSchool.address && <InfoRow label="地址" value={detailSchool.address} />}
                {detailSchool.distanceFromXinle && <InfoRow label="距新乐" value={detailSchool.distanceFromXinle} />}
                {detailSchool.phone && <InfoRow label="电话" value={detailSchool.phone} />}
                {detailSchool.website && <InfoRow label="官网" value={detailSchool.website} />}
              </div>

              {/* Score data */}
              <div style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
              }}>
                {detailSchool.yiTong && (
                  <ScoreBlock label="一统线" value={`${detailSchool.yiTong}分`} />
                )}
                <ScoreBlock label="统招线" value={`${detailSchool.tongZhao}分`} sub={`距统招线 ${detailSchool.gap >= 0 ? `高出${detailSchool.gap}` : `差${Math.abs(detailSchool.gap)}`}分`} />
                {detailSchool.allocationLine && (
                  <ScoreBlock label="分配生录取线" value={`${detailSchool.allocationLine}分`} />
                )}
              </div>

              {detailSchool.quota > 0 && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: C.primaryBg,
                  border: `1px solid #f5c9b3`,
                  color: C.primary,
                  fontSize: 13,
                }}>
                  {inputSchool} → {detailSchool.name}：分配生名额 <Text strong style={{ color: C.primary }}>{detailSchool.quota}</Text> 个
                </div>
              )}

              {/* Features */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {detailSchool.keyFeature && (
                  <FeatureSection label="核心特色" content={detailSchool.keyFeature} />
                )}
                {detailSchool.gaokaoRate && (
                  <FeatureSection label="高考升学率" content={detailSchool.gaokaoRate} />
                )}
                {detailSchool.enrollment && (
                  <FeatureSection label="年招生人数" content={`约${detailSchool.enrollment}人`} />
                )}
                {detailSchool.boardingAvail && (
                  <FeatureSection label="住宿" content={`可住宿${detailSchool.boardingFee ? ` · ${detailSchool.boardingFee}` : ''}`} />
                )}
                {detailSchool.tuitionFee && (
                  <FeatureSection label="学费" content={detailSchool.tuitionFee} />
                )}
                {detailSchool.intro && (
                  <div>
                    <Text strong style={{ color: C.inkMuted, fontSize: 13 }}>学校简介</Text>
                    <div style={{ color: C.inkMuted, fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>
                      {detailSchool.intro}
                    </div>
                  </div>
                )}
                {detailSchool.tips && (
                  <div>
                    <Text strong style={{ color: C.warning, fontSize: 13 }}>报考建议</Text>
                    <div style={{ color: C.inkMuted, fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>
                      {detailSchool.tips}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div style={{
                display: 'flex', gap: 12, marginTop: 24, paddingTop: 16,
                borderTop: `1px solid ${C.hairline}`,
              }}>
                {detailSchool.tag === '分配生机会' && detailSchool.accessible && (
                  <Button
                    type="primary"
                    disabled={!!allocationSlot}
                    style={{ background: C.primary, borderColor: C.primary }}
                    onClick={() => { addToAllocation(detailSchool); setDetailSchool(null) }}
                  >
                    {allocationSlot ? '分配生位已占用' : '加入分配生志愿'}
                  </Button>
                )}
                {detailSchool.accessible ? (
                  <Button
                    disabled={tongzhaoFilled >= 6 || isInBasket(detailSchool.schoolId)}
                    onClick={() => { addToTongzhao(detailSchool); setDetailSchool(null) }}
                  >
                    {isInBasket(detailSchool.schoolId) ? '已在志愿篮' : tongzhaoFilled >= 6 ? '统招已满（6/6）' : '加入平行统招志愿'}
                  </Button>
                ) : (
                  <Button disabled>新乐暂不可报，无法加入志愿</Button>
                )}
              </div>
              <div style={{ height: 24 }} />
            </div>
          )
        })()}
      </Modal>

      {/* Bottom sticky volunteer basket */}
      {submitted && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 24,
          background: C.surface1,
          borderTop: `1px solid ${C.hairline}`,
          borderLeft: `1px solid ${C.hairline}`,
          borderRight: `1px solid ${C.hairline}`,
          borderRadius: '14px 14px 0 0',
          padding: '16px 24px',
          zIndex: 50,
        }}>
          {tongzhaoFilled >= 6 && allocationSlot && (
            <div style={{
              textAlign: 'center',
              marginBottom: 10,
              color: C.success,
              fontSize: 13,
              fontWeight: 600,
            }}>
              志愿已填满，共7个
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {/* Allocation slot */}
            <div style={{ flexShrink: 0 }}>
              <Text style={{ fontSize: 12, color: C.inkSubtle, display: 'block', marginBottom: 6 }}>
                分配生志愿
              </Text>
              {allocationSlot ? (
                <div style={{
                  width: 130,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: C.primaryBg,
                  border: `1px solid ${C.primary}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>
                      {allocationSlot.name.length > 6 ? allocationSlot.name.slice(0, 6) + '…' : allocationSlot.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.inkSubtle }}>{allocationSlot.tongZhao}分</div>
                  </div>
                  <CloseOutlined
                    style={{ color: C.inkSubtle, fontSize: 12 }}
                    onClick={removeAllocation}
                  />
                </div>
              ) : (
                <div style={{
                  width: 130,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: C.surface3,
                  border: `1px dashed ${C.hairlineStrong}`,
                  color: C.inkSubtle,
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                  空位
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: C.hairline, alignSelf: 'stretch', flexShrink: 0 }} />

            {/* Tongzhao slots */}
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: C.inkSubtle, display: 'block', marginBottom: 6 }}>
                平行统招志愿（按意愿从高到低）
              </Text>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {tongzhaoSlots.map((slot, idx) => (
                  <SlotItem
                    key={idx}
                    index={idx}
                    school={slot}
                    onRemove={() => removeTongzhao(idx)}
                    onSwap={(targetIdx: number) => swapTongzhao(idx, targetIdx)}
                    allSlots={tongzhaoSlots}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text style={{ fontSize: 12, color: '#9a8e7a' }}>{label}</Text>
      <div style={{ fontSize: 13, color: '#5a4e3a' }}>{value}</div>
    </div>
  )
}

function ScoreBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 8,
      background: '#f5f2ee',
      border: '1px solid rgba(0,0,0,.06)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 12, color: '#9a8e7a' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1201' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9a8e7a' }}>{sub}</div>}
    </div>
  )
}

function FeatureSection({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <Text strong style={{ color: '#5a4e3a', fontSize: 13 }}>{label}</Text>
      <div style={{ color: '#5a4e3a', fontSize: 13, marginTop: 2 }}>{content}</div>
    </div>
  )
}

function SlotItem({
  index, school, onRemove, onSwap, allSlots,
}: {
  index: number
  school: DBSchool | null
  onRemove: () => void
  onSwap: (targetIdx: number) => void
  allSlots: (DBSchool | null)[]
}) {
  const [swapping, setSwapping] = useState(false)

  if (school) {
    return (
      <div style={{
        width: 130,
        padding: '10px 12px',
        borderRadius: 10,
        background: '#f5f2ee',
        border: '1px solid rgba(0,0,0,.06)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1201' }}>
              {school.name.length > 6 ? school.name.slice(0, 6) + '…' : school.name}
            </div>
            <div style={{ fontSize: 11, color: '#9a8e7a' }}>{school.tongZhao}分</div>
          </div>
          <CloseOutlined style={{ color: '#9a8e7a', fontSize: 12, cursor: 'pointer' }} onClick={onRemove} />
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <Text style={{ fontSize: 10, color: '#E8784A' }}>统招{['①','②','③','④','⑤','⑥'][index]}</Text>
          {swapping ? (
            <div style={{ display: 'flex', gap: 2 }}>
              {allSlots.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { onSwap(i); setSwapping(false) }}
                  style={{
                    width: 16, height: 16, borderRadius: 3,
                    background: i === index ? '#E8784A' : '#ffffff',
                    border: '1px solid rgba(0,0,0,.06)',
                    cursor: i === index ? 'default' : 'pointer',
                    fontSize: 9, textAlign: 'center', lineHeight: '14px',
                    color: '#9a8e7a',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          ) : (
            <SwapOutlined
              style={{ fontSize: 10, color: '#9a8e7a', cursor: 'pointer', marginLeft: 4 }}
              onClick={() => setSwapping(!swapping)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: 130,
      padding: '10px 12px',
      borderRadius: 10,
      background: '#f5f2ee',
      border: '1px dashed rgba(0,0,0,.12)',
      color: '#9a8e7a',
      fontSize: 13,
      textAlign: 'center',
    }}>
      空位{['①','②','③','④','⑤','⑥'][index]}
    </div>
  )
}
