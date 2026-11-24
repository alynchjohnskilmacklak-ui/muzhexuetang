'use client'

import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Button, Col, Empty, Input, Row, Select, Tag, Typography } from 'antd'
import {
  CopyOutlined,
  ExperimentOutlined,
  FullscreenOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
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
import { BrandModal } from '@/components/Common/BrandModal'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'

const { Title, Text } = Typography

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface PhETSimulatorProps {
  role?: 'teacher' | 'parent' | 'main'
}

export function PhETSimulator({ role = 'main' }: PhETSimulatorProps = {}) {
  const isMobile = useIsMobile() ?? false
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<SimulationProvider | ''>('')
  const [searchText, setSearchText] = useState('')
  const [activeSim, setActiveSim] = useState<PhETSim | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 教师端获取当前梯队主题
  const { data: dashData } = useSWR(role === 'teacher' ? '/api/teacher/dashboard' : null, fetcher)
  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const theme = TIER_THEME[currentTier]

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

  const handleCopyLink = (event: React.MouseEvent, sim: PhETSim) => {
    event.stopPropagation()
    const url = getSourceUrl(sim)
    navigator.clipboard?.writeText(url)
    toast.success(`已复制「${sim.name}」仿真实验链接，可发送给学生或在备课课件中使用`)
  }

  const subjectIcons: Record<string, string> = {
    '物理': '⚡',
    '物理工具': '⚡',
    '化学': '⚗',
    '化学实验室': '⚗',
    '生物': '🧬',
    '数学': '∑',
    '数学工具': '∑',
    '地理': '🌍',
  }

  // 统计各学科实验数量
  const subjectCounts = useMemo(() => {
    const map: Record<string, number> = {}
    PHET_SIMS.forEach((item) => {
      map[item.subject] = (map[item.subject] || 0) + 1
    })
    return map
  }, [])

  return (
    <div className="phet-simulator-container">
      {/* 顶部 Hero 看板：教师端采用当前等级专属梯队主题，通用端保持清新雅致风格 */}
      {role === 'teacher' ? (
        <div
          className="phet-hero-teacher"
          style={{
            background: theme.heroBg,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          }}
        >
          <div className="hero-top-row">
            <div className="hero-title-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="hero-badge" style={{ background: theme.accent, color: '#1a1201' }}>
                  {theme.roleTag || theme.name}
                </span>
                <span className="hero-tag-glow">
                  <ExperimentOutlined /> 数字化探究教学
                </span>
              </div>
              <h2 className="hero-main-title">数学与科学互动仿真实验室</h2>
              <p className="hero-subtitle">
                无需下载安装 · 整合 PhET、GeoGebra、Desmos、Falstad 电路等专业引擎 · 课堂大屏演示与课后探究
              </p>
            </div>
          </div>

          {/* 4 大核心指标微卡 */}
          <div className="hero-stats-grid">
            <div className="stat-card">
              <div className="stat-label">全库仿真实验</div>
              <div className="stat-value">{PHET_SIMS.length} <span className="stat-unit">项</span></div>
              <div className="stat-desc">覆盖初中核心考点</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">涵盖核心学科</div>
              <div className="stat-value">5 <span className="stat-unit">大学科</span></div>
              <div className="stat-desc">物理 / 数学 / 化学 / 生物 / 地理</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">专业仿真引擎</div>
              <div className="stat-value">4 <span className="stat-unit">大来源</span></div>
              <div className="stat-desc">PhET · GeoGebra · Desmos · Falstad</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">课堂大屏投屏</div>
              <div className="stat-value">100% <span className="stat-unit">即开即用</span></div>
              <div className="stat-desc">适配希沃白板 / 手机 / 电脑</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="phet-hero-general">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <ExperimentOutlined style={{ fontSize: 24, color: '#E87545' }} />
            <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>
              数字化仿真教学实验室
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', lineHeight: 1.6 }}>
            整合 PhET、GeoGebra、Desmos、Falstad 与 ChemCollective · 交互式实验探究 · 帮助理解抽象数理概念
          </Text>
        </div>
      )}

      {/* 快捷学科 Chip 标签栏 */}
      <div className="subject-chip-scroll" role="tablist" aria-label="学科筛选">
        <button
          type="button"
          className={`subject-chip ${!selectedSubject ? 'active' : ''}`}
          onClick={() => setSelectedSubject('')}
          style={!selectedSubject ? { background: role === 'teacher' ? theme.primary : '#2563eb', borderColor: 'transparent', color: '#fff' } : {}}
        >
          全部实验 ({PHET_SIMS.length})
        </button>
        {SIM_SUBJECTS.map((sub) => {
          const isSel = selectedSubject === sub
          const count = subjectCounts[sub] || 0
          return (
            <button
              key={sub}
              type="button"
              className={`subject-chip ${isSel ? 'active' : ''}`}
              onClick={() => setSelectedSubject(isSel ? '' : sub)}
              style={isSel ? { background: role === 'teacher' ? theme.primary : '#2563eb', borderColor: 'transparent', color: '#fff' } : {}}
            >
              <span className="chip-icon">{subjectIcons[sub] || '🔬'}</span>
              <span>{sub}</span>
              <span className="chip-badge">{count}</span>
            </button>
          )
        })}
      </div>

      {/* 搜索与多维过滤条 */}
      <div className="phet-filter-card">
        <Row gutter={[12, 10]} align="middle">
          <Col xs={24} sm={10}>
            <Input
              placeholder="搜索仿真名称、力学/函数/电路或关键词"
              prefix={<SearchOutlined style={{ color: '#9a8e7a' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ borderRadius: 10, height: 38 }}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="适用年级"
              allowClear
              style={{ width: '100%', height: 38 }}
              value={selectedGrade || undefined}
              onChange={(val) => setSelectedGrade(val || '')}
              options={SIM_GRADES.map((g) => ({ label: g, value: g }))}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="引擎平台"
              allowClear
              style={{ width: '100%', height: 38 }}
              value={selectedProvider || undefined}
              onChange={(val) => setSelectedProvider(val || '')}
              options={SIM_PROVIDERS.map((p) => ({ label: getProviderLabel(p), value: p }))}
            />
          </Col>
          <Col xs={24} sm={4} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <span style={{ fontSize: 13, color: '#685d4d' }}>
              找到 <strong style={{ color: role === 'teacher' ? theme.primary : '#1a1201', fontSize: 15 }}>{filtered.length}</strong> 个仿真
            </span>
          </Col>
        </Row>
      </div>

      {/* 仿真列表 */}
      {filtered.length === 0 ? (
        <Empty
          style={{ padding: '48px 0' }}
          description="未找到符合条件的仿真实验，请尝试清除搜索词或切换学科"
        >
          <Button
            type="primary"
            onClick={() => {
              setSearchText('')
              setSelectedSubject('')
              setSelectedGrade('')
              setSelectedProvider('')
            }}
            style={role === 'teacher' ? { background: theme.primary, borderColor: theme.primary } : {}}
          >
            重置所有筛选
          </Button>
        </Empty>
      ) : (
        Object.entries(grouped).map(([subject, sims]) => {
          const colors = SUBJECT_SIM_COLORS[subject] || { bg: '#f5f5f5', text: '#555', border: '#e5e7eb' }
          return (
            <div key={subject} className="subject-group-section">
              <div className="subject-group-header">
                <div className="subject-icon-wrap" style={{ backgroundColor: colors.bg, color: colors.text }}>
                  {subjectIcons[subject] || '🔬'}
                </div>
                <h3 className="subject-group-title" style={{ color: '#1a1201' }}>
                  {subject}
                </h3>
                <span className="subject-group-badge" style={{ color: colors.text, background: colors.bg, border: `1px solid ${colors.border}` }}>
                  {sims.length} 个实验
                </span>
              </div>

              <Row gutter={[14, 14]}>
                {sims.map((sim) => (
                  <Col key={sim.id} xs={24} sm={12} md={8} lg={6}>
                    <div
                      className="sim-card"
                      onClick={() => openSim(sim)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* 平台与年级标签 */}
                      <div className="sim-card-tags">
                        <Tag
                          color={(sim.provider || 'phet') === 'phet' ? 'blue' : (sim.provider || 'phet') === 'desmos' ? 'green' : 'purple'}
                          style={{ fontSize: 11, padding: '1px 7px', margin: 0, borderRadius: 6, fontWeight: 600 }}
                        >
                          {getProviderLabel(sim.provider || 'phet')}
                        </Tag>
                        {sim.grade.map((g) => (
                          <Tag key={g} style={{ fontSize: 11, padding: '1px 6px', margin: 0, borderRadius: 6, background: '#f5f5f7', border: '1px solid #e5e5ea', color: '#555' }}>
                            {g}
                          </Tag>
                        ))}
                        {sim.hasChinese === false && (
                          <Tag color="orange" style={{ fontSize: 10, padding: '0 5px', margin: 0, borderRadius: 4 }}>
                            英文版
                          </Tag>
                        )}
                      </div>

                      {/* 实验名称与简介 */}
                      <div className="sim-card-title">{sim.name}</div>
                      <div className="sim-card-desc">{sim.description}</div>

                      {/* 关键词小标签 */}
                      <div className="sim-card-keywords">
                        {sim.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="sim-keyword-chip"
                            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* 底部交互操作 */}
                      <div className="sim-card-footer">
                        <button
                          type="button"
                          className="sim-share-btn"
                          title="复制实验链接"
                          onClick={(e) => handleCopyLink(e, sim)}
                        >
                          <ShareAltOutlined />
                          <span>分享</span>
                        </button>
                        <button
                          type="button"
                          className="sim-play-btn"
                          style={{ color: colors.text }}
                        >
                          <PlayCircleOutlined />
                          <span>开始演示</span>
                        </button>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          )
        })
      )}

      {/* 演示弹窗 */}
      {activeSim && (
        <BrandModal
          title={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(232, 117, 69, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#E87545',
                  fontSize: 16,
                }}
              >
                <ExperimentOutlined />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1201' }}>{activeSim.name}</span>
              <Tag color={(activeSim.provider || 'phet') === 'phet' ? 'blue' : (activeSim.provider || 'phet') === 'desmos' ? 'green' : 'purple'}>
                {getProviderLabel(activeSim.provider || 'phet')}
              </Tag>
              <Tag color={SUBJECT_SIM_COLORS[activeSim.subject]?.text || 'default'}>{activeSim.subject}</Tag>
              {activeSim.grade.map((g) => <Tag key={g} style={{ fontSize: 11 }}>{g}</Tag>)}
            </div>
          )}
          open={!!activeSim}
          onCancel={() => { setActiveSim(null); setSimLoading(false) }}
          footer={(
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {activeSim.externalOnly ? '该工具不支持内嵌，请点击外部打开。' : '课堂提示：可在希沃白板投屏中全屏演示'}
                {isMobile && (activeSim.provider || 'phet') !== 'phet' ? ' · 建议横屏操作' : ''}
              </Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  icon={<CopyOutlined />}
                  onClick={(e) => handleCopyLink(e, activeSim)}
                >
                  复制实验链接
                </Button>
                <Button
                  type="primary"
                  icon={<FullscreenOutlined />}
                  onClick={() => window.open(getSourceUrl(activeSim), '_blank', 'noopener,noreferrer')}
                  style={role === 'teacher' ? { background: theme.primary, borderColor: theme.primary } : {}}
                >
                  新窗口全屏投屏
                </Button>
                <Button onClick={() => { setActiveSim(null); setSimLoading(false) }}>关闭</Button>
              </div>
            </div>
          )}
          width={isMobile ? '100vw' : '92vw'}
          mobileFullHeight
          style={{ top: isMobile ? 0 : 20, maxWidth: 1180 }}
          styles={{ body: { padding: 0, backgroundColor: '#0b0f19' }, content: isMobile ? { borderRadius: 0, minHeight: '100vh' } : { borderRadius: 16, overflow: 'hidden' } }}
        >
          {simLoading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(10,15,25,.85)', backdropFilter: 'blur(4px)', color: '#fff', textAlign: 'center', padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ReloadOutlined spin />
              <span>仿真正在启动，请稍候（初次加载约 3-10 秒）...</span>
            </div>
          )}
          {activeSim.externalOnly ? (
            <div style={{ height: isMobile ? '70vh' : '75vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 24, textAlign: 'center', gap: 14 }}>
              <div style={{ fontSize: 16 }}>该实验工具需要独立运行环境</div>
              <Button
                type="primary"
                size="large"
                icon={<FullscreenOutlined />}
                onClick={() => window.open(getSourceUrl(activeSim), '_blank', 'noopener,noreferrer')}
                style={role === 'teacher' ? { background: theme.primary, borderColor: theme.primary } : {}}
              >
                在新标签页中打开
              </Button>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={getResourceUrl(activeSim)}
              style={{ width: '100%', height: isMobile ? '72vh' : '76vh', border: 'none', display: 'block', backgroundColor: '#fff' }}
              title={activeSim.name}
              allowFullScreen
              allow="fullscreen"
              onLoad={() => setSimLoading(false)}
              onError={() => setSimLoading(false)}
            />
          )}
          <div style={{ padding: '10px 18px', backgroundColor: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)' }}>{activeSim.description}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activeSim.tags.map((tag) => (
                <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, backgroundColor: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.85)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </BrandModal>
      )}

      <style jsx>{`
        .phet-simulator-container {
          width: 100%;
          max-width: 100%;
        }

        .phet-hero-teacher {
          padding: 24px 24px 20px;
          border-radius: 18px;
          color: #ffffff;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }

        .hero-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .hero-badge {
          display: inline-block;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          letter-spacing: 0.3px;
        }

        .hero-tag-glow {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.9);
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(4px);
        }

        .hero-main-title {
          margin: 10px 0 6px;
          color: #ffffff;
          font-size: clamp(20px, 4vw, 25px);
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .hero-subtitle {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 13px;
          line-height: 1.6;
          max-width: 800px;
        }

        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }

        .stat-card {
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .stat-label {
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 2px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
        }

        .stat-unit {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.85;
        }

        .stat-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 3px;
        }

        .phet-hero-general {
          margin-bottom: 20px;
          padding: 14px 18px;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .subject-chip-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          margin-bottom: 14px;
          scrollbar-width: none;
        }

        .subject-chip-scroll::-webkit-scrollbar {
          display: none;
        }

        .subject-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #4a3e2e;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .subject-chip:hover {
          border-color: rgba(0, 0, 0, 0.2);
          transform: translateY(-1px);
        }

        .chip-icon {
          font-size: 14px;
        }

        .chip-badge {
          display: inline-block;
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.05);
        }

        .subject-chip.active .chip-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .phet-filter-card {
          padding: 12px 16px;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          margin-bottom: 22px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .subject-group-section {
          margin-bottom: 30px;
        }

        .subject-group-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1.5px solid rgba(0, 0, 0, 0.06);
        }

        .subject-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
        }

        .subject-group-title {
          margin: 0;
          font-size: 16px;
          font-weight: 750;
        }

        .subject-group-badge {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 600;
        }

        .sim-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 15px 16px;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.025);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .sim-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          border-color: rgba(0, 0, 0, 0.14);
        }

        .sim-card-tags {
          display: flex;
          gap: 5px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .sim-card-title {
          font-size: 14.5px;
          font-weight: 700;
          color: #1a1201;
          line-height: 1.4;
          margin-bottom: 6px;
        }

        .sim-card-desc {
          font-size: 12px;
          color: #736b5e;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 12px;
          flex: 1;
        }

        .sim-card-keywords {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .sim-keyword-chip {
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 6px;
          font-weight: 500;
        }

        .sim-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        .sim-share-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          background: transparent;
          color: #8c8273;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .sim-share-btn:hover {
          background: #f5f5f7;
          color: #1a1201;
        }

        .sim-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 650;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .sim-play-btn:hover {
          opacity: 0.85;
          transform: scale(1.03);
        }

        @media (max-width: 768px) {
          .hero-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .phet-hero-teacher {
            padding: 18px 16px 16px;
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
  )
}
