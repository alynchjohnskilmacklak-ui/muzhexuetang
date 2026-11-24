'use client'

import React, { useCallback, useState, useMemo, useEffect } from 'react'
import {
  BulbFilled,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CompassOutlined,
  FireOutlined,
  LeftOutlined,
  RightOutlined,
  SwapOutlined,
  ToolFilled,
} from '@ant-design/icons'
import { message } from 'antd'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'
import { ZHONGKAO_GRAMMAR, type GrammarItem } from '@/data/english-grammar/zhongkao-grammar'

interface GrammarHubProps {
  onBack: () => void
  studentName?: string
  studentId?: string
}

type GrammarCategoryKey = 'TENSE' | 'CLAUSE' | 'PITFALL'

interface GrammarSectionMeta {
  key: GrammarCategoryKey
  name: string
  subtitle: string
  ruleTip: string
  color: string
  bg: string
  gradient: string
  badgeBg: string
  items: GrammarItem[]
}

export function GrammarHub({ onBack, studentName = '学员', studentId }: GrammarHubProps) {
  // 当前视图模式：'SELECTION' 专题选择大厅 | 'DECK' 翻页精学特训卡模式
  const [viewMode, setViewMode] = useState<'SELECTION' | 'DECK'>('SELECTION')
  const [currentSectionKey, setCurrentSectionKey] = useState<GrammarCategoryKey>('TENSE')

  // 翻页背诵/精学卡状态
  const [cardIndex, setCardIndex] = useState<number>(0)
  const [isFlipped, setIsFlipped] = useState<boolean>(false)

  // 答题记录
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({})

  // 快速速查列表的过滤
  const [quickTab, setQuickTab] = useState<GrammarCategoryKey | 'ALL'>('ALL')
  const [searchKeyword, setSearchKeyword] = useState<string>('')

  // 本地掌握记录持久化
  const storageKey = useMemo(() => `muzhe_grammar_mastered_${studentId || 'default'}`, [studentId])
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set())

  const handleMobileBack = useCallback(() => {
    if (viewMode === 'DECK') {
      setViewMode('SELECTION')
      return true
    }
    onBack()
    return true
  }, [onBack, viewMode])

  useMobileBackHandler(handleMobileBack, 10)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setMasteredIds(new Set(JSON.parse(raw)))
    } catch {
      // ignore
    }
  }, [storageKey])

  const toggleMastered = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setMasteredIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  // 专题元数据
  const sections: GrammarSectionMeta[] = useMemo(() => [
    {
      key: 'TENSE',
      name: '动词时态、语态与形式',
      subtitle: '六种时态 / 被动语态 / 情态动词 / 非谓语',
      ruleTip: '先看时间和语境确定时态，再核对主语与谓语形式；被动语态要确认主语是动作的承受者。',
      color: '#14574D',
      bg: '#EAF5F0',
      gradient: 'linear-gradient(135deg, #14574D 0%, #1E7E6F 100%)',
      badgeBg: 'rgba(20, 87, 77, 0.1)',
      items: ZHONGKAO_GRAMMAR.filter((g) => g.category === 'TENSE'),
    },
    {
      key: 'CLAUSE',
      name: '句型与复合句',
      subtitle: '基本句型 / 疑问句 / 并列句 / 三类从句',
      ruleTip: '先找句子主干，再看连词连接的成分；宾语从句使用陈述语序，时间和条件从句要结合语境判断时态。',
      color: '#2B4E8C',
      bg: '#EBF1FB',
      gradient: 'linear-gradient(135deg, #2B4E8C 0%, #416FB8 100%)',
      badgeBg: 'rgba(43, 78, 140, 0.1)',
      items: ZHONGKAO_GRAMMAR.filter((g) => g.category === 'CLAUSE'),
    },
    {
      key: 'PITFALL',
      name: '词法与句法',
      subtitle: '名词 / 代词 / 冠词 / 比较 / 介词 / 构词',
      ruleTip: '先判断空格在句中的作用，再核对词性、词形、固定搭配和主谓一致；不要只凭词尾猜答案。',
      color: '#C05B22',
      bg: '#FBEAE2',
      gradient: 'linear-gradient(135deg, #C05B22 0%, #E0783D 100%)',
      badgeBg: 'rgba(192, 91, 34, 0.1)',
      items: ZHONGKAO_GRAMMAR.filter((g) => g.category === 'PITFALL'),
    },
  ], [])

  // 当前专题考点集合
  const currentSection = useMemo(() => {
    return sections.find((s) => s.key === currentSectionKey) || sections[0]
  }, [sections, currentSectionKey])

  const currentDeckItems = currentSection.items
  const currentCardItem = currentDeckItems[cardIndex] || currentDeckItems[0]

  // 进入指定专题翻页精学
  const startDeckTraining = (key: GrammarCategoryKey) => {
    setCurrentSectionKey(key)
    setCardIndex(0)
    setIsFlipped(false)
    setViewMode('DECK')
  }

  // 翻页操作：掌握了
  const handleRemember = () => {
    if (!masteredIds.has(currentCardItem.id)) {
      toggleMastered(currentCardItem.id)
    }
    if (cardIndex + 1 < currentDeckItems.length) {
      setCardIndex((prev) => prev + 1)
      setIsFlipped(false)
    } else {
      message.success(`🎉 恭喜！您已完成【${currentSection.name}】的精学特训！`)
      setViewMode('SELECTION')
    }
  }

  // 翻页操作：需巩固
  const handleForgot = () => {
    if (masteredIds.has(currentCardItem.id)) {
      toggleMastered(currentCardItem.id)
    }
    message.warning('已标记为待巩固，翻转卡片查看知识点讲解与易错辨析。')
    setIsFlipped(true)
  }

  // 上下一个切换
  const handlePrevCard = () => {
    if (cardIndex > 0) {
      setCardIndex((prev) => prev - 1)
      setIsFlipped(false)
    }
  }
  const handleNextCard = () => {
    if (cardIndex + 1 < currentDeckItems.length) {
      setCardIndex((prev) => prev + 1)
      setIsFlipped(false)
    }
  }

  // 题型微练作答
  const handleSelectAnswer = (questionId: string, optIdx: number) => {
    if (userAnswers[questionId] !== undefined) return
    setUserAnswers((prev) => ({ ...prev, [questionId]: optIdx }))
    const isCorrect = optIdx === currentCardItem.testQuestion?.answer
    if (isCorrect) {
      message.success('回答正确！这组题型练习已完成。')
      if (!masteredIds.has(currentCardItem.id)) {
        toggleMastered(currentCardItem.id)
      }
    } else {
      message.error('回答错误，请查看辨析和解析。')
    }
  }

  // 统计
  const totalCount = ZHONGKAO_GRAMMAR.length
  const totalMasteredCount = ZHONGKAO_GRAMMAR.filter((g) => masteredIds.has(g.id)).length
  const masterPercent = Math.round((totalMasteredCount / totalCount) * 100)

  // 速查列表筛选
  const filteredItems = useMemo(() => {
    return ZHONGKAO_GRAMMAR.filter((item) => {
      const matchTab = quickTab === 'ALL' || item.category === quickTab
      const matchKeyword =
        !searchKeyword.trim() ||
        item.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.formula.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.summary.includes(searchKeyword)
      return matchTab && matchKeyword
    })
  }, [quickTab, searchKeyword])

  // ==================== 视图 1：专题选择大厅 (SELECTION) ====================
  if (viewMode === 'SELECTION') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 14px 40px', color: '#17352F' }}>
        {/* 桌面端显示层级返回；手机端统一使用应用顶栏 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <button type="button" className="mobile-shell-back" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', border: 0, background: 'transparent', color: '#14574D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <LeftOutlined /> 返回英语特训
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11.5, color: '#7A694F' }}>学员：</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#17352F', background: '#F5FAF7', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(20,87,77,0.12)' }}>
              {studentName}
            </span>
          </div>
        </div>

        {/* ===== 彻底重新设计的 Hero 卡片：高对比度、纯白高光大字、奢华深墨绿金色系 ===== */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0B2923 0%, #124A40 50%, #1A6B5D 100%)',
            borderRadius: 22,
            padding: '20px 22px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(11, 41, 35, 0.35)',
            marginBottom: 20,
            border: '1px solid rgba(243, 217, 143, 0.25)',
          }}
        >
          {/* 装饰微光 */}
          <div style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(243, 217, 143, 0.12)', pointerEvents: 'none', filter: 'blur(10px)' }} />
          <div style={{ position: 'absolute', left: 20, bottom: -50, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <ToolFilled style={{ color: '#F3D98F', fontSize: 15 }} />
              <span style={{ fontSize: 11.5, letterSpacing: 2, color: '#F3D98F', fontWeight: 800 }}>
                GRAMMAR MASTERY · 中考核心语法
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 900,
                color: '#FFFFFF',
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
                letterSpacing: 0.5,
              }}
            >
              已掌握 {totalMasteredCount} / {totalCount} 个核心语法考点
            </h2>
          </div>

          {/* 进度条与指标 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 7, borderRadius: 999, background: 'rgba(255, 255, 255, 0.18)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${masterPercent}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #F3D98F 0%, #FBBF24 100%)',
                  boxShadow: '0 0 10px rgba(243, 217, 143, 0.7)',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
              <span>掌握率 <strong style={{ color: '#F3D98F' }}>{masterPercent}%</strong></span>
              <span>动词 · 句型与从句 · 词法与句法</span>
            </div>
            <div style={{ marginTop: 7, fontSize: 11, lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.76)' }}>
              依据课程标准语法项目，结合 2024 版教材范围整理；练习为原创题型微练。
            </div>
          </div>
        </div>

        {/* ===== 专题选择板块：先选要精学的语法专题 ===== */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingInline: 2 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#17352F' }}>
              选择语法专题
            </h3>
            <span style={{ fontSize: 11.5, color: '#8C7E6A' }}>结构讲解 · 例句辨析 · 题型微练</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sections.map((section) => {
              const secMastered = section.items.filter((item) => masteredIds.has(item.id)).length
              const secTotal = section.items.length
              const secPercent = secTotal > 0 ? Math.round((secMastered / secTotal) * 100) : 0

              return (
                <div
                  key={section.key}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 18,
                    padding: '16px 18px',
                    border: '1.5px solid rgba(20, 87, 77, 0.12)',
                    boxShadow: '0 3px 12px rgba(20, 87, 77, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: section.badgeBg,
                            color: section.color,
                          }}
                        >
                          专题 {section.key === 'TENSE' ? '一' : section.key === 'CLAUSE' ? '二' : '三'}
                        </span>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F' }}>
                          {section.name}
                        </h4>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7A694F' }}>
                        {section.subtitle} · 共 <strong>{secTotal}</strong> 个核心考点
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startDeckTraining(section.key)}
                      style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: section.gradient,
                        color: '#FFFFFF',
                        border: 0,
                        borderRadius: 9999,
                        padding: '8px 16px',
                        fontSize: 12.5,
                        fontWeight: 800,
                        boxShadow: `0 4px 12px ${section.color}33`,
                        flexShrink: 0,
                      }}
                    >
                      <span>开始翻页精学</span>
                      <RightOutlined style={{ fontSize: 10 }} />
                    </button>
                  </div>

                  {/* 学习提示 */}
                  <div style={{ background: '#FAF8F4', borderRadius: 10, padding: '7px 11px', fontSize: 11.5, color: '#6A5C47', lineHeight: 1.5 }}>
                    {section.ruleTip}
                  </div>

                  {/* 进度条 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 999, background: '#F0ECE4', overflow: 'hidden' }}>
                      <div style={{ width: `${secPercent}%`, height: '100%', borderRadius: 999, background: section.color, transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: section.color, flexShrink: 0 }}>
                      已掌握 {secMastered} / {secTotal} ({secPercent}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== 全景语法速查清单（带搜索 + 掌握标记） ===== */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingInline: 2 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F' }}>
              语法考点速查
            </h3>
            <span style={{ fontSize: 11.5, color: '#8C7E6A' }}>{totalCount} 个考点 · 搜索查找</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索语法标题、规则结构或考点"
              style={{
                width: '100%',
                borderRadius: 14,
                border: '1px solid rgba(20,87,77,0.12)',
                padding: '9px 12px',
                fontSize: 12.5,
                background: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>

          <div role="group" aria-label="按语法类别筛选" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
            {[
              { key: 'ALL' as const, label: '全部考点', count: totalCount },
              ...sections.map((section) => ({ key: section.key, label: section.name, count: section.items.length })),
            ].map((filter) => {
              const selected = quickTab === filter.key
              return (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setQuickTab(filter.key)}
                  style={{
                    border: selected ? '1px solid #14574D' : '1px solid rgba(20,87,77,0.12)',
                    borderRadius: 999,
                    padding: '6px 10px',
                    background: selected ? '#EAF4F1' : '#FFFFFF',
                    color: selected ? '#14574D' : '#6A5C47',
                    fontSize: 11.5,
                    fontWeight: selected ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {filter.label} <span style={{ opacity: 0.72 }}>· {filter.count}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredItems.map((item) => {
              const isMastered = masteredIds.has(item.id)

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: '1px solid rgba(20, 87, 77, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#17352F' }}>{item.title}</span>
                      <span style={{ fontSize: 10, background: '#F5FAF7', color: '#14574D', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                        {item.categoryLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8A6517', fontWeight: 700, marginTop: 3 }}>{item.formula}</div>
                    <div style={{ fontSize: 11.5, color: '#7A694F', marginTop: 2 }}>{item.summary}</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleMastered(item.id, e)}
                    style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}
                  >
                    {isMastered ? <CheckCircleFilled style={{ color: '#14574D', fontSize: 18 }} /> : <CheckCircleOutlined style={{ color: '#A0937D', fontSize: 18 }} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ==================== 视图 2：沉浸式翻页精学特训卡 (DECK) ====================
  const isMasteredInDeck = masteredIds.has(currentCardItem.id)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 14px 40px', color: '#17352F' }}>
      {/* 桌面端显示层级返回；手机端统一使用应用顶栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <button type="button" className="mobile-shell-back" onClick={() => setViewMode('SELECTION')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', border: 0, background: 'transparent', color: '#14574D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <LeftOutlined /> 返回语法专题
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: currentSection.color, background: currentSection.bg, padding: '3px 10px', borderRadius: 999 }}>
            {currentSection.name}
          </span>
        </div>
      </div>

      {/* 特训进度条 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7A694F', marginBottom: 6, fontWeight: 700 }}>
          <span>第 {cardIndex + 1} / {currentDeckItems.length} 个考点</span>
          <span>已掌握 {currentDeckItems.filter((i) => masteredIds.has(i.id)).length} 个</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: '#EAE5DB', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.round(((cardIndex + 1) / currentDeckItems.length) * 100)}%`,
              height: '100%',
              borderRadius: 999,
              background: currentSection.gradient,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* ===== 翻页精学卡：规则讲解、易错辨析与题型微练 ===== */}
      <div
        onClick={() => setIsFlipped((prev) => !prev)}
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          padding: '24px 20px',
          border: isMasteredInDeck ? '2px solid #14574D' : '2px solid rgba(20, 87, 77, 0.15)',
          boxShadow: '0 8px 30px rgba(20, 87, 77, 0.08)',
          minHeight: 420,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* 卡片右上角徽章 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: currentSection.bg, color: currentSection.color }}>
            {currentCardItem.categoryLabel}
          </span>

          <span style={{ fontSize: 12, color: '#8C7E6A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <SwapOutlined />
            <span>{isFlipped ? '点击翻回正面' : '点击卡片翻面'}</span>
          </span>
        </div>

        {!isFlipped ? (
          /* ==================== 正面：考点标题 + 核心公式 + 思考引导 ==================== */
          <div style={{ textAlign: 'center', padding: '36px 10px' }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#17352F', lineHeight: 1.35 }}>
              {currentCardItem.title}
            </h1>

            <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 14, background: '#FAF8F4', borderLeft: '4px solid #14574D', textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#14574D', fontWeight: 800, marginBottom: 2 }}>核心结构 / 公式：</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#2A1D0B' }}>
                {currentCardItem.formula}
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#6A5C47', marginTop: 14, lineHeight: 1.6 }}>
              {currentCardItem.summary}
            </div>

            <div style={{ marginTop: 36, padding: '12px 18px', borderRadius: 14, background: '#FAF8F4', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px dashed rgba(20,87,77,0.2)' }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <span style={{ fontSize: 13, color: '#14574D', fontWeight: 700 }}>
                轻触卡片，查看结构要点、易错辨析与题型微练
              </span>
            </div>
          </div>
        ) : (
          /* ==================== 背面：思维导图 + 踩坑对照 + 深度清楚解析 ==================== */
          <div style={{ padding: '8px 2px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 900, color: '#17352F' }}>
              {currentCardItem.title} · 知识点拓展
            </h3>

            {/* 1. 核心思维导图要点 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#14574D', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <CompassOutlined />
                <span>核心思维导图剖析：</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {currentCardItem.mindmapNotes.map((note, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#3A2E1D', background: '#F8FAF9', padding: '6px 10px', borderRadius: 8, display: 'flex', gap: 6 }}>
                    <span style={{ color: '#14574D', fontWeight: 800 }}>•</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. 踩坑对比组 (Spot the Pitfall) */}
            <div style={{ background: '#FFFDF9', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(201, 164, 92, 0.25)', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#8A6517', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FireOutlined style={{ color: '#D4A346' }} />
                <span>易错点对比分析：</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ color: '#DC2626', background: '#FEF2F2', padding: '5px 8px', borderRadius: 6 }}>
                  ❌ <strong>易错：</strong>{currentCardItem.contrast.wrong}
                </div>
                <div style={{ color: '#15803D', background: '#F0FDF4', padding: '5px 8px', borderRadius: 6 }}>
                  ✅ <strong>正确：</strong>{currentCardItem.contrast.right}
                </div>
                <div style={{ color: '#6B5A40', fontSize: 11, marginTop: 2 }}>
                  💡 <strong>深度点拨：</strong>{currentCardItem.contrast.analysis}
                </div>
              </div>
            </div>

            {/* 3. 原创题型微练（即选即判） */}
            {currentCardItem.testQuestion && (
              <div style={{ background: '#F5FAF7', borderRadius: 14, padding: '12px', border: '1px solid rgba(20,87,77,0.15)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#14574D', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <BulbFilled style={{ color: '#D4A346' }} />
                  <span>中考题型微练：</span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#17352F', whiteSpace: 'pre-line', lineHeight: 1.5, marginBottom: 8 }}>
                  {currentCardItem.testQuestion.question}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {currentCardItem.testQuestion.options.map((opt, optIdx) => {
                    const answered = userAnswers[currentCardItem.id] !== undefined
                    const isSelected = userAnswers[currentCardItem.id] === optIdx
                    const isCorrect = optIdx === currentCardItem.testQuestion?.answer

                    let bg = '#FFFFFF'
                    let border = '1px solid rgba(20,87,77,0.1)'
                    let color = '#17352F'

                    if (answered) {
                      if (isCorrect) { bg = '#EAF5F0'; border = '1.5px solid #14574D'; color = '#14574D' }
                      else if (isSelected) { bg = '#FEE2E2'; border = '1.5px solid #DC2626'; color = '#DC2626' }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={answered}
                        onClick={() => handleSelectAnswer(currentCardItem.id, optIdx)}
                        style={{
                          cursor: answered ? 'default' : 'pointer',
                          borderRadius: 8,
                          padding: '7px 10px',
                          border,
                          background: bg,
                          color,
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: 'left',
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </button>
                    )
                  })}
                </div>

                {userAnswers[currentCardItem.id] !== undefined && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#3A2E1D', background: '#FFFFFF', padding: '6px 8px', borderRadius: 6, lineHeight: 1.5 }}>
                    <strong style={{ color: '#14574D' }}>解析：</strong>{currentCardItem.testQuestion.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 卡片底部切换按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid #F0ECE4' }}>
          <button
            type="button"
            disabled={cardIndex === 0}
            onClick={(e) => { e.stopPropagation(); handlePrevCard() }}
            style={{
              background: 'transparent',
              border: 0,
              cursor: cardIndex === 0 ? 'default' : 'pointer',
              color: cardIndex === 0 ? '#C4BDB5' : '#14574D',
              fontWeight: 700,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <LeftOutlined style={{ fontSize: 11 }} />
            <span>上个考点</span>
          </button>

          <span style={{ fontSize: 12, color: '#A0937D' }}>
            {cardIndex + 1} / {currentDeckItems.length}
          </span>

          <button
            type="button"
            disabled={cardIndex === currentDeckItems.length - 1}
            onClick={(e) => { e.stopPropagation(); handleNextCard() }}
            style={{
              background: 'transparent',
              border: 0,
              cursor: cardIndex === currentDeckItems.length - 1 ? 'default' : 'pointer',
              color: cardIndex === currentDeckItems.length - 1 ? '#C4BDB5' : '#14574D',
              fontWeight: 700,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>下个考点</span>
            <RightOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
      </div>

      {/* ===== 底部操作区：需巩固 vs 掌握了 ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12, marginTop: 18 }}>
        <button
          type="button"
          onClick={handleForgot}
          style={{
            cursor: 'pointer',
            borderRadius: 16,
            padding: '14px 0',
            border: '1.5px solid #FCA5A5',
            background: '#FEF2F2',
            color: '#DC2626',
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
          }}
        >
          <CloseCircleOutlined style={{ fontSize: 16 }} />
          <span>需巩固/看精讲</span>
        </button>

        <button
          type="button"
          onClick={handleRemember}
          style={{
            cursor: 'pointer',
            borderRadius: 16,
            padding: '14px 0',
            border: 0,
            background: 'linear-gradient(135deg, #14574D 0%, #1A7E6F 100%)',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: '0 4px 14px rgba(20, 87, 77, 0.25)',
          }}
        >
          <CheckCircleFilled style={{ fontSize: 16 }} />
          <span>掌握了 · 下一个 ▶</span>
        </button>
      </div>
    </div>
  )
}
