'use client'

import React, { useCallback, useState, useMemo, useEffect } from 'react'
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CompassOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FireFilled,
  FireOutlined,
  LeftOutlined,
  ReadOutlined,
  RedoOutlined,
  RightOutlined,
  SoundOutlined,
  SwapOutlined,
  ThunderboltFilled,
  ThunderboltOutlined,
  TrophyFilled,
  TrophyOutlined,
} from '@ant-design/icons'
import { message, Modal } from 'antd'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'
import {
  IRREGULAR_VERBS,
  IRREGULAR_VERB_BOOK_REFERENCE,
  IRREGULAR_VERB_IPA,
  type IrregularVerb,
} from '@/data/english-verbs/irregular-verbs'
import { playEnglishAudio, playVerbThreeForms, stopEnglishAudio } from '@/lib/english-audio'

interface VerbMasteryHubProps {
  onBack: () => void
  studentName?: string
  studentId?: string
}

type PatternKey = 'AAA' | 'ABA' | 'AAB' | 'ABB' | 'ABC' | 'SPECIAL'

interface SectionMeta {
  key: PatternKey
  name: string
  subtitle: string
  ruleTip: string
  color: string
  bg: string
  gradient: string
  badgeBg: string
  verbs: IrregularVerb[]
}

export function VerbMasteryHub({ onBack, studentName = '学员', studentId }: VerbMasteryHubProps) {
  // 当前视图模式：'SELECTION' 专区选择大厅 | 'DECK' 翻页背诵卡模式
  const [viewMode, setViewMode] = useState<'SELECTION' | 'DECK'>('SELECTION')
  const [currentSectionKey, setCurrentSectionKey] = useState<PatternKey>('AAA')

  // 翻页背诵卡状态
  const [cardIndex, setCardIndex] = useState<number>(0)
  const [isFlipped, setIsFlipped] = useState<boolean>(false)

  // 快速速查列表的过滤
  const [quickTab, setQuickTab] = useState<PatternKey | 'ALL'>('ALL')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [maskMode, setMaskMode] = useState<boolean>(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  // 本地掌握记录（按学生隔离持久化）
  const storageKey = useMemo(() => `muzhe_verbs_mastered_${studentId || 'default'}`, [studentId])
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set())

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

  // 当前正在朗读的动词与三态步骤
  const [playingVerbId, setPlayingVerbId] = useState<string | null>(null)
  const [playingFormStep, setPlayingFormStep] = useState<'base' | 'past' | 'pp' | 'idle'>('idle')
  const [cardSpeechStep, setCardSpeechStep] = useState<'base' | 'past' | 'pp' | 'idle'>('idle')

  // 权威纯正真人发音伴读
  const handlePlayVerbAudio = async (
    v: IrregularVerb,
    e?: React.MouseEvent,
    singleForm?: 'base' | 'past' | 'pp'
  ) => {
    e?.stopPropagation()
    if (singleForm) {
      setPlayingVerbId(v.id)
      setPlayingFormStep(singleForm)
      const textToPlay = singleForm === 'base' ? v.base : (singleForm === 'past' ? v.past : v.pastParticiple)
      const cleanWord = textToPlay.split('/')[0].split('(')[0].trim().toLowerCase()
      // read 过去式与过去分词音准特异修复
      const finalWord = cleanWord === 'read' && singleForm !== 'base' ? 'red' : cleanWord
      await playEnglishAudio(finalWord)
      setPlayingVerbId(null)
      setPlayingFormStep('idle')
      return
    }

    // 三态连读
    setPlayingVerbId(v.id)
    await playVerbThreeForms(v.base, v.past, v.pastParticiple, (step) => {
      setPlayingFormStep(step)
    })
    setPlayingVerbId(null)
    setPlayingFormStep('idle')
  }

  // 组件卸载时停止音频
  useEffect(() => {
    return () => {
      stopEnglishAudio()
    }
  }, [])

  // 各专区数据归纳
  const sections: SectionMeta[] = useMemo(() => [
    {
      key: 'AAA',
      name: 'AAA 全同专区',
      subtitle: '原形/过去式/过去分词全同',
      ruleTip: '原形、过去式和过去分词拼写相同，但个别词读音会变化：read 的过去式、过去分词读 /red/。',
      color: '#14574D',
      bg: '#EAF5F0',
      gradient: 'linear-gradient(135deg, #14574D 0%, #1E7E6F 100%)',
      badgeBg: 'rgba(20, 87, 77, 0.1)',
      verbs: IRREGULAR_VERBS.filter((v) => v.pattern === 'AAA'),
    },
    {
      key: 'ABA',
      name: 'ABA 原分同专区',
      subtitle: '原形与过去分词相同',
      ruleTip: '【规律口诀】过去式中间元音变 a（come ➔ came），过去分词重新恢复原形 come！',
      color: '#8A6517',
      bg: '#FCF5EC',
      gradient: 'linear-gradient(135deg, #8A6517 0%, #B88A24 100%)',
      badgeBg: 'rgba(138, 101, 23, 0.1)',
      verbs: IRREGULAR_VERBS.filter((v) => v.pattern === 'ABA'),
    },
    {
      key: 'AAB',
      name: 'AAB 原形过去式同形区',
      subtitle: '原形与过去式相同，过去分词变化',
      ruleTip: 'beat–beat–beaten：在完成时或被动结构中，注意使用过去分词 beaten。',
      color: '#6C4D8D',
      bg: '#F3EFF8',
      gradient: 'linear-gradient(135deg, #6C4D8D 0%, #8B6DB0 100%)',
      badgeBg: 'rgba(108, 77, 141, 0.1)',
      verbs: IRREGULAR_VERBS.filter((v) => v.pattern === 'AAB'),
    },
    {
      key: 'ABB',
      name: 'ABB 过去式与分词同形区',
      subtitle: '过去式与过去分词完全相同',
      ruleTip: '-ought/-aught、元音变化后加 t、d 变 t 是几组常见拼写线索；具体形式仍要按单词记。',
      color: '#C05B22',
      bg: '#FBEAE2',
      gradient: 'linear-gradient(135deg, #C05B22 0%, #E0783D 100%)',
      badgeBg: 'rgba(192, 91, 34, 0.1)',
      verbs: IRREGULAR_VERBS.filter((v) => v.pattern === 'ABB'),
    },
    {
      key: 'ABC',
      name: 'ABC 难点进阶区',
      subtitle: '原形、过去式与过去分词均不同',
      ruleTip: '【规律口诀】i-a-u 经典音变（sing-sang-sung）、ow 变 ew-own、过去分词 -en 结尾族。',
      color: '#2B4E8C',
      bg: '#EBF1FB',
      gradient: 'linear-gradient(135deg, #2B4E8C 0%, #416FB8 100%)',
      badgeBg: 'rgba(43, 78, 140, 0.1)',
      verbs: IRREGULAR_VERBS.filter((v) => v.pattern === 'ABC'),
    },
    {
      key: 'SPECIAL',
      name: '特殊词义辨析区',
      subtitle: '按词义区分 lie、lay、hang 的变位',
      ruleTip: '先辨词义，再记变位：lie（躺）与 lie（撒谎）、hang（悬挂）与 hang（绞死）变化不同。',
      color: '#A02727',
      bg: '#FEECEC',
      gradient: 'linear-gradient(135deg, #A02727 0%, #C83B3B 100%)',
      badgeBg: 'rgba(160, 39, 39, 0.1)',
      verbs: IRREGULAR_VERBS.filter((v) => v.pattern === 'SPECIAL'),
    },
  ], [])

  // 当前特训专区动词集合
  const currentSection = useMemo(() => {
    return sections.find((s) => s.key === currentSectionKey) || sections[0]
  }, [sections, currentSectionKey])

  const currentDeckVerbs = currentSection.verbs
  const currentCardVerb = currentDeckVerbs[cardIndex] || currentDeckVerbs[0]

  // 进入指定专区的翻页背诵
  const startDeckTraining = (key: PatternKey) => {
    setCurrentSectionKey(key)
    setCardIndex(0)
    setIsFlipped(false)
    setViewMode('DECK')
  }

  // 翻页背诵操作：记住了
  const handleRemember = () => {
    if (!masteredIds.has(currentCardVerb.id)) {
      toggleMastered(currentCardVerb.id)
    }
    if (cardIndex + 1 < currentDeckVerbs.length) {
      setCardIndex((prev) => prev + 1)
      setIsFlipped(false)
    } else {
      message.success(`🎉 恭喜！您已完成【${currentSection.name}】的背诵特训！`)
      setViewMode('SELECTION')
    }
  }

  // 翻页背诵操作：记错了/需巩固
  const handleForgot = () => {
    if (masteredIds.has(currentCardVerb.id)) {
      toggleMastered(currentCardVerb.id)
    }
    message.warning('已标记为待巩固，翻转背面查看清晰讲解！')
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
    if (cardIndex + 1 < currentDeckVerbs.length) {
      setCardIndex((prev) => prev + 1)
      setIsFlipped(false)
    }
  }

  // 进度统计
  const totalCount = IRREGULAR_VERBS.length
  const totalMasteredCount = IRREGULAR_VERBS.filter((v) => masteredIds.has(v.id)).length
  const masterPercent = Math.round((totalMasteredCount / totalCount) * 100)

  // 10题盲测状态
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<Array<{ verb: IrregularVerb; options: string[]; answerIndex: number }>>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizMistakes, setQuizMistakes] = useState<IrregularVerb[]>([])

  const handleMobileBack = useCallback(() => {
    if (quizOpen) {
      setQuizOpen(false)
      return true
    }
    if (viewMode === 'DECK') {
      setViewMode('SELECTION')
      return true
    }
    onBack()
    return true
  }, [onBack, quizOpen, viewMode])

  useMobileBackHandler(handleMobileBack, 10)

  const startQuiz = () => {
    const shuffled = [...IRREGULAR_VERBS].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 10)
    const questions = selected.map((verb) => {
      const correct = `${verb.past} / ${verb.pastParticiple}`
      const distractors = new Set<string>()
      while (distractors.size < 3) {
        const other = IRREGULAR_VERBS[Math.floor(Math.random() * IRREGULAR_VERBS.length)]
        if (other.id !== verb.id) {
          distractors.add(`${other.past} / ${other.pastParticiple}`)
        }
      }
      const opts = [correct, ...Array.from(distractors)].sort(() => 0.5 - Math.random())
      return {
        verb,
        options: opts,
        answerIndex: opts.indexOf(correct),
      }
    })

    setQuizQuestions(questions)
    setQuizIndex(0)
    setQuizScore(0)
    setQuizSelectedOption(null)
    setQuizFinished(false)
    setQuizMistakes([])
    setQuizOpen(true)
  }

  const handleQuizAnswer = (idx: number) => {
    if (quizSelectedOption !== null) return
    setQuizSelectedOption(idx)
    const currentQ = quizQuestions[quizIndex]
    const isCorrect = idx === currentQ.answerIndex
    if (isCorrect) {
      setQuizScore((prev) => prev + 1)
      if (!masteredIds.has(currentQ.verb.id)) {
        toggleMastered(currentQ.verb.id)
      }
    } else {
      setQuizMistakes((prev) => [...prev, currentQ.verb])
    }

    setTimeout(() => {
      if (quizIndex + 1 < quizQuestions.length) {
        setQuizIndex((prev) => prev + 1)
        setQuizSelectedOption(null)
      } else {
        setQuizFinished(true)
      }
    }, 700)
  }

  // 速查列表筛选
  const filteredVerbs = useMemo(() => {
    return IRREGULAR_VERBS.filter((v) => {
      const matchTab = quickTab === 'ALL' || v.pattern === quickTab
      const matchKeyword =
        !searchKeyword.trim() ||
        v.base.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        v.past.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        v.pastParticiple.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        v.meaning.includes(searchKeyword)
      return matchTab && matchKeyword
    })
  }, [quickTab, searchKeyword])

  // ==================== 视图 1：专区选择大厅 (SELECTION) ====================
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

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <ThunderboltFilled style={{ color: '#F3D98F', fontSize: 15 }} />
                <span style={{ fontSize: 11.5, letterSpacing: 2, color: '#F3D98F', fontWeight: 800 }}>
                  VERB INFLECTION · 动词变位特训
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
                已掌握 {totalMasteredCount} / {totalCount} 张卡
              </h2>
            </div>

            <button
              type="button"
              onClick={startQuiz}
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                color: '#78350F',
                border: 0,
                borderRadius: 9999,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                flexShrink: 0,
              }}
            >
              <TrophyFilled style={{ color: '#92400E' }} />
              <span>10题极速测</span>
            </button>
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
              <span>2024 人教版词汇 · 变位易错拓展</span>
            </div>
          </div>
        </div>

        {/* ===== 专区选择板块：先选是背诵 AAA、ABA 还是 ABB ===== */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingInline: 2 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#17352F' }}>
              选择特训专区（像选册背词一样逐个击破）
            </h3>
            <span style={{ fontSize: 11.5, color: '#8C7E6A' }}>翻页背诵 · 深入精讲</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sections.map((section) => {
              const secMastered = section.verbs.filter((v) => masteredIds.has(v.id)).length
              const secTotal = section.verbs.length
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
                          {section.key} 专区
                        </span>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F' }}>
                          {section.name}
                        </h4>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7A694F' }}>
                        {section.subtitle} · 共 <strong>{secTotal}</strong> 词
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
                      <span>开始翻页背诵</span>
                      <RightOutlined style={{ fontSize: 10 }} />
                    </button>
                  </div>

                  {/* 核心口诀 */}
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

        {/* ===== 全词库速查清单（带搜索 + 遮罩模式） ===== */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingInline: 2 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F' }}>
              全部动词速查清单 (全景检视)
            </h3>
            <span style={{ fontSize: 11.5, color: '#8C7E6A' }}>随时随地查漏补缺</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => {
                const next = !maskMode
                setMaskMode(next)
                setRevealedIds(new Set())
              }}
              style={{
                flex: 1,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px 12px',
                borderRadius: 14,
                border: maskMode ? '1.5px solid #14574D' : '1px solid rgba(20,87,77,0.12)',
                background: maskMode ? '#EAF5F0' : '#FFFFFF',
                color: maskMode ? '#14574D' : '#17352F',
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {maskMode ? <EyeInvisibleOutlined style={{ color: '#14574D' }} /> : <EyeOutlined />}
              <span>{maskMode ? '自测遮罩：已开启' : '开启遮罩自测'}</span>
            </button>

            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索原形/过去式/中文"
              style={{
                width: '55%',
                borderRadius: 14,
                border: '1px solid rgba(20,87,77,0.12)',
                padding: '8px 12px',
                fontSize: 12.5,
                background: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredVerbs.map((v) => {
              const isMastered = masteredIds.has(v.id)
              const isRevealed = revealedIds.has(v.id)
              const shouldMask = maskMode && !isRevealed
              const ipa = IRREGULAR_VERB_IPA[v.id]
              const bookReference = IRREGULAR_VERB_BOOK_REFERENCE[v.id] ?? '变位拓展辨析'

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (maskMode) {
                      setRevealedIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(v.id)) next.delete(v.id)
                        else next.add(v.id)
                        return next
                      })
                    }
                  }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: '1px solid rgba(20, 87, 77, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: maskMode ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#17352F' }}>{v.base}</span>
                      <span style={{ fontSize: 11, color: '#8C7E6A', fontFamily: 'var(--font-geist-mono), monospace' }}>{ipa.base}</span>
                      <button
                        type="button"
                        onClick={(e) => handlePlayVerbAudio(v, e)}
                        style={{
                          background: playingVerbId === v.id ? '#DCFCE7' : 'rgba(20, 87, 77, 0.08)',
                          border: playingVerbId === v.id ? '1px solid #10B981' : '1px solid rgba(20, 87, 77, 0.15)',
                          borderRadius: 999,
                          cursor: 'pointer',
                          color: playingVerbId === v.id ? '#047857' : '#14574D',
                          padding: '2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          transition: 'all 0.16s ease',
                        }}
                        title="播放标准真人发音（原形 ➔ 过去式 ➔ 过去分词）"
                      >
                        <SoundOutlined />
                        <span>
                          {playingVerbId === v.id
                            ? playingFormStep === 'base'
                              ? '原形'
                              : playingFormStep === 'past'
                              ? '过去式'
                              : playingFormStep === 'pp'
                              ? '分词'
                              : '朗读中'
                            : '领读'}
                        </span>
                      </button>
                      <span style={{ fontSize: 10, background: '#F5FAF7', color: '#14574D', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                        {v.pattern}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7A694F', marginTop: 3 }}>{v.meaning}</div>
                    <div style={{ fontSize: 10.5, color: '#8C7E6A', marginTop: 2 }}>{bookReference}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: shouldMask ? 'transparent' : '#8A6517', filter: shouldMask ? 'blur(5px)' : 'none', marginTop: 3 }}>
                      {v.past} / {v.pastParticiple}
                    </div>
                    <div style={{ fontSize: 10.5, color: shouldMask ? 'transparent' : '#8C7E6A', filter: shouldMask ? 'blur(5px)' : 'none', fontFamily: 'var(--font-geist-mono), monospace' }}>
                      {ipa.past} · {ipa.pastParticiple}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleMastered(v.id, e)}
                    style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}
                  >
                    {isMastered ? <CheckCircleFilled style={{ color: '#14574D', fontSize: 18 }} /> : <CheckCircleOutlined style={{ color: '#A0937D', fontSize: 18 }} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* 10题极速测弹窗 */}
        <Modal open={quizOpen} onCancel={() => setQuizOpen(false)} footer={null} destroyOnHidden centered width="min(500px, 94vw)">
          <div style={{ padding: '8px 4px' }}>
            {!quizFinished && quizQuestions.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#14574D', background: '#EAF5F0', padding: '3px 8px', borderRadius: 999 }}>
                    第 {quizIndex + 1} / {quizQuestions.length} 题
                  </span>
                  <span style={{ fontSize: 12, color: '#8C7E6A' }}>目前得分：<strong>{quizScore}</strong></span>
                </div>
                <div style={{ background: '#FAF8F4', borderRadius: 16, padding: '18px 16px', textAlign: 'center', marginBottom: 16, border: '1px solid rgba(20,87,77,0.15)' }}>
                  <div style={{ fontSize: 12, color: '#7A694F', marginBottom: 4 }}>请选出该动词正确的【过去式 / 过去分词】：</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#17352F' }}>{quizQuestions[quizIndex]?.verb.base}</div>
                  <div style={{ fontSize: 12, color: '#8C7E6A', fontFamily: 'var(--font-geist-mono), monospace' }}>
                    {quizQuestions[quizIndex] && IRREGULAR_VERB_IPA[quizQuestions[quizIndex].verb.id].base}
                  </div>
                  <div style={{ fontSize: 13, color: '#8C7E6A', marginTop: 4 }}>{quizQuestions[quizIndex]?.verb.meaning}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {quizQuestions[quizIndex]?.options.map((option, optIdx) => {
                    const isSelected = quizSelectedOption === optIdx
                    const isCorrect = optIdx === quizQuestions[quizIndex].answerIndex
                    let bg = '#FFFFFF'
                    let borderColor = 'rgba(20, 87, 77, 0.12)'
                    let textColor = '#17352F'
                    if (quizSelectedOption !== null) {
                      if (isCorrect) { bg = '#EAF5F0'; borderColor = '#14574D'; textColor = '#14574D' }
                      else if (isSelected) { bg = '#FEE2E2'; borderColor = '#DC2626'; textColor = '#DC2626' }
                    }
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={quizSelectedOption !== null}
                        onClick={() => handleQuizAnswer(optIdx)}
                        style={{
                          cursor: quizSelectedOption === null ? 'pointer' : 'default',
                          borderRadius: 14,
                          padding: '12px 16px',
                          border: `1.5px solid ${borderColor}`,
                          background: bg,
                          color: textColor,
                          fontSize: 14,
                          fontWeight: 700,
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{option}</span>
                        {quizSelectedOption !== null && isCorrect && <CheckCircleFilled style={{ color: '#14574D' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#17352F', margin: 0 }}>盲测完成！本次得分：{quizScore * 10} 分</h3>
                <p style={{ fontSize: 13, color: '#7A694F', margin: '8px 0 16px' }}>答对 {quizScore} / {quizQuestions.length} 题 · 已自动同步掌握状态</p>
                <button
                  type="button"
                  onClick={() => setQuizOpen(false)}
                  style={{ width: '100%', cursor: 'pointer', borderRadius: 9999, padding: '12px 0', border: 0, background: '#14574D', color: '#FFFFFF', fontWeight: 800, fontSize: 14 }}
                >
                  完成巩固
                </button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    )
  }

  // ==================== 视图 2：沉浸式翻页背诵特训卡 (DECK) ====================
  const isMasteredInDeck = masteredIds.has(currentCardVerb.id)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 14px 40px', color: '#17352F' }}>
      {/* 桌面端显示层级返回；手机端统一使用应用顶栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <button type="button" className="mobile-shell-back" onClick={() => setViewMode('SELECTION')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', border: 0, background: 'transparent', color: '#14574D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <LeftOutlined /> 返回动词专区
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
          <span>第 {cardIndex + 1} / {currentDeckVerbs.length} 词</span>
          <span>已掌握 {currentDeckVerbs.filter((v) => masteredIds.has(v.id)).length} 张卡</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: '#EAE5DB', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.round(((cardIndex + 1) / currentDeckVerbs.length) * 100)}%`,
              height: '100%',
              borderRadius: 999,
              background: currentSection.gradient,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* ===== 核心翻页背诵大卡（支持正反面翻转 + 极清晰名师讲解） ===== */}
      <div
        onClick={() => setIsFlipped((prev) => !prev)}
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          padding: '24px 20px',
          border: isMasteredInDeck ? '2px solid #14574D' : '2px solid rgba(20, 87, 77, 0.15)',
          boxShadow: '0 8px 30px rgba(20, 87, 77, 0.08)',
          minHeight: 380,
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
            {currentCardVerb.pattern} 模式
          </span>

          <span style={{ fontSize: 12, color: '#8C7E6A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <SwapOutlined />
            <span>{isFlipped ? '点击翻回正面' : '点击卡片翻面'}</span>
          </span>
        </div>

        {!isFlipped ? (
          /* ==================== 正面：原形 + 释义 + 思考引导 ==================== */
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 40, fontWeight: 900, color: '#17352F', letterSpacing: -0.5 }}>
                {currentCardVerb.base}
              </h1>
              <button
                type="button"
                onClick={(e) => handlePlayVerbAudio(currentCardVerb, e, 'base')}
                style={{
                  background: 'rgba(20, 87, 77, 0.08)',
                  border: 0,
                  borderRadius: '50%',
                  width: 38,
                  height: 38,
                  cursor: 'pointer',
                  color: '#14574D',
                  fontSize: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="点击收听原形标准发音"
              >
                <SoundOutlined />
              </button>
            </div>

            <div style={{ marginTop: 4, fontSize: 13, color: '#8C7E6A', fontFamily: 'var(--font-geist-mono), monospace' }}>
              {IRREGULAR_VERB_IPA[currentCardVerb.id].base}
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: '#6A5C47', marginTop: 12 }}>
              {currentCardVerb.meaning}
            </div>

            <div style={{ marginTop: 40, padding: '12px 18px', borderRadius: 14, background: '#FAF8F4', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px dashed rgba(20,87,77,0.2)' }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <span style={{ fontSize: 13, color: '#14574D', fontWeight: 700 }}>
                轻触卡片，揭晓【过去式】与【过去分词】及名师详解
              </span>
            </div>
          </div>
        ) : (
          /* ==================== 背面：三态揭晓 + 深度清晰名师讲解 ==================== */
          <div style={{ padding: '10px 4px' }}>
            {/* 三态并列展示（点击任意形态即可单独收听纯正真人发音） */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: '#F5FAF7', padding: '12px 10px', borderRadius: 14, textAlign: 'center', marginBottom: 16, border: '1px solid rgba(20,87,77,0.12)' }}>
              <div
                onClick={(e) => handlePlayVerbAudio(currentCardVerb, e, 'base')}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '4px 2px',
                  background: playingVerbId === currentCardVerb.id && playingFormStep === 'base' ? '#DCFCE7' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
                title="点击收听原形标准真人读音"
              >
                <div style={{ fontSize: 11, color: '#7A694F', marginBottom: 2 }}>原形 (Base) 🔊</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#17352F' }}>{currentCardVerb.base}</div>
                <div style={{ fontSize: 10.5, color: '#8C7E6A', fontFamily: 'var(--font-geist-mono), monospace' }}>{IRREGULAR_VERB_IPA[currentCardVerb.id].base}</div>
              </div>
              <div
                onClick={(e) => handlePlayVerbAudio(currentCardVerb, e, 'past')}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '4px 2px',
                  borderInline: '1px dashed rgba(20,87,77,0.15)',
                  background: playingVerbId === currentCardVerb.id && playingFormStep === 'past' ? '#DCFCE7' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
                title="点击收听过去式标准真人读音"
              >
                <div style={{ fontSize: 11, color: '#7A694F', marginBottom: 2 }}>过去式 (Past) 🔊</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#8A6517' }}>{currentCardVerb.past}</div>
                <div style={{ fontSize: 10.5, color: '#8C7E6A', fontFamily: 'var(--font-geist-mono), monospace' }}>{IRREGULAR_VERB_IPA[currentCardVerb.id].past}</div>
              </div>
              <div
                onClick={(e) => handlePlayVerbAudio(currentCardVerb, e, 'pp')}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '4px 2px',
                  background: playingVerbId === currentCardVerb.id && playingFormStep === 'pp' ? '#DCFCE7' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
                title="点击收听过去分词标准真人读音"
              >
                <div style={{ fontSize: 11, color: '#7A694F', marginBottom: 2 }}>过去分词 (P.P.) 🔊</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#14574D' }}>{currentCardVerb.pastParticiple}</div>
                <div style={{ fontSize: 10.5, color: '#8C7E6A', fontFamily: 'var(--font-geist-mono), monospace' }}>{IRREGULAR_VERB_IPA[currentCardVerb.id].pastParticiple}</div>
              </div>
            </div>

            {/* 朗读发音 */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <button
                type="button"
                onClick={(e) => handlePlayVerbAudio(currentCardVerb, e)}
                style={{
                  background: playingVerbId === currentCardVerb.id ? '#DCFCE7' : '#FFFFFF',
                  border: playingVerbId === currentCardVerb.id ? '1px solid #10B981' : '1px solid rgba(20,87,77,0.18)',
                  borderRadius: 999,
                  padding: '5px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: playingVerbId === currentCardVerb.id ? '#047857' : '#14574D',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                  boxShadow: playingVerbId === currentCardVerb.id ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none',
                }}
              >
                <SoundOutlined />
                <span>
                  {playingVerbId === currentCardVerb.id
                    ? playingFormStep === 'base'
                      ? '正在播报：原形…'
                      : playingFormStep === 'past'
                      ? '正在播报：过去式…'
                      : playingFormStep === 'pp'
                      ? '正在播报：过去分词…'
                      : '三态播放中…'
                    : '连读三态真人原声伴读'}
                </span>
              </button>
            </div>

            {/* 名师清晰讲解区（用户重点强调：讲解要清楚！） */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 1. 变位规律解析 */}
              <div style={{ background: '#FAF8F4', borderRadius: 12, padding: '10px 14px', borderLeft: '4px solid #14574D' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#14574D', marginBottom: 2 }}>
                  💡 变位规律解析：
                </div>
                <div style={{ fontSize: 12.5, color: '#3A2E1D', lineHeight: 1.5 }}>
                  {currentSection.ruleTip}
                </div>
              </div>

              {/* 2. 中考易错避坑 */}
              {currentCardVerb.tip && (
                <div style={{ background: '#FFF9F0', borderRadius: 12, padding: '10px 14px', borderLeft: '4px solid #D4A346' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#8A6517', marginBottom: 2 }}>
                    ⚠️ 词形易错点：
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6B491C', lineHeight: 1.5 }}>
                    {currentCardVerb.tip}
                  </div>
                </div>
              )}
            </div>
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
            <span>上一词</span>
          </button>

          <span style={{ fontSize: 12, color: '#A0937D' }}>
            {cardIndex + 1} / {currentDeckVerbs.length}
          </span>

          <button
            type="button"
            disabled={cardIndex === currentDeckVerbs.length - 1}
            onClick={(e) => { e.stopPropagation(); handleNextCard() }}
            style={{
              background: 'transparent',
              border: 0,
              cursor: cardIndex === currentDeckVerbs.length - 1 ? 'default' : 'pointer',
              color: cardIndex === currentDeckVerbs.length - 1 ? '#C4BDB5' : '#14574D',
              fontWeight: 700,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>下一词</span>
            <RightOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
      </div>

      {/* ===== 底部操作区：记错了 vs 记住了 ===== */}
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
          <span>记错了/看讲解</span>
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
          <span>记住了 · 下一词 ▶</span>
        </button>
      </div>
    </div>
  )
}
