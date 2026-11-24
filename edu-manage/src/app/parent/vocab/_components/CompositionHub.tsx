'use client'

import React, { useCallback, useState, useMemo, useEffect } from 'react'
import {
  BookFilled,
  BulbFilled,
  CheckCircleFilled,
  CheckCircleOutlined,
  CopyOutlined,
  EditFilled,
  FireOutlined,
  LeftOutlined,
  ReadOutlined,
  RightOutlined,
  SoundOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
  ThunderboltFilled,
  TrophyFilled,
} from '@ant-design/icons'
import { message } from 'antd'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'
import {
  COMPOSITION_SENTENCES,
  MODEL_ESSAYS,
  type CompositionSentence,
} from '@/data/english-composition/zhongkao-composition'

interface CompositionHubProps {
  onBack: () => void
  studentName?: string
  studentId?: string
}

type CompositionCategoryKey = 'OPENING' | 'TRANSITION' | 'ENDING'

interface CompositionSectionMeta {
  key: CompositionCategoryKey
  name: string
  subtitle: string
  ruleTip: string
  color: string
  bg: string
  gradient: string
  badgeBg: string
  items: CompositionSentence[]
}

export function CompositionHub({ onBack, studentName = '学员', studentId }: CompositionHubProps) {
  // 当前视图模式：'SELECTION' 专区选择大厅 | 'DECK' 翻页精学卡模式 | 'ESSAYS' 主题范文库
  const [viewMode, setViewMode] = useState<'SELECTION' | 'DECK' | 'ESSAYS'>('SELECTION')
  const [currentSectionKey, setCurrentSectionKey] = useState<CompositionCategoryKey>('OPENING')

  const handleMobileBack = useCallback(() => {
    if (viewMode !== 'SELECTION') {
      setViewMode('SELECTION')
      return true
    }
    onBack()
    return true
  }, [onBack, viewMode])

  useMobileBackHandler(handleMobileBack, 10)

  // 翻页背诵/精学卡状态
  const [cardIndex, setCardIndex] = useState<number>(0)
  const [isFlipped, setIsFlipped] = useState<boolean>(false)

  // 范文库状态
  const [activeEssayId, setActiveEssayId] = useState<string>(MODEL_ESSAYS[0].id)

  // 快速速查列表的过滤
  const [quickTab, setQuickTab] = useState<CompositionCategoryKey | 'ALL'>('ALL')
  const [searchKeyword, setSearchKeyword] = useState<string>('')

  // 本地掌握记录持久化
  const masteredStorageKey = useMemo(() => `muzhe_composition_mastered_${studentId || 'default'}`, [studentId])
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set())

  // 句型收藏夹持久化
  const favoriteStorageKey = useMemo(() => `muzhe_composition_favs_${studentId || 'default'}`, [studentId])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    try {
      const rawMastered = localStorage.getItem(masteredStorageKey)
      if (rawMastered) setMasteredIds(new Set(JSON.parse(rawMastered)))
    } catch {
      // ignore
    }
    try {
      const rawFavs = localStorage.getItem(favoriteStorageKey)
      if (rawFavs) setFavoriteIds(new Set(JSON.parse(rawFavs)))
    } catch {
      // ignore
    }
  }, [masteredStorageKey, favoriteStorageKey])

  const toggleMastered = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setMasteredIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(masteredStorageKey, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        message.info('已从考前背诵锦囊中移除')
      } else {
        next.add(id)
        message.success('已加入考前背诵锦囊！')
      }
      try {
        localStorage.setItem(favoriteStorageKey, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  // 发音朗读
  const playSpeech = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.88
      window.speechSynthesis.speak(utterance)
    } else {
      message.info('发音准备就绪')
    }
  }

  // 复制文本
  const copyText = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板！')
    } else {
      message.info(text)
    }
  }

  // 专区元数据定义
  const sections: CompositionSectionMeta[] = useMemo(() => [
    {
      key: 'OPENING',
      name: '开头表达 · 准确点题',
      subtitle: '书信开场 / 主题引入 / 人物与经历',
      ruleTip: '先回应题目并说明写作目的或场景。只有在内容相关时才使用谚语或设问，不必为了显得复杂而套句。',
      color: '#B25E18',
      bg: '#FDF5EC',
      gradient: 'linear-gradient(135deg, #8C430B 0%, #B25E18 100%)',
      badgeBg: 'rgba(178, 94, 24, 0.1)',
      items: COMPOSITION_SENTENCES.filter((s) => s.category === 'OPENING'),
    },
    {
      key: 'TRANSITION',
      name: '篇章衔接 · 条理清楚',
      subtitle: '顺序 / 补充 / 转折 / 因果 / 举例',
      ruleTip: '连接词要表达真实的逻辑关系。每段围绕一个要点展开，避免为了追求复杂句式而堆叠连接词。',
      color: '#2B4E8C',
      bg: '#EEF4FC',
      gradient: 'linear-gradient(135deg, #1C3B73 0%, #2B4E8C 100%)',
      badgeBg: 'rgba(43, 78, 140, 0.1)',
      items: COMPOSITION_SENTENCES.filter((s) => s.category === 'TRANSITION'),
    },
    {
      key: 'ENDING',
      name: '结尾表达 · 总结与感受',
      subtitle: '观点回扣 / 行动建议 / 个人收获 / 书信收尾',
      ruleTip: '用结尾回应题目，补充感受、收获或适当建议。书信要有恰当的结束语；不要强行加入倒装、比喻或号召。',
      color: '#14574D',
      bg: '#EAF5F0',
      gradient: 'linear-gradient(135deg, #0E4139 0%, #14574D 100%)',
      badgeBg: 'rgba(20, 87, 77, 0.1)',
      items: COMPOSITION_SENTENCES.filter((s) => s.category === 'ENDING'),
    },
  ], [])

  // 当前专题考点集合
  const currentSection = useMemo(() => {
    return sections.find((s) => s.key === currentSectionKey) || sections[0]
  }, [sections, currentSectionKey])

  const currentDeckItems = currentSection.items
  const currentCardItem = currentDeckItems[cardIndex] || currentDeckItems[0]

  // 进入指定专区翻页精学
  const startDeckTraining = (key: CompositionCategoryKey) => {
    setCurrentSectionKey(key)
    setCardIndex(0)
    setIsFlipped(false)
    setViewMode('DECK')
  }

  // 翻页操作：记住了
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
      message.warning('已标记为待巩固，翻转查看句型说明与易错提示。')
    setIsFlipped(true)
  }

  // 快速速查列表过滤
  const filteredSentences = useMemo(() => {
    return COMPOSITION_SENTENCES.filter((s) => {
      const matchCategory = quickTab === 'ALL' || s.category === quickTab
      const matchSearch =
        !searchKeyword.trim() ||
        s.topic.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        s.advancedSentence.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        s.translation.includes(searchKeyword) ||
        s.basicSentence.toLowerCase().includes(searchKeyword.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [quickTab, searchKeyword])

  // 总掌握统计
  const totalMasteredCount = useMemo(() => {
    return COMPOSITION_SENTENCES.filter((s) => masteredIds.has(s.id)).length
  }, [masteredIds])

  const masteredRate = Math.round((totalMasteredCount / COMPOSITION_SENTENCES.length) * 100)

  const selectedEssay = useMemo(() => {
    return MODEL_ESSAYS.find((e) => e.id === activeEssayId) || MODEL_ESSAYS[0]
  }, [activeEssayId])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 14px 40px', color: '#17352F' }}>
      {/* ========================================================= */}
      {/* 视图一：专区选择大厅 (SELECTION)                           */}
      {/* ========================================================= */}
      {viewMode === 'SELECTION' && (
        <>
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

          {/* 顶部高光 Hero 卡片 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #3A1808 0%, #6E2D0C 50%, #9E4515 100%)',
              borderRadius: 22,
              padding: '20px 22px',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 28px rgba(110, 45, 12, 0.32)',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -25,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,200,100,0.2) 0%, rgba(255,255,255,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, color: '#FFE0B2', marginBottom: 8, letterSpacing: '0.04em' }}>
                  <EditFilled style={{ color: '#FFD54F' }} />
                  <span>ZHONGKAO WRITING PRACTICE · 满分作文句库</span>
                </div>
                <div
                  style={{
                    color: '#FFFFFF !important',
                    fontSize: 26,
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    textShadow: '0 2px 8px rgba(0,0,0,0.45)',
                  }}
                >
                  已掌握 {totalMasteredCount} / {COMPOSITION_SENTENCES.length} 条表达
                </div>
                <div style={{ fontSize: 12.5, color: '#FFE0B2', marginTop: 5, opacity: 0.95 }}>
                  开头点题 · 段落衔接 · 结尾收束 · 主题范文
                </div>
              </div>

              {/* 范文库入口按钮 */}
              <button
                type="button"
                onClick={() => setViewMode('ESSAYS')}
                style={{
                  background: 'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
                  border: 'none',
                  borderRadius: 14,
                  padding: '9px 13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 900, color: '#4A230D' }}>
                  <BookFilled style={{ color: '#D97706' }} />
                  <span>主题范文</span>
                </div>
                <span style={{ fontSize: 10, color: '#663B14', fontWeight: 600 }}>{MODEL_ESSAYS.length} 篇参考范文</span>
              </button>
            </div>

            {/* 掌握度进度条 */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#FFE0B2', marginBottom: 6 }}>
                <span>句型掌握率 {masteredRate}%</span>
                <span>个人成长 · 校园生活 · 传统文化 · 科技与自然</span>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${masteredRate}%`,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #FFE082 0%, #FFB300 100%)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 专区选择大厅标题 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 2px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BulbFilled style={{ color: '#B25E18', fontSize: 16 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#17352F' }}>请选择写作学习专区</span>
            </div>
            <span style={{ fontSize: 11.5, color: '#7A694F' }}>句型对照 · 场景辨析 · 点击开始 ➔</span>
          </div>

          {/* 三大专区卡片 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sections.map((sec) => {
              const secMasteredCount = sec.items.filter((item) => masteredIds.has(item.id)).length
              const secTotalCount = sec.items.length
              const secRate = Math.round((secMasteredCount / secTotalCount) * 100)

              return (
                <div
                  key={sec.key}
                  onClick={() => startDeckTraining(sec.key)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 18,
                    padding: '16px 18px',
                    border: '1px solid rgba(20, 87, 77, 0.08)',
                    boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.04)'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      background: sec.gradient,
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#17352F' }}>{sec.name}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: sec.color,
                            background: sec.badgeBg,
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}
                        >
                          {secMasteredCount} / {secTotalCount} 已攻克
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#7A694F', marginTop: 4 }}>
                        {sec.subtitle}
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        background: sec.bg,
                        color: sec.color,
                        border: 'none',
                        borderRadius: 10,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <span>进入精学</span>
                      <RightOutlined style={{ fontSize: 10 }} />
                    </button>
                  </div>

                  {/* 口诀提示条 */}
                  <div
                    style={{
                      background: sec.bg,
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: '#423727',
                      marginTop: 8,
                      borderLeft: `3px solid ${sec.color}`,
                    }}
                  >
                    {sec.ruleTip}
                  </div>

                  {/* 掌握度微型进度条 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 999, background: '#EAE6DF', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${secRate}%`,
                          borderRadius: 999,
                          background: sec.gradient,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sec.color }}>{secRate}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 主题范文推荐卡 */}
          <div
            onClick={() => setViewMode('ESSAYS')}
            style={{
              marginTop: 14,
              background: 'linear-gradient(135deg, #FDF7EB 0%, #FFFDF8 100%)',
              border: '1.5px dashed rgba(217, 119, 6, 0.35)',
              borderRadius: 18,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(217, 119, 6, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', fontSize: 20 }}>
                <BookFilled />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 900, color: '#17352F' }}>{MODEL_ESSAYS.length} 篇主题范文 · 阅读与拆解</span>
                  <span style={{ fontSize: 10.5, color: '#D97706', background: '#FEF3C7', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>含结构提示</span>
                </div>
                <div style={{ fontSize: 12, color: '#7A694F', marginTop: 2 }}>
                  结合 2024 版教材主题与课程标准写作要求整理；任务与范文为原创参考材料，请按题目调整。
                </div>
              </div>
            </div>
            <RightOutlined style={{ color: '#D97706', fontSize: 14 }} />
          </div>

          {/* 句型速查与自测清单 */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ReadOutlined style={{ color: '#14574D', fontSize: 16 }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#17352F' }}>句型表达速查 ({filteredSentences.length})</span>
              </div>
              {favoriteIds.size > 0 && (
                <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 700 }}>
                  已收藏 {favoriteIds.size} 条锦囊
                </div>
              )}
            </div>

            {/* 检索与分类过滤器 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type="text"
                placeholder="搜索表达句型 / 中文含义 / 写作场景..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  border: '1px solid rgba(20,87,77,0.15)',
                  borderRadius: 12,
                  padding: '8px 12px',
                  fontSize: 12.5,
                  color: '#17352F',
                  outline: 'none',
                }}
              />
            </div>

            {/* 分类快捷标签 */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
              {[
                { key: 'ALL', label: `全部 (${COMPOSITION_SENTENCES.length})` },
                { key: 'OPENING', label: '开头点题' },
                { key: 'TRANSITION', label: '段落衔接' },
                { key: 'ENDING', label: '结尾收束' },
              ].map((tab) => {
                const active = quickTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setQuickTab(tab.key as CompositionCategoryKey | 'ALL')}
                    style={{
                      background: active ? '#14574D' : '#FFFFFF',
                      color: active ? '#FFFFFF' : '#6A5F4D',
                      border: active ? 'none' : '1px solid rgba(20,87,77,0.12)',
                      borderRadius: 999,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: active ? 800 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* 金句卡片流 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {filteredSentences.map((s) => {
                const isMastered = masteredIds.has(s.id)
                const isFav = favoriteIds.has(s.id)
                return (
                  <div
                    key={s.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 16,
                      padding: '14px 16px',
                      border: isMastered ? '1px solid rgba(20, 87, 77, 0.25)' : '1px solid rgba(20, 87, 77, 0.08)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#B25E18', background: '#FDF5EC', padding: '1px 8px', borderRadius: 999 }}>
                          {s.categoryLabel}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#17352F' }}>{s.topic}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(s.id, e)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15, color: isFav ? '#FFB300' : '#C7BBA8' }}
                        >
                          {isFav ? <StarFilled /> : <StarOutlined />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => toggleMastered(s.id, e)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: isMastered ? '#EAF5F0' : '#F7F5F0',
                            color: isMastered ? '#14574D' : '#7A694F',
                            border: 'none',
                            borderRadius: 999,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isMastered ? <CheckCircleFilled /> : <CheckCircleOutlined />}
                          <span>{isMastered ? '已攻克' : '标为掌握'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 基础表达对照 */}
                    <div style={{ background: '#FBF9F5', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#8C7E6C', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: '#D97706', fontWeight: 700, flexShrink: 0 }}>基础表达:</span>
                      <span style={{ textDecoration: 'line-through', opacity: 0.85 }}>{s.basicSentence}</span>
                    </div>

                    {/* 表达升级 */}
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#14574D', lineHeight: 1.5, marginBottom: 4 }}>
                      {s.advancedSentence}
                    </div>

                    {/* 中文翻译 */}
                    <div style={{ fontSize: 12.5, color: '#5C5040', lineHeight: 1.45, marginBottom: 8 }}>
                      {s.translation}
                    </div>

                    {/* 亮点与动作 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F0ECE4', paddingTop: 8, marginTop: 4 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {s.highlights.slice(0, 2).map((h, i) => (
                          <span key={i} style={{ fontSize: 10.5, color: '#14574D', background: '#EAF5F0', padding: '1px 6px', borderRadius: 4 }}>
                            {h}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={(e) => playSpeech(s.advancedSentence, e)}
                          style={{ background: 'transparent', border: 'none', color: '#14574D', cursor: 'pointer', fontSize: 13 }}
                          title="听标准发音"
                        >
                          <SoundOutlined />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => copyText(s.advancedSentence, e)}
                          style={{ background: 'transparent', border: 'none', color: '#14574D', cursor: 'pointer', fontSize: 13 }}
                          title="复制金句"
                        >
                          <CopyOutlined />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 视图二：沉浸式精学特训卡模式 (DECK)                         */}
      {/* 彻底解决高度遮挡与移动端折行挤压，保证底部按钮永远完整可见   */}
      {/* ========================================================= */}
      {viewMode === 'DECK' && (
        <div>
          {/* 顶栏第 1 层：导航与全局操作 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <button type="button" className="mobile-shell-back" onClick={() => setViewMode('SELECTION')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', border: 0, background: 'transparent', color: '#14574D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <LeftOutlined /> 返回作文专区
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 收藏按钮 */}
              <button
                type="button"
                onClick={(e) => toggleFavorite(currentCardItem.id, e)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(20, 87, 77, 0.15)',
                  borderRadius: 999,
                  padding: '5px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: favoriteIds.has(currentCardItem.id) ? '#D97706' : '#7A694F',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                {favoriteIds.has(currentCardItem.id) ? (
                  <StarFilled style={{ color: '#D97706' }} />
                ) : (
                  <StarOutlined />
                )}
                <span>{favoriteIds.has(currentCardItem.id) ? '已入锦囊' : '存入锦囊'}</span>
              </button>

              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#17352F', background: '#F5FAF7', padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(20,87,77,0.12)' }}>
                {studentName}
              </span>
            </div>
          </div>

          {/* 顶栏第 2 层：专区徽章与翻面切换（结构舒展，永不挤压折行） */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: currentSection.color,
                  background: currentSection.bg,
                  padding: '3px 10px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                {currentSection.name}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#7A694F', background: '#FAF7F2', padding: '3px 8px', borderRadius: 999 }}>
                金句 {cardIndex + 1} / {currentDeckItems.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #14574D',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 800,
                color: '#14574D',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(20, 87, 77, 0.08)',
                whiteSpace: 'nowrap',
              }}
            >
              <SwapOutlined />
              <span>{isFlipped ? '翻看考点正面' : '翻看讲解背面'}</span>
            </button>
          </div>

          {/* 特训精学卡片：自然高度撑开，100% 避免溢出遮挡底部操作条 */}
          <div
            onClick={() => setIsFlipped((prev) => !prev)}
            style={{
              background: '#FFFFFF',
              borderRadius: 22,
              padding: '20px 18px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
              border: isFlipped ? '2px solid rgba(20, 87, 77, 0.25)' : '1px solid rgba(20, 87, 77, 0.12)',
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'border 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {!isFlipped ? (
              /* ==================== 正面：表达意图 + 基础表达对照 + 写作提示 ==================== */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 900,
                      color: currentSection.color,
                      background: currentSection.badgeBg,
                      padding: '3px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {currentCardItem.categoryLabel} · {currentCardItem.topic}
                  </span>
                  <span style={{ fontSize: 11, color: '#A09380', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span>轻触翻面</span>
                    <SwapOutlined />
                  </span>
                </div>

                {/* 想要表达的中文意境 */}
                <div style={{ marginTop: 6, marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, color: '#8C7E6C', fontWeight: 700, marginBottom: 4 }}>
                    🎯 【想要表达的意境】
                  </div>
                  <div style={{ fontSize: 16.5, fontWeight: 900, color: '#17352F', lineHeight: 1.45 }}>
                    “{currentCardItem.translation}”
                  </div>
                </div>

                {/* 基础表达对照 */}
                <div
                  style={{
                    background: '#FFF8F4',
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: '1.5px dashed rgba(217, 119, 6, 0.3)',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#D97706', marginBottom: 4 }}>
                    <span>表达对照（基础写法）：</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#6A5F4D', fontFamily: 'serif', fontStyle: 'italic', lineHeight: 1.5 }}>
                    “{currentCardItem.basicSentence}”
                  </div>
                </div>

                {/* 名师思维启迪 */}
                <div
                  style={{
                    background: '#F5FAF7',
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: '1px solid rgba(20, 87, 77, 0.1)',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#14574D', marginBottom: 4 }}>
                    <BulbFilled style={{ color: '#E0A82E' }} />
                    <span>写作提示：</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#4A5B53', lineHeight: 1.6 }}>
                    先确认句子是否贴合题目，再选择合适的词汇和连接方式。表达清楚、语法准确、内容完整，比刻意追求复杂句式更重要。
                  </div>
                </div>

                {/* 翻转卡片指引 */}
                <div
                  style={{
                    textAlign: 'center',
                    padding: '8px 0 0',
                    borderTop: '1px solid #F0ECE4',
                    color: '#14574D',
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <SwapOutlined />
                  <span>轻触卡片 ➔ 查看改写示例、句型结构与使用提示</span>
                </div>
              </div>
            ) : (
              /* ==================== 背面：改写示例 + 句型公式 + 讲解 + 易错点 ==================== */
              <div>
                {/* 顶栏标签与动作按钮 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#FFFFFF', background: currentSection.gradient, padding: '2px 8px', borderRadius: 999 }}>
                      表达改写示例
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#17352F' }}>{currentCardItem.topic}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => playSpeech(currentCardItem.advancedSentence, e)}
                      style={{
                        background: '#EAF5F0',
                        border: 'none',
                        borderRadius: 8,
                        padding: '4px 8px',
                        color: '#14574D',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <SoundOutlined />
                      <span>朗读</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => copyText(currentCardItem.advancedSentence, e)}
                      style={{
                        background: '#F5FAF7',
                        border: 'none',
                        borderRadius: 8,
                        padding: '4px 8px',
                        color: '#14574D',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <CopyOutlined />
                      <span>复制</span>
                    </button>
                  </div>
                </div>

                {/* 表达改写示例 */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F5FAF7 0%, #EBF4F0 100%)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    border: '1.5px solid rgba(20, 87, 77, 0.2)',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#14574D', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
                    {currentCardItem.advancedSentence}
                  </div>
                  <div style={{ fontSize: 12, color: '#4A5B53', marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
                    中文释义：{currentCardItem.translation}
                  </div>
                </div>

                {/* 核心句型公式 / 高分模板 */}
                <div
                  style={{
                    background: '#FFFBEB',
                    borderRadius: 12,
                    padding: '9px 12px',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#B45309', marginBottom: 3 }}>
                    <ThunderboltFilled />
                    <span>句型结构：</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#78350F', fontFamily: 'monospace', lineHeight: 1.4 }}>
                    {currentCardItem.formula}
                  </div>
                </div>

                {/* 阅卷得分亮点拆解 */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#17352F', marginBottom: 5 }}>
                    ✨ 句型要点：
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {currentCardItem.highlights.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          background: '#EAF5F0',
                          color: '#14574D',
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 6,
                          border: '1px solid rgba(20, 87, 77, 0.15)',
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 名师点拨 */}
                <div
                  style={{
                    background: '#F9F7F3',
                    borderRadius: 12,
                    padding: '9px 11px',
                    fontSize: 11.5,
                    color: '#423727',
                    lineHeight: 1.5,
                    marginBottom: 10,
                  }}
                >
                    <span style={{ fontWeight: 800, color: '#8C430B' }}>💡 使用说明：</span>
                  {currentCardItem.deepAnalysis}
                </div>

                {/* 易错避坑 */}
                <div
                  style={{
                    background: '#FDF2F2',
                    borderRadius: 12,
                    padding: '9px 11px',
                    fontSize: 11.5,
                    color: '#991B1B',
                    lineHeight: 1.5,
                    borderLeft: '3px solid #DC2626',
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontWeight: 800 }}>⚠️ 易错避坑：</span>
                  {currentCardItem.pitfall}
                </div>

                {/* 翻回正面提示 */}
                <div style={{ textAlign: 'center', color: '#8C7E6C', fontSize: 11, paddingTop: 4 }}>
                  轻触卡片可翻回正面自测
                </div>
              </div>
            )}
          </div>

          {/* 翻页特训卡底部常驻操作控制条（毛玻璃吸底，确保 100% 稳定可点） */}
          <div
            style={{
              position: 'sticky',
              bottom: 8,
              zIndex: 30,
              background: 'rgba(247, 245, 240, 0.96)',
              backdropFilter: 'blur(12px)',
              borderRadius: 18,
              padding: '6px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 -2px 10px rgba(0,0,0,0.02)',
            }}
          >
            {/* 上一句 */}
            <button
              type="button"
              disabled={cardIndex === 0}
              onClick={() => {
                if (cardIndex > 0) {
                  setCardIndex(cardIndex - 1)
                  setIsFlipped(false)
                }
              }}
              style={{
                width: 44,
                height: 46,
                borderRadius: 14,
                background: '#FFFFFF',
                border: '1px solid rgba(20, 87, 77, 0.15)',
                color: cardIndex === 0 ? '#C7BBA8' : '#14574D',
                cursor: cardIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                flexShrink: 0,
              }}
            >
              <LeftOutlined />
            </button>

            {/* 需巩固 */}
            <button
              type="button"
              onClick={handleForgot}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 14,
                background: '#FFFFFF',
                border: '1.5px solid #E0783D',
                color: '#E0783D',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: '0 2px 8px rgba(224, 120, 61, 0.1)',
              }}
            >
              <FireOutlined />
              <span>需巩固 · 看讲解</span>
            </button>

            {/* 记住了 / 下一个 */}
            <button
              type="button"
              onClick={handleRemember}
              style={{
                flex: 1.25,
                height: 46,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #14574D 0%, #1E7E6F 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: '0 4px 14px rgba(20, 87, 77, 0.28)',
              }}
            >
              <CheckCircleFilled />
              <span>{cardIndex + 1 === currentDeckItems.length ? '完成该专区' : '记住了 · 下一句'}</span>
            </button>

            {/* 下一句 */}
            <button
              type="button"
              disabled={cardIndex + 1 === currentDeckItems.length}
              onClick={() => {
                if (cardIndex + 1 < currentDeckItems.length) {
                  setCardIndex(cardIndex + 1)
                  setIsFlipped(false)
                }
              }}
              style={{
                width: 44,
                height: 46,
                borderRadius: 14,
                background: '#FFFFFF',
                border: '1px solid rgba(20, 87, 77, 0.15)',
                color: cardIndex + 1 === currentDeckItems.length ? '#C7BBA8' : '#14574D',
                cursor: cardIndex + 1 === currentDeckItems.length ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                flexShrink: 0,
              }}
            >
              <RightOutlined />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 视图三：中考主题范文拆解 (ESSAYS)                          */}
      {/* ========================================================= */}
      {viewMode === 'ESSAYS' && (
        <div>
          <button type="button" className="mobile-shell-back" onClick={() => setViewMode('SELECTION')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 8, border: 0, background: 'transparent', color: '#14574D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <LeftOutlined /> 返回作文专区
          </button>
          {/* 范文选择 Tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 12 }}>
            {MODEL_ESSAYS.map((essay, index) => {
              const active = essay.id === activeEssayId
              return (
                <button
                  key={essay.id}
                  type="button"
                  onClick={() => setActiveEssayId(essay.id)}
                  style={{
                    background: active ? '#8C430B' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#6A5F4D',
                    border: active ? 'none' : '1px solid rgba(20,87,77,0.12)',
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontSize: 12.5,
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: active ? '0 4px 12px rgba(140, 67, 11, 0.2)' : 'none',
                  }}
                >
                  <BookFilled style={{ color: active ? '#FFE082' : '#C7BBA8' }} />
                  <span>范文 {index + 1}：{essay.topic}</span>
                </button>
              )
            })}
          </div>

          {/* 选中的范文详情卡 */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: '20px 20px',
              border: '1px solid rgba(20, 87, 77, 0.1)',
              boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
            }}
          >
            {/* 范文头部 */}
            <div style={{ borderBottom: '1px solid #F0ECE4', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 999 }}>
                  {selectedEssay.label}
                </span>
                <span style={{ fontSize: 12, color: '#7A694F' }}>话题：{selectedEssay.topic}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#17352F', lineHeight: 1.35, marginTop: 4 }}>
                {selectedEssay.title}
              </div>
            </div>

            {/* 写作题目要求 */}
            <div style={{ background: '#FBF9F5', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, color: '#6A5F4D', lineHeight: 1.5, marginBottom: 16 }}>
              <span style={{ fontWeight: 800, color: '#17352F' }}>📝 写作任务：</span>
              {selectedEssay.prompt}
            </div>

            {/* 范文全文 (英文) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#14574D' }}>📖 原创参考范文：</span>
                <button
                  type="button"
                  onClick={(e) => copyText(selectedEssay.essay, e)}
                  style={{
                    background: '#F5FAF7',
                    border: 'none',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    color: '#14574D',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CopyOutlined />
                  <span>复制全文</span>
                </button>
              </div>
              <div
                style={{
                  background: '#F8FAF9',
                  borderRadius: 14,
                  padding: '16px 18px',
                  fontSize: 13.5,
                  color: '#17352F',
                  lineHeight: 1.7,
                  fontFamily: 'serif',
                  whiteSpace: 'pre-line',
                  border: '1px solid rgba(20, 87, 77, 0.1)',
                }}
              >
                {selectedEssay.essay}
              </div>
            </div>

            {/* 范文中文翻译 */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#7A694F', display: 'block', marginBottom: 8 }}>
                🇨🇳 参考译文：
              </span>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  padding: '14px 16px',
                  fontSize: 12.5,
                  color: '#5C5040',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-line',
                  border: '1px dashed #EAE6DF',
                }}
              >
                {selectedEssay.translation}
              </div>
            </div>

            {/* 金句提炼 */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#17352F', display: 'block', marginBottom: 8 }}>
                ✨ 可复用表达：
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedEssay.keySentences.map((ks, i) => (
                  <div key={i} style={{ background: '#EAF5F0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#14574D', fontWeight: 600 }}>
                    • {ks}
                  </div>
                ))}
              </div>
            </div>

            {/* 写作提示 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                borderRadius: 14,
                padding: '14px 16px',
                color: '#78350F',
                fontSize: 12.5,
                lineHeight: 1.55,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, marginBottom: 4 }}>
                <TrophyFilled style={{ color: '#D97706' }} />
                <span>写作要点：</span>
              </div>
              <div>{selectedEssay.writingNote}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
