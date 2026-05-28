'use client'

import { useState } from 'react'
import {
  Alert, Button, Card, Col, Form, InputNumber, Row, Select,
  Statistic, Tag, Typography,
} from 'antd'
import {
  ArrowLeftOutlined, InfoCircleOutlined, SearchOutlined, TrophyOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import {
  CONTROL_LINES_2025,
  getMarketPercentile,
  getMarketRank,
  getRecommendations,
  TOTAL_EXAMINEES_2025,
  XINLE_ALLOCATION,
  type SchoolRecommendation,
} from '@/data/volunteer-2025'

const { Title, Text } = Typography

const XINLE_SCHOOLS = Object.keys(XINLE_ALLOCATION).filter((school) => school !== '超击武校')

const CATEGORY_CONFIG = {
  分配生机会: { color: '#5e6ad2', bg: 'rgba(94,106,210,.08)', label: '⭐ 分配生机会', border: 'rgba(94,106,210,.25)' },
  稳妥: { color: '#27a644', bg: 'rgba(39,166,68,.06)', label: '✅ 稳妥', border: 'rgba(39,166,68,.2)' },
  冲刺: { color: '#E87545', bg: 'rgba(232,117,69,.06)', label: '冲刺', border: 'rgba(232,117,69,.2)' },
  保底: { color: '#9a8e7a', bg: 'rgba(154,142,122,.06)', label: '保底', border: 'rgba(154,142,122,.2)' },
} as const

export default function VolunteerSimPage() {
  const router = useRouter()
  const [form] = Form.useForm()
  const [result, setResult] = useState<{
    score: number
    schoolName: string
    schoolRank: number
    marketRank: number
    percentile: string
    recommendations: SchoolRecommendation[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSimulate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 300))
      const { score, schoolName, schoolRank } = values
      const marketRank = getMarketRank(score)
      const percentile = getMarketPercentile(score)
      const recommendations = getRecommendations(score, schoolName, schoolRank)
      setResult({ score, schoolName, schoolRank, marketRank, percentile, recommendations })
      setTimeout(() => {
        document.getElementById('sim-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    } catch {
      // Form validation errors are displayed inline.
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
          style={{ color: '#8a8f98' }}
        />
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>志愿模拟填报</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            基于2025年石家庄中考数据 · 仅限新乐市考生 · 结果仅供参考
          </Text>
        </div>
      </div>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 20, borderRadius: 10 }}
        message="重要提示"
        description="本模拟基于2025年分数线（满分800分）和新乐籍分配生名额数据。每年分数线存在波动，请以当年官方公布数据为准，建议结合班主任意见综合判断。"
      />

      <Card
        title={<span style={{ fontSize: 15 }}><SearchOutlined style={{ marginRight: 8, color: '#E87545' }} />输入学生信息</span>}
        style={{ marginBottom: 20, borderRadius: 12 }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="score"
                label={<span style={{ fontWeight: 500 }}>中考总分 <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>（满分800分）</Text></span>}
                rules={[
                  { required: true, message: '请输入分数' },
                  { type: 'number', min: 0, max: 800, message: '分数范围 0 - 800' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="例：678" min={0} max={800} size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                name="schoolName"
                label={<span style={{ fontWeight: 500 }}>就读初中 <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>（新乐市范围）</Text></span>}
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
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="schoolRank"
                label={<span style={{ fontWeight: 500 }}>本校排名 <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>（第几名）</Text></span>}
                rules={[
                  { required: true, message: '请输入排名' },
                  { type: 'number', min: 1, message: '至少第1名' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="例：5" min={1} size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={handleSimulate}
            loading={loading}
            style={{ background: '#E87545', borderColor: '#E87545', minWidth: 160 }}
          >
            开始模拟
          </Button>
          {result && (
            <Button
              size="large"
              style={{ marginLeft: 12 }}
              onClick={() => { form.resetFields(); setResult(null) }}
            >
              重新填写
            </Button>
          )}
        </Form>
      </Card>

      {result && (
        <div id="sim-result">
          <Card
            title={<span style={{ fontSize: 15 }}><TrophyOutlined style={{ marginRight: 8, color: '#E87545' }} />成绩分析</span>}
            style={{ marginBottom: 16, borderRadius: 12 }}
          >
            <Row gutter={[20, 16]}>
              <Col xs={12} sm={6}>
                <Statistic title="中考总分" value={result.score} suffix="分" valueStyle={{ color: '#E87545', fontSize: 30 }} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="全市累计排名" value={result.marketRank} suffix="名以内" valueStyle={{ fontSize: 26 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  基于17县区约 {TOTAL_EXAMINEES_2025.toLocaleString()} 名考生
                </Text>
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="超越全市考生"
                  value={parseFloat((100 - parseFloat(result.percentile)).toFixed(2))}
                  suffix="%"
                  valueStyle={{ color: '#27a644', fontSize: 26 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="新乐控制线" value={CONTROL_LINES_2025['新乐市']} suffix="分" valueStyle={{ fontSize: 26 }} />
                <Tag color={result.score >= CONTROL_LINES_2025['新乐市'] ? 'success' : 'error'} style={{ marginTop: 4 }}>
                  {result.score >= CONTROL_LINES_2025['新乐市'] ? '✅ 已过控制线' : '❌ 未过控制线'}
                </Tag>
              </Col>
            </Row>

            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: 'rgba(232,117,69,.06)',
              border: '1px solid rgba(232,117,69,.15)',
            }}>
              <Text style={{ fontSize: 13 }}>
                <Text strong>{result.schoolName}</Text>
                &nbsp;·&nbsp; 本校第 <Text strong style={{ color: '#E87545' }}>{result.schoolRank}</Text> 名
                &nbsp;·&nbsp; 全市约前 <Text strong>{result.marketRank}</Text> 名
                &nbsp;·&nbsp; 超越 <Text strong style={{ color: '#27a644' }}>
                  {(100 - parseFloat(result.percentile)).toFixed(1)}%
                </Text> 的考生
              </Text>
            </div>
          </Card>

          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 15 }}>志愿推荐结果</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(Object.entries(CATEGORY_CONFIG) as [SchoolRecommendation['category'], typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([cat, cfg]) => {
                    const count = result.recommendations.filter((rec) => rec.category === cat).length
                    if (count === 0) return null
                    return (
                      <Tag key={cat} style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 12 }}>
                        {cfg.label}（{count}所）
                      </Tag>
                    )
                  })}
                </div>
              </div>
            }
            style={{ borderRadius: 12 }}
          >
            {result.recommendations.length === 0 ? (
              <Alert
                type="warning"
                showIcon
                message="暂无匹配学校"
                description="根据当前分数和排名，未找到合适的推荐学校。请确认输入信息是否正确，或咨询班主任获取专业建议。"
              />
            ) : (
              <>
                {(['分配生机会', '稳妥', '冲刺', '保底'] as const).map((cat) => {
                  const schools = result.recommendations.filter((rec) => rec.category === cat)
                  if (schools.length === 0) return null
                  const cfg = CATEGORY_CONFIG[cat]
                  return (
                    <div key={cat} style={{ marginBottom: 24 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                        paddingBottom: 6,
                        borderBottom: `2px solid ${cfg.color}`,
                      }}>
                        <Tag style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 12, margin: 0 }}>
                          {cfg.label}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {cat === '分配生机会' && '有分配生名额且分数达标 · 建议优先考虑'}
                          {cat === '稳妥' && '分数明显高于统招线 · 录取把握大'}
                          {cat === '冲刺' && '分数接近统招线 · 有希望但存在风险'}
                          {cat === '保底' && '分数远超统招线 · 可作为保底选择'}
                        </Text>
                      </div>

                      {schools.map((rec) => (
                        <div key={rec.school.id} style={{
                          padding: '14px 16px',
                          borderRadius: 10,
                          marginBottom: 8,
                          backgroundColor: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text strong style={{ fontSize: 15 }}>{rec.school.name}</Text>
                              <Tag style={{ fontSize: 11, margin: 0 }}>{rec.school.type}</Tag>
                              <Tag style={{ fontSize: 11, margin: 0 }} color="default">{rec.school.location}</Tag>
                            </div>
                            <div style={{ textAlign: 'right', lineHeight: 1.8 }}>
                              {rec.school.yiTong && (
                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                  一统线：<Text strong>{rec.school.yiTong}</Text>分
                                </Text>
                              )}
                              <Text style={{ fontSize: 13 }}>
                                统招线：
                                <Text strong style={{ color: rec.gap >= 0 ? '#27a644' : '#e03e2d', fontSize: 15 }}>
                                  {rec.school.tongZhao}
                                </Text>
                                <Text style={{ fontSize: 12, marginLeft: 4 }}>
                                  {rec.gap >= 0
                                    ? <span style={{ color: '#27a644' }}>（高出 {rec.gap} 分）</span>
                                    : <span style={{ color: '#e03e2d' }}>（差 {Math.abs(rec.gap)} 分）</span>
                                  }
                                </Text>
                              </Text>
                            </div>
                          </div>

                          <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.7 }}>
                            {rec.note}
                          </Text>

                          {rec.hasAllocationChance && (
                            <div style={{
                              marginTop: 10,
                              padding: '8px 12px',
                              borderRadius: 8,
                              backgroundColor: 'rgba(94,106,210,.1)',
                              border: '1px solid rgba(94,106,210,.25)',
                            }}>
                              <Text style={{ fontSize: 13, color: '#5e6ad2' }}>
                                ⭐ 分配生通道：
                                本校共 <Text strong>{rec.allocationQuota}</Text> 个名额
                                · 分配线 <Text strong>{rec.allocationMinScore}</Text> 分
                                · 你的分数和排名均达标，<Text strong>建议优先选择此通道</Text>
                              </Text>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}

                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  style={{ marginTop: 8, borderRadius: 8 }}
                  message="志愿填报建议"
                  description={
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 2 }}>
                      <li>有分配生机会的学校优先考虑，录取确定性远高于统招</li>
                      <li>建议按「冲刺→稳妥→保底」的梯次填报 2-3 所学校</li>
                      <li>每年分数线有波动，本结果基于 2025 年数据，仅供参考</li>
                      <li>最终决策建议结合班主任和升学老师的专业意见</li>
                    </ul>
                  }
                />
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
