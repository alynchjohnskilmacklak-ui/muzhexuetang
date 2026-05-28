'use client'

import { useRef, useState } from 'react'
import { Button, Card, Col, Empty, Input, Modal, Row, Select, Tag, Typography } from 'antd'
import { ExperimentOutlined, FullscreenOutlined, PlayCircleOutlined, SearchOutlined } from '@ant-design/icons'
import {
  PHET_SIMS,
  SIM_GRADES,
  SIM_PROVIDERS,
  SIM_SUBJECTS,
  SUBJECT_SIM_COLORS,
  getProviderLabel,
  getResourceUrl,
  getSourceUrl,
  type PhETSim,
  type SimulationProvider,
} from '@/data/phet-sims'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

export function PhETSimulator() {
  const isMobile = useIsMobile()
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<SimulationProvider | ''>('')
  const [searchText, setSearchText] = useState('')
  const [activeSim, setActiveSim] = useState<PhETSim | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const filtered = PHET_SIMS.filter((sim) => {
    const keyword = searchText.trim()
    const matchSubject = !selectedSubject || sim.subject === selectedSubject
    const matchGrade = !selectedGrade || sim.grade.includes(selectedGrade)
    const matchProvider = !selectedProvider || (sim.provider || 'phet') === selectedProvider
    const matchSearch = !keyword || sim.name.includes(keyword) || sim.description.includes(keyword) || sim.tags.some((tag) => tag.includes(keyword))
    return matchSubject && matchGrade && matchProvider && matchSearch
  })

  const grouped = filtered.reduce<Record<string, PhETSim[]>>((acc, sim) => {
    const groupKey = sim.category || sim.subject
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(sim)
    return acc
  }, {})

  const openSim = (sim: PhETSim) => {
    setActiveSim(sim)
    setSimLoading(!sim.externalOnly)
  }

  const subjectIcons: Record<string, string> = {
    '物理': '⚡',
    '化学': '⚗',
    '生物': '🧬',
    '数学': '∑',
    '数学工具': '∑',
    '地理': '🌍',
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ExperimentOutlined style={{ fontSize: 22, color: '#E87545' }} />
          <Title level={4} style={{ margin: 0, fontSize: isMobile ? 17 : 20 }}>数字化仿真教学</Title>
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>基于 PhET 互动仿真 · 美国科罗拉多大学 · 免费开放使用</Text>
      </div>

      <div style={{
        padding: '14px 18px',
        borderRadius: 12,
        marginBottom: 20,
        background: 'linear-gradient(135deg, rgba(24,144,255,.08) 0%, rgba(114,46,209,.06) 100%)',
        border: '1px solid rgba(24,144,255,.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 2 }}>交互式科学仿真实验室</Text>
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.7 }}>
            无需下载安装，点击即可运行。涵盖 PhET 科学仿真、Desmos 图形计算器和 GeoGebra 几何工具，帮助学生通过互动实验和数学工具理解抽象概念。
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[`共 ${PHET_SIMS.length} 个仿真`, '中文界面', '免费使用', '手机适配'].map((item) => (
            <Tag key={item} style={{ backgroundColor: 'rgba(24,144,255,.1)', color: '#1890ff', border: '1px solid rgba(24,144,255,.2)', fontSize: 12 }}>
              {item}
            </Tag>
          ))}
        </div>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '14px 18px' } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="搜索仿真名称或关键词"
              prefix={<SearchOutlined style={{ color: '#9a8e7a' }} />}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="全部学科"
              allowClear
              style={{ width: '100%' }}
              value={selectedSubject || undefined}
              onChange={(value) => setSelectedSubject(value || '')}
              options={SIM_SUBJECTS.map((subject) => ({ label: `${subjectIcons[subject]} ${subject}`, value: subject }))}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="全部年级"
              allowClear
              style={{ width: '100%' }}
              value={selectedGrade || undefined}
              onChange={(value) => setSelectedGrade(value || '')}
              options={SIM_GRADES.map((grade) => ({ label: grade, value: grade }))}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="全部来源"
              allowClear
              style={{ width: '100%' }}
              value={selectedProvider || undefined}
              onChange={(value) => setSelectedProvider(value || '')}
              options={SIM_PROVIDERS.map((provider) => ({ label: getProviderLabel(provider), value: provider }))}
            />
          </Col>
          <Col xs={12} sm={4}>
            <Text type="secondary" style={{ fontSize: 13 }}>共 <Text strong>{filtered.length}</Text> 个</Text>
          </Col>
        </Row>
      </Card>

      {filtered.length === 0 ? (
        <Empty description="未找到匹配的仿真，请尝试其他搜索条件" />
      ) : (
        Object.entries(grouped).map(([subject, sims]) => {
          const colors = SUBJECT_SIM_COLORS[subject] || { bg: '#f5f5f5', text: '#666', border: '#d9d9d9' }
          return (
            <div key={subject} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${colors.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {subjectIcons[subject]}
                </div>
                <Title level={5} style={{ margin: 0, color: colors.text, fontSize: 15 }}>{subject}</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>{sims.length} 个仿真</Text>
              </div>

              <Row gutter={[12, 12]}>
                {sims.map((sim) => (
                  <Col key={sim.id} xs={24} sm={12} md={8} lg={6}>
                    <Card
                      hoverable
                      onClick={() => openSim(sim)}
                      style={{ borderRadius: 12, border: `1px solid ${colors.border}`, cursor: 'pointer', height: '100%' }}
                      styles={{ body: { padding: '14px 16px' } }}
                    >
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                        <Tag color={(sim.provider || 'phet') === 'phet' ? 'blue' : (sim.provider || 'phet') === 'desmos' ? 'green' : 'purple'} style={{ fontSize: 10, padding: '0 5px', margin: 0, lineHeight: '16px' }}>
                          {getProviderLabel(sim.provider || 'phet')}
                        </Tag>
                        {sim.grade.map((grade) => (
                          <Tag key={grade} style={{ fontSize: 10, padding: '0 5px', margin: 0, lineHeight: '16px' }}>{grade}</Tag>
                        ))}
                        {sim.hasChinese === false && <Tag color="orange" style={{ fontSize: 10, padding: '0 5px', margin: 0, lineHeight: '16px' }}>英文</Tag>}
                      </div>
                      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 6, lineHeight: 1.4 }}>{sim.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6, display: 'block', marginBottom: 10 }}>{sim.description}</Text>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {sim.tags.slice(0, 3).map((tag) => (
                          <span key={tag} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.06)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: colors.text, fontWeight: 500 }}>
                          <PlayCircleOutlined style={{ marginRight: 4 }} />
                          {(sim.provider || 'phet') === 'phet' ? '开始仿真' : '开始使用'}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )
        })
      )}

      <Card style={{ borderRadius: 12, border: '1px dashed #d9d9d9', background: '#fafafa', marginTop: 8 }}>
        <Text strong>知识卡片功能即将开放</Text>
        <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
          老师可上传知识点卡片，学生可像背单词一样复习。该模块后续自研，不在本次建立数据库。
        </Text>
      </Card>

      {activeSim && (
        <Modal
          title={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ExperimentOutlined style={{ color: '#E87545' }} />
              <span>{activeSim.name}</span>
              <Tag color={(activeSim.provider || 'phet') === 'phet' ? 'blue' : (activeSim.provider || 'phet') === 'desmos' ? 'green' : 'purple'}>
                {getProviderLabel(activeSim.provider || 'phet')}
              </Tag>
              <Tag color={SUBJECT_SIM_COLORS[activeSim.subject]?.text || 'default'}>{activeSim.subject}</Tag>
              {activeSim.grade.map((grade) => <Tag key={grade} style={{ fontSize: 11 }}>{grade}</Tag>)}
            </div>
          )}
          open={!!activeSim}
          onCancel={() => { setActiveSim(null); setSimLoading(false) }}
          footer={(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {activeSim.externalOnly ? '该工具可能不支持在当前页面内嵌，请点击外部打开。' : '无法显示？请点击外部打开。'}
                {isMobile && (activeSim.provider || 'phet') !== 'phet' ? ' 手机端建议横屏使用数学工具，体验更佳。' : ''}
              </Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button icon={<FullscreenOutlined />} onClick={() => window.open(getSourceUrl(activeSim), '_blank', 'noopener,noreferrer')}>外部打开</Button>
                <Button onClick={() => { setActiveSim(null); setSimLoading(false) }}>关闭</Button>
              </div>
            </div>
          )}
          width={isMobile ? '100vw' : '90vw'}
          style={{ top: isMobile ? 0 : 20, maxWidth: 1100 }}
          styles={{ body: { padding: 0, backgroundColor: '#000' }, content: isMobile ? { borderRadius: 0, minHeight: '100vh' } : {} }}
        >
          {simLoading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,.7)', color: '#fff', textAlign: 'center', padding: '8px', fontSize: 13 }}>
              仿真加载中，请稍候（首次加载约 5-15 秒）...
            </div>
          )}
          {activeSim.externalOnly ? (
            <div style={{ height: isMobile ? '70vh' : '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 24, textAlign: 'center' }}>
              该工具可能不支持在当前页面内嵌，请点击下方按钮在新窗口打开。
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={getResourceUrl(activeSim)}
              style={{ width: '100%', height: isMobile ? '70vh' : '75vh', border: 'none', display: 'block', backgroundColor: '#fff', borderRadius: isMobile ? 0 : 12 }}
              title={activeSim.name}
              allowFullScreen
              allow="fullscreen"
              onLoad={() => setSimLoading(false)}
              onError={() => setSimLoading(false)}
            />
          )}
          <div style={{ padding: '8px 16px', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{activeSim.description}</Text>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activeSim.tags.map((tag) => (
                <span key={tag} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)' }}>{tag}</span>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
