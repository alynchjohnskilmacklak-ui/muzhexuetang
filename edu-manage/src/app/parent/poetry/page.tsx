'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircleOutlined,
  LeftOutlined,
  PauseCircleOutlined,
  ReadOutlined,
  SoundOutlined,
  TrophyOutlined,
  BulbOutlined,
  FireOutlined,
  StarFilled,
  TranslationOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { Button, Input, Modal, App } from 'antd'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'
import {
  OFFICIAL_POETRY_VOLUMES,
  OFFICIAL_POETRY_ITEMS,
  type OfficialVolumeMeta,
  type OfficialPoemItem,
} from '@/data/poetry/official-recitation-database'
import { POETRY_LEARNING_PACK_MAP } from '@/data/poetry/poetry-learning-pack'
import styles from './poetry.module.css'

const STORAGE_KEY = 'muzhe_poetry_mastery_map'

function ParentPoetryPageInner() {
  const { message } = App.useApp()
  // 当前视图阶段：'bookshelf'(6本分册) | 'catalog'(单册目录) | 'workbench'(单篇梯级伴背) | 'contextQuiz'(全册中考语境默写特训)
  const [viewMode, setViewMode] = useState<'bookshelf' | 'catalog' | 'workbench' | 'contextQuiz'>('bookshelf')
  
  // 当前选中的分册
  const [selectedBook, setSelectedBook] = useState<OfficialVolumeMeta>(OFFICIAL_POETRY_VOLUMES[0])
  // 当前正在背诵研习的诗篇
  const [activePoem, setActivePoem] = useState<OfficialPoemItem>(OFFICIAL_POETRY_ITEMS[0])

  // 篇目分类过滤 Tab: 'ALL' | 'IN_CLASS' | 'OUT_CLASS' | '53_MAIN'
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_CLASS' | 'OUT_CLASS' | '53_MAIN'>('ALL')

  // 篇目通关状态记录 (poemId -> 'DONE' | 'REVIEW')
  const [masteryMap, setMasteryMap] = useState<Record<string, 'DONE' | 'REVIEW'>>({
    'g7-1-001': 'DONE',
    'g7-1-002': 'REVIEW',
  })

  // 读取本地打卡缓存
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          setMasteryMap((prev) => ({ ...prev, ...parsed }))
        }
      }
    } catch {
      // 忽略存储读取异常
    }
  }, [])

  // 范读伴听播放状态
  const [isReciting, setIsReciting] = useState(false)
  const [recitingText, setRecitingText] = useState('')
  const [recitingIndex, setRecitingIndex] = useState<number>(-1)
  const recitingAudioRef = useRef<HTMLAudioElement | null>(null)
  const stopRecitingSignalRef = useRef(false)

  // 停止伴听
  const stopReciting = useCallback(() => {
    stopRecitingSignalRef.current = true
    if (recitingAudioRef.current) {
      recitingAudioRef.current.pause()
      recitingAudioRef.current.currentTime = 0
      recitingAudioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsReciting(false)
    setRecitingText('')
    setRecitingIndex(-1)
  }, [])

  // 篇目切换或离开工作台时自动停止
  useEffect(() => {
    stopReciting()
  }, [activePoem?.id, viewMode, stopReciting])

  // 播放单句古诗文音频（高保真同源名家 MP3 优先，无缝降级到浏览器语音合成）
  const playPoetryLineAudio = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (stopRecitingSignalRef.current) {
        resolve()
        return
      }

      const audio = new Audio(`/api/audio/poetry?text=${encodeURIComponent(text)}`)
      recitingAudioRef.current = audio

      const cleanup = () => {
        if (recitingAudioRef.current === audio) {
          recitingAudioRef.current = null
        }
        resolve()
      }

      audio.onended = cleanup

      const fallbackToTTS = () => {
        if (stopRecitingSignalRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
          cleanup()
          return
        }
        try {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = 'zh-CN'
          utterance.rate = 0.82
          utterance.pitch = 0.98
          utterance.onend = cleanup
          utterance.onerror = cleanup
          window.speechSynthesis.speak(utterance)
        } catch {
          cleanup()
        }
      }

      audio.onerror = fallbackToTTS

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(fallbackToTTS)
      }
    })
  }, [])

  // 开始全篇循序抑扬顿挫范读伴听
  const startReciting = useCallback(async () => {
    stopReciting()
    stopRecitingSignalRef.current = false
    setIsReciting(true)

    // 诗题、朝代、作者作为先导播报，后续为各诗句
    const pairs = POETRY_LEARNING_PACK_MAP[activePoem.title]?.sentencePairs || []
    const lines = pairs.length > 0
      ? pairs.map((p, idx) => ({ text: p.original, index: idx }))
      : activePoem.stanzas.map((s, idx) => ({ text: s, index: idx }))

    const queue: { text: string; index: number }[] = [
      { text: `${activePoem.title}。〔${activePoem.dynasty}〕${activePoem.author}。`, index: -1 },
      ...lines,
    ]

    for (let i = 0; i < queue.length; i++) {
      if (stopRecitingSignalRef.current) break
      const item = queue[i]
      setRecitingText(item.text)
      setRecitingIndex(item.index)
      await playPoetryLineAudio(item.text)
      if (stopRecitingSignalRef.current) break
      // 句间沉稳微顿
      await new Promise((r) => setTimeout(r, item.index === -1 ? 550 : 380))
    }

    if (!stopRecitingSignalRef.current) {
      stopReciting()
    }
  }, [activePoem, playPoetryLineAudio, stopReciting])

  // 单独试听某一联/句
  const playSingleLine = useCallback(async (lineText: string, idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    stopReciting()
    stopRecitingSignalRef.current = false
    setIsReciting(true)
    setRecitingText(lineText)
    setRecitingIndex(idx)
    await playPoetryLineAudio(lineText)
    if (!stopRecitingSignalRef.current) {
      stopReciting()
    }
  }, [playPoetryLineAudio, stopReciting])

  // 保存本地打卡缓存
  const updateMastery = (poemId: string, status: 'DONE' | 'REVIEW') => {
    setMasteryMap((prev) => {
      const next = { ...prev, [poemId]: status }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // 忽略写入异常
      }
      return next
    })
  }

  // 梯级背诵阶数：1. 全诗伴读 | 2. 隐易错字 | 3. 半隐名句 | 4. 盲背通关
  const [ladderStep, setLadderStep] = useState<1 | 2 | 3 | 4>(2)
  // 刮开查看的字索引集合
  const [revealedWordIndices, setRevealedWordIndices] = useState<Set<number>>(new Set())

  // 中考情境默写弹窗状态 (支持单篇多道真题独立作答)
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmittedMap, setQuizSubmittedMap] = useState<Record<number, boolean>>({})

  // 全册中考语境特训卷状态
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [contextQuizAnswer, setContextQuizAnswer] = useState('')
  const [contextQuizSubmitted, setContextQuizSubmitted] = useState(false)

  // 恭贺通关印章弹窗
  const [stampSuccessModal, setStampSuccessModal] = useState(false)

  // 研学交互模式：'vernacular'(文白对照) | 'puzzle'(点字成诗闯关) | 'couplet'(飞花对句) | 'ladder'(四阶递进伴背) | 'appreciation'(深度赏析)
  const [studyMode, setStudyMode] = useState<'vernacular' | 'puzzle' | 'couplet' | 'ladder' | 'appreciation'>('vernacular')

  // 文白对照视图切换：'pairs'(逐句对译) | 'full'(全篇白话) | 'notes'(课下生词详注)
  const [vernacularView, setVernacularView] = useState<'pairs' | 'full' | 'notes'>('pairs')

  // 点字成诗闯关游戏状态
  const [puzzleSelectedChars, setPuzzleSelectedChars] = useState<string[]>([])
  const [puzzleUsedIndices, setPuzzleUsedIndices] = useState<Set<number>>(new Set())
  const [puzzleSuccess, setPuzzleSuccess] = useState<boolean | null>(null)

  // 飞花对句状态 (支持全诗多联流转与智能同诗干扰)
  const [coupletSelectedOption, setCoupletSelectedOption] = useState<string | null>(null)
  const [coupletScore, setCoupletScore] = useState<number>(0)
  const [coupletIndex, setCoupletIndex] = useState<number>(0)
  const [coupletSeed, setCoupletSeed] = useState<number>(1)

  const handleMobileBack = useCallback(() => {
    if (quizModalOpen) {
      setQuizModalOpen(false)
      return true
    }
    if (stampSuccessModal) {
      setStampSuccessModal(false)
      return true
    }
    if (viewMode === 'catalog') {
      setViewMode('bookshelf')
      return true
    }
    if (viewMode === 'workbench' || viewMode === 'contextQuiz') {
      setViewMode('catalog')
      return true
    }
    return false
  }, [quizModalOpen, stampSuccessModal, viewMode])

  useMobileBackHandler(handleMobileBack)

  // 当前分册下的全部官方篇目
  const currentVolumePoems = useMemo(() => {
    return OFFICIAL_POETRY_ITEMS.filter(
      (p) => p.volume === selectedBook.volumeName
    )
  }, [selectedBook])

  // 当前篇目的课下注释与白话文知识包
  const currentLearningPack = useMemo(() => {
    return POETRY_LEARNING_PACK_MAP[activePoem.title]
  }, [activePoem])

  // 点字拼诗的目标句子与打乱字块
  const puzzleTargetSentence = useMemo(() => {
    const quote = activePoem.famousQuote || activePoem.stanzas[0] || '海日生残夜'
    const cleanQuote = quote.split(/[，。？！；：]/)[0] || quote
    return cleanQuote.trim()
  }, [activePoem])

  const puzzleCandidates = useMemo(() => {
    const chars = puzzleTargetSentence.split('').filter((c) => c.trim())
    const decoys = currentLearningPack?.gameDecoyChars?.slice(0, 2) || ['春', '风']
    const combined = [...chars, ...decoys]
    return combined.sort((a, b) => a.localeCompare(b) * -1 + 0.3)
  }, [puzzleTargetSentence, currentLearningPack])

  const handleTapPuzzleCandidate = (char: string, index: number) => {
    if (puzzleUsedIndices.has(index)) return
    if (puzzleSelectedChars.length >= puzzleTargetSentence.length) return

    setPuzzleSelectedChars((prev) => [...prev, char])
    setPuzzleUsedIndices((prev) => new Set([...prev, index]))
    setPuzzleSuccess(null)
  }

  const handleRemovePuzzleSlot = (slotIdx: number) => {
    if (slotIdx >= puzzleSelectedChars.length) return
    const newSelected = [...puzzleSelectedChars]
    newSelected.splice(slotIdx, 1)
    setPuzzleSelectedChars(newSelected)

    const newUsed = new Set<number>()
    const remainingToMatch = [...newSelected]
    puzzleCandidates.forEach((c, idx) => {
      const matchIdx = remainingToMatch.indexOf(c)
      if (matchIdx !== -1) {
        newUsed.add(idx)
        remainingToMatch.splice(matchIdx, 1)
      }
    })
    setPuzzleUsedIndices(newUsed)
    setPuzzleSuccess(null)
  }

  const handleResetPuzzle = () => {
    setPuzzleSelectedChars([])
    setPuzzleUsedIndices(new Set())
    setPuzzleSuccess(null)
  }

  const handleCheckPuzzle = () => {
    const assembled = puzzleSelectedChars.join('')
    if (assembled === puzzleTargetSentence) {
      setPuzzleSuccess(true)
      message.success('🎉 太棒了！一字不差，成功拼出名句！')
    } else {
      setPuzzleSuccess(false)
      message.error('⚠️ 诗句字序或选字存在偏差，请点击红字检查！')
    }
  }

  // 提取当前诗中的所有分句对（上句与下句，优先纳入千古名句，并提取全部分句供同篇干扰使用）
  const { poemCouplets, poemSegments } = useMemo(() => {
    const couplets: Array<{ prompt: string; answer: string }> = []
    const rawSegments: string[] = []

    // 1. 先从 stanzas 中提取所有纯净分句（去除任何标点）
    const stanzas = Array.isArray(activePoem.stanzas) ? activePoem.stanzas : []
    stanzas.forEach((line) => {
      line.split(/[，；。？！\n]/).forEach((seg) => {
        const s = seg.trim()
        if (s.length >= 2) rawSegments.push(s)
      })
    })

    // 2. 若有 famousQuote，优先拆分为千古名句联
    if (activePoem.famousQuote) {
      const fSegs = activePoem.famousQuote
        .split(/[，；。？！\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2)
      for (let i = 0; i < fSegs.length - 1; i += 2) {
        couplets.push({
          prompt: fSegs[i] + '，',
          answer: fSegs[i + 1] + '。',
        })
      }
    }

    // 3. 将全诗相邻分句成联依次纳入（避免重复）
    for (let i = 0; i < rawSegments.length - 1; i += 2) {
      const p1 = rawSegments[i] + '，'
      const p2 = rawSegments[i + 1] + '。'
      if (!couplets.some((c) => c.prompt === p1)) {
        couplets.push({ prompt: p1, answer: p2 })
      }
    }

    if (couplets.length === 0) {
      couplets.push({ prompt: '海日生残夜，', answer: '江春入旧年。' })
    }

    return { poemCouplets: couplets, poemSegments: rawSegments }
  }, [activePoem])

  const currentCouplet = useMemo(() => {
    return poemCouplets[coupletIndex % poemCouplets.length]
  }, [poemCouplets, coupletIndex])

  // 飞花对句选项生成（严格同诗优先、字数绝对对齐、伪随机打乱乱序，彻底杜绝一眼识破）
  const coupletPair = useMemo(() => {
    const correct = currentCouplet.answer
    const promptClean = currentCouplet.prompt.replace(/[，；。？！]$/, '').trim()
    const correctClean = correct.replace(/[，；。？！]$/, '').trim()
    const targetCharLen = correctClean.length // 汉字字数（例如《观沧海》为 4 字）

    // 1. 【同诗同篇优先】：从本首诗中严格筛选字数完全相同的其他分句（去除出题上句与正确下句）
    const samePoemDecoys = Array.from(
      new Set(
        poemSegments
          .filter((s) => s.length === targetCharLen && s !== promptClean && s !== correctClean)
          .map((s) => s + '。')
      )
    )

    // 2. 【分册篇目补齐】：若本诗同字数分句不足 3 个，严格从本册其他古诗词中挑选字数完全相同的分句
    const volumeDecoys: string[] = []
    if (samePoemDecoys.length < 3) {
      currentVolumePoems.forEach((p) => {
        if (p.id === activePoem.id) return
        p.stanzas.forEach((line) => {
          line.split(/[，；。？！\n]/).forEach((seg) => {
            const s = seg.trim()
            if (
              s.length === targetCharLen &&
              s !== promptClean &&
              s !== correctClean &&
              !samePoemDecoys.includes(s + '。') &&
              !volumeDecoys.includes(s + '。')
            ) {
              volumeDecoys.push(s + '。')
            }
          })
        })
      })
    }

    // 选取 3 个高迷惑度干扰项（同诗优先）
    const candidateDistractors = [...samePoemDecoys, ...volumeDecoys].slice(0, 3)

    // 若依然不足（极罕见），兜底生成同字数填充
    while (candidateDistractors.length < 3) {
      candidateDistractors.push(''.padStart(targetCharLen, '山') + '。')
    }

    // 组合为 4 个选项（包含 1 个正解和 3 个完全同字数的干扰项）
    const options = [correct, candidateDistractors[0], candidateDistractors[1], candidateDistractors[2]]

    // 执行充分离散的 Fisher-Yates 伪随机洗牌，确保正解随机均匀分布在 4 个位置
    const seed = (coupletSeed + 1) * 73 + (coupletIndex + 1) * 19 + 13
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor((((seed * (i * 37 + 11) + i * 29) % 1000) / 1000) * (i + 1))
      const temp = options[i]
      options[i] = options[j]
      options[j] = temp
    }

    return {
      prompt: currentCouplet.prompt,
      correct: correct,
      options: options,
      totalCouplets: poemCouplets.length,
      currentNumber: (coupletIndex % poemCouplets.length) + 1,
    }
  }, [currentCouplet, poemCouplets, poemSegments, currentVolumePoems, coupletSeed, coupletIndex, activePoem.id])

  // 根据分类过滤展示的篇目列表
  const filteredVolumePoems = useMemo(() => {
    if (activeFilter === 'IN_CLASS') {
      return currentVolumePoems.filter((p) => p.contentType.includes('课内'))
    }
    if (activeFilter === 'OUT_CLASS') {
      return currentVolumePoems.filter((p) => p.contentType.includes('课外') || p.textbookSection.includes('课外'))
    }
    if (activeFilter === '53_MAIN') {
      return currentVolumePoems.filter((p) => p.matchedTo53)
    }
    return currentVolumePoems
  }, [currentVolumePoems, activeFilter])

  // 当前分册汇聚的所有中考情境默写真题列表
  const volumeAllQuestions = useMemo(() => {
    const list: Array<{
      poemId: string
      poemTitle: string
      poemAuthor: string
      errorTrap: string
      maskedWords: OfficialPoemItem['maskedWords']
      prompt: string
      answer: string
      explanation: string
      source: string
      category: string
      trapWarning: string
    }> = []

    currentVolumePoems.forEach((poem) => {
      poem.quizQuestions.forEach((q) => {
        list.push({
          poemId: poem.id,
          poemTitle: poem.title,
          poemAuthor: poem.author,
          errorTrap: poem.errorTrap,
          maskedWords: poem.maskedWords,
          prompt: q.prompt,
          answer: q.answer,
          explanation: q.explanation,
          source: q.source || '统编初中核心考题',
          category: q.category || '中考真题',
          trapWarning: q.trapWarning || poem.errorTrap,
        })
      })
    })
    return list
  }, [currentVolumePoems])

  // 计算当前分册已通关篇数
  const doneCount = useMemo(() => {
    return currentVolumePoems.filter((p) => masteryMap[p.id] === 'DONE').length
  }, [currentVolumePoems, masteryMap])

  // 点击进入某本分册
  const handleSelectBook = (book: OfficialVolumeMeta) => {
    setSelectedBook(book)
    const firstPoem = OFFICIAL_POETRY_ITEMS.find(
      (p) => p.volume === book.volumeName
    )
    if (firstPoem) setActivePoem(firstPoem)
    setActiveFilter('ALL')
    setViewMode('catalog')
  }

  // 点击进入全册中考语境默写特训卷
  const handleOpenContextQuiz = () => {
    setCurrentQuizIndex(0)
    setContextQuizAnswer('')
    setContextQuizSubmitted(false)
    setViewMode('contextQuiz')
  }

  // 点击进入单篇伴背工作台
  const handleOpenWorkbench = (poem: OfficialPoemItem) => {
    setActivePoem(poem)
    setStudyMode('vernacular')
    setVernacularView('pairs')
    setLadderStep(2) // 默认进入最具特色的第2阶：隐易错字
    setRevealedWordIndices(new Set())
    setPuzzleSelectedChars([])
    setPuzzleUsedIndices(new Set())
    setPuzzleSuccess(null)
    setCoupletSelectedOption(null)
    setCoupletIndex(0)
    setCoupletSeed((prev) => prev + 1)
    setViewMode('workbench')
  }

  // 翻开刮字
  const handleToggleReveal = (index: number) => {
    setRevealedWordIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // 家长一键通关盖章打卡
  const handleParentStamp = (poemId: string) => {
    updateMastery(poemId, 'DONE')
    setStampSuccessModal(true)
  }

  // 提交单题中考默写题
  const handleCheckSingleQuiz = (qIdx: number) => {
    const ans = quizAnswers[qIdx] || ''
    if (!ans.trim()) {
      message.warning('请先输入你的默写答案')
      return
    }
    setQuizSubmittedMap((prev) => ({ ...prev, [qIdx]: true }))
    message.success('已完成情境默写核对！')
  }

  return (
    <PageLayout
      title="古诗文必背"
      subtitle="统编版初中语文 81 篇教材必背与课外诵读，四阶梯级隐字伴背与中考默写通关"
    >
      <div className={styles.container}>
        {/* =========================================================
            视图一：选择教材与年级分册 (6本立体书架，对齐英语)
            ========================================================= */}
        {viewMode === 'bookshelf' && (
          <>
            {/* 顶部宣纸印章横幅 */}
            <div className={styles.headerCard}>
              <div className={styles.headerSeal}>
                牧哲<br />文渊
              </div>
              <div className={styles.headerTitleRow}>
                <span className={styles.headerTitle}>初中古诗词通关</span>
                <span className={styles.headerTag}>统编教材同步</span>
              </div>
              <div className={styles.headerDesc}>
                全套精选初中七至九年级全 6 册教材 81 篇古诗词与课外诵读，支持梯级伴背与情境默写。
              </div>
            </div>

            {/* 标题说明 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#17352F', margin: 0 }}>
                选择教材与年级分册
              </h2>
              <span style={{ fontSize: 12, color: '#7A694F' }}>
                七至九年级全 6 册 · 人教统编版初中 81 篇古诗词权威题库
              </span>
            </div>

            {/* 6 本分册列表 */}
            <div className={styles.bookList}>
              {OFFICIAL_POETRY_VOLUMES.map((book) => {
                const isCurrent = selectedBook.key === book.key
                const isG7a = book.key === 'g7a'
                const bookDone = isCurrent ? doneCount : (isG7a ? 1 : 0)
                return (
                  <div
                    key={book.key}
                    onClick={() => handleSelectBook(book)}
                    className={`${styles.bookCard} ${isCurrent ? styles.bookCardSelected : ''}`}
                  >
                    <div className={styles.bookInfoWrap}>
                      <div className={styles.bookCover}>
                        {/* 真实统编语文课本封面 */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={book.coverImg}
                          alt={book.title}
                          className={styles.bookCoverImg}
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                        <div className={styles.bookCornerBadge}>{book.badge}</div>
                      </div>

                      <div className={styles.bookTextCol}>
                        <div className={styles.bookTitleRow}>
                          <h3 className={styles.bookTitle}>{book.title}</h3>
                          <span className={styles.bookTag}>{book.tag}</span>
                          {isCurrent && <span className={styles.currentStudyBadge}>当前学习</span>}
                        </div>
                        <div className={styles.bookSubtitle}>{book.subtitle}</div>
                        <div className={styles.bookMeta}>
                          <span>收录必背篇目 <strong>{book.count}</strong> 篇</span>
                          {bookDone > 0 && (
                            <span className={styles.donePill}>已通关 {bookDone}/{book.count}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={isCurrent ? styles.actionBtnPrimary : styles.actionBtnSecondary}
                    >
                      {isCurrent ? '进入背诵 ›' : '开始背诵 ›'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* =========================================================
            视图二：单册篇目目录流 (如七年级上册全部篇目)
            ========================================================= */}
        {viewMode === 'catalog' && (
          <>
            {/* 顶部面包屑与返回 */}
            <button
              type="button"
              onClick={() => setViewMode('bookshelf')}
              className="mobile-shell-back"
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#14574D',
                fontSize: 13,
                fontWeight: 700,
                padding: '4px 0',
              }}
            >
              <LeftOutlined /> 返回教材分册书架
            </button>

            {/* 分册通关看板 */}
            <div className={styles.volumeHeaderDock}>
              <div className={styles.volumeSummaryLeft}>
                <span className={styles.volumeBadgePill}>{selectedBook.tag}</span>
                <span className={styles.volumeHeaderTitle}>{selectedBook.title} · 诗卷进展</span>
                <span style={{ fontSize: 11, opacity: 0.9 }}>
                  已通关 {doneCount} 篇 · 共 {currentVolumePoems.length} 篇必背
                </span>
              </div>
              <div className={styles.volumeSummaryRight}>
                <div className={styles.volumeBigCount}>
                  {doneCount} <span style={{ fontSize: 13, fontWeight: 600 }}>/ {currentVolumePoems.length}</span>
                </div>
                <div className={styles.volumeCountSub}>
                  达成率 {Math.round((doneCount / Math.max(1, currentVolumePoems.length)) * 100)}%
                </div>
              </div>
            </div>

            {/* 中考情境默写特训横幅 (专项直达入口) */}
            <div className={styles.contextBanner} onClick={handleOpenContextQuiz}>
              <div className={styles.contextBannerLeft}>
                <div className={styles.contextBadgeIcon}>✍️</div>
                <div>
                  <div className={styles.contextBannerTitle}>中考语境默写特训卷</div>
                  <div className={styles.contextBannerSubtitle}>
                    汇聚本册全 {volumeAllQuestions.length} 道中考真题情境默写 · 智能诊断高危易错字
                  </div>
                </div>
              </div>
              <button type="button" className={styles.contextBannerBtn}>
                开启特训 ›
              </button>
            </div>

            {/* 篇目分类过滤 Tab */}
            <div className={styles.filterTabRow}>
              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === 'ALL' ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter('ALL')}
              >
                全部篇目 ({currentVolumePoems.length})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === 'IN_CLASS' ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter('IN_CLASS')}
              >
                课内古诗 ({currentVolumePoems.filter(p => p.contentType.includes('课内')).length})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === 'OUT_CLASS' ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter('OUT_CLASS')}
              >
                课外诵读 ({currentVolumePoems.filter(p => p.contentType.includes('课外') || p.textbookSection.includes('课外')).length})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${activeFilter === '53_MAIN' ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter('53_MAIN')}
              >
                53中考精选 ({currentVolumePoems.filter(p => p.matchedTo53).length})
              </button>
            </div>

            {/* 篇目列表卡片流 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                篇目列表（当前显示 {filteredVolumePoems.length} 篇）：
              </div>
              <span style={{ fontSize: 11.5, color: '#64748B' }}>
                按统编教材目录编排
              </span>
            </div>

            <div className={styles.poemList}>
              {filteredVolumePoems.map((poem) => {
                const status = masteryMap[poem.id]
                return (
                  <div
                    key={poem.id}
                    className={`${styles.poemCard} ${status === 'DONE' ? styles.poemCardDone : ''}`}
                  >
                    <div className={styles.poemHeadRow} onClick={() => handleOpenWorkbench(poem)}>
                      <div className={styles.poemTitleWrap}>
                        <span className={styles.poemTitleText}>《{poem.title}》</span>
                        <span className={styles.poemAuthorText}>
                          {poem.author} · {poem.dynasty}
                        </span>
                        {poem.printedPage && (
                          <span className={styles.pageBadge}>教材P{poem.printedPage}</span>
                        )}
                        {poem.matchedTo53 && (
                          <span className={styles.tag53}>53精选</span>
                        )}
                      </div>
                      {status === 'DONE' ? (
                        <span className={styles.tagDone}>
                          <CheckCircleOutlined /> 熟读成诵
                        </span>
                      ) : status === 'REVIEW' ? (
                        <span className={styles.tagReview}>⏱️ 需温故</span>
                      ) : (
                        <span className={styles.tagTodo}>待背诵</span>
                      )}
                    </div>

                    <div className={styles.poemQuoteBox} onClick={() => handleOpenWorkbench(poem)}>
                      {poem.famousQuote}
                    </div>

                    <div className={styles.metaTagDock} onClick={() => handleOpenWorkbench(poem)}>
                      <span className={styles.pillFocus}>{poem.textbookSection} · {poem.genre}</span>
                      {poem.keyNotes.length > 0 && (
                        <span className={styles.pillTrap}>含 {poem.keyNotes.length} 处教材重点词注</span>
                      )}
                    </div>

                    {/* 快捷操作底栏 */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px dashed #f1f5f9' }}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleOpenWorkbench(poem)}
                        style={{ flex: 1, background: '#14574D', borderRadius: 6, fontSize: 11.5 }}
                      >
                        四阶伴背研习 ›
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setActivePoem(poem)
                          setQuizAnswers({})
                          setQuizSubmittedMap({})
                          setQuizModalOpen(true)
                        }}
                        style={{ flex: 1, borderColor: '#3B82F6', color: '#1D4ED8', borderRadius: 6, fontSize: 11.5, background: '#EFF6FF' }}
                      >
                        中考默写 ({poem.quizQuestions.length})
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* =========================================================
            视图三：单篇沉浸式伴背研习台 (四阶梯级隐字伴背)
            ========================================================= */}
        {viewMode === 'workbench' && (
          <>
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className="mobile-shell-back"
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#14574D',
                fontSize: 13,
                fontWeight: 700,
                padding: '4px 0',
              }}
            >
              <LeftOutlined /> 返回《{selectedBook.title}》篇目列表
            </button>

            <div className={styles.workbenchCard}>
              <div className={styles.wbHead}>
                <div>
                  <div className={styles.wbTitle}>{activePoem.title}</div>
                  <div className={styles.wbAuthor}>
                    〔{activePoem.dynasty}〕{activePoem.author} · {activePoem.genre}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={isReciting ? stopReciting : startReciting}
                  style={{
                    border: isReciting ? '1.5px solid #10B981' : '1px solid rgba(20, 87, 77, 0.25)',
                    background: isReciting ? '#DCFCE7' : '#EAF4F1',
                    color: isReciting ? '#065F46' : '#14574D',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.2s ease',
                    boxShadow: isReciting ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                  title={isReciting ? '点击停止伴读' : '点击开启名家抑扬顿挫范读'}
                >
                  {isReciting ? (
                    <>
                      <PauseCircleOutlined style={{ color: '#059669', fontSize: 13 }} />
                      <span>正在伴听 (点击停止)</span>
                    </>
                  ) : (
                    <>
                      <SoundOutlined />
                      <span>范读伴听</span>
                    </>
                  )}
                </button>
              </div>

              {/* 伴听实时动态播放状态条 */}
              {isReciting && (
                <div
                  style={{
                    margin: '10px 0 14px',
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #E0F2FE 100%)',
                    borderRadius: 12,
                    padding: '8px 14px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>🔊</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#047857', fontWeight: 700 }}>
                        {recitingIndex === -1 ? '正在播报：诗题与作者' : `正在范读：第 ${recitingIndex + 1} 联/句`}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#064E3B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {recitingText}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={stopReciting}
                    style={{
                      border: '1px solid rgba(6, 95, 70, 0.2)',
                      background: '#FFFFFF',
                      color: '#065F46',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    停止
                  </button>
                </div>
              )}

              {/* 研学方式五大模式导航 */}
              <div className={styles.studyModeNav}>
                <button
                  type="button"
                  className={`${styles.studyModeTab} ${studyMode === 'vernacular' ? styles.studyModeTabActive : ''}`}
                  onClick={() => setStudyMode('vernacular')}
                >
                  <TranslationOutlined /> 文白对译
                </button>
                <button
                  type="button"
                  className={`${styles.studyModeTab} ${studyMode === 'puzzle' ? styles.studyModeTabActive : ''}`}
                  onClick={() => {
                    setStudyMode('puzzle')
                    handleResetPuzzle()
                  }}
                >
                  <StarFilled style={{ color: studyMode === 'puzzle' ? '#FEF08A' : '#CA8A04' }} /> 点字拼诗
                </button>
                <button
                  type="button"
                  className={`${styles.studyModeTab} ${studyMode === 'couplet' ? styles.studyModeTabActive : ''}`}
                  onClick={() => {
                    setStudyMode('couplet')
                    setCoupletSelectedOption(null)
                  }}
                >
                  <FireOutlined style={{ color: studyMode === 'couplet' ? '#FDA4AF' : '#E11D48' }} /> 飞花挑战
                </button>
                <button
                  type="button"
                  className={`${styles.studyModeTab} ${studyMode === 'ladder' ? styles.studyModeTabActive : ''}`}
                  onClick={() => setStudyMode('ladder')}
                >
                  <ReadOutlined /> 梯级伴背
                </button>
                <button
                  type="button"
                  className={`${styles.studyModeTab} ${studyMode === 'appreciation' ? styles.studyModeTabActive : ''}`}
                  onClick={() => setStudyMode('appreciation')}
                >
                  <BulbOutlined /> 深度赏析
                </button>
              </div>

              {/* =========================================================
                  模式一：文白对照与课下生词精读
                  ========================================================= */}
              {studyMode === 'vernacular' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* 子视图切换胶囊 */}
                  <div style={{ display: 'flex', gap: 6, background: '#FAF7F2', padding: 3, borderRadius: 8 }}>
                    <button
                      type="button"
                      onClick={() => setVernacularView('pairs')}
                      style={{
                        flex: 1,
                        all: 'unset',
                        textAlign: 'center',
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '5px 0',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: vernacularView === 'pairs' ? '#14574D' : 'transparent',
                        color: vernacularView === 'pairs' ? '#FFFFFF' : '#78716C',
                      }}
                    >
                      📖 逐句图文对译
                    </button>
                    <button
                      type="button"
                      onClick={() => setVernacularView('full')}
                      style={{
                        flex: 1,
                        all: 'unset',
                        textAlign: 'center',
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '5px 0',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: vernacularView === 'full' ? '#14574D' : 'transparent',
                        color: vernacularView === 'full' ? '#FFFFFF' : '#78716C',
                      }}
                    >
                      📜 全篇白话大意
                    </button>
                    <button
                      type="button"
                      onClick={() => setVernacularView('notes')}
                      style={{
                        flex: 1,
                        all: 'unset',
                        textAlign: 'center',
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '5px 0',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: vernacularView === 'notes' ? '#14574D' : 'transparent',
                        color: vernacularView === 'notes' ? '#FFFFFF' : '#78716C',
                      }}
                    >
                      ✍️ 课下生词详注 ({currentLearningPack?.detailedNotes?.length || 0})
                    </button>
                  </div>

                  {/* 逐句图文对照 */}
                  {vernacularView === 'pairs' && (
                    <div className={styles.vernacularCardList}>
                      {currentLearningPack?.sentencePairs?.map((pair, idx) => (
                        <div
                          key={`${pair.original}-${idx}`}
                          className={styles.sentencePairCard}
                          style={{
                            border: isReciting && recitingIndex === idx ? '2px solid #10B981' : undefined,
                            background: isReciting && recitingIndex === idx ? '#F0FDF4' : undefined,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div className={styles.sentenceOrigRow}>
                            <span>{pair.original}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={(e) => playSingleLine(pair.original, idx, e)}
                                style={{
                                  background: isReciting && recitingIndex === idx ? '#DCFCE7' : 'rgba(20, 87, 77, 0.08)',
                                  border: isReciting && recitingIndex === idx ? '1px solid #10B981' : '1px solid rgba(20, 87, 77, 0.18)',
                                  color: isReciting && recitingIndex === idx ? '#047857' : '#14574D',
                                  borderRadius: 999,
                                  padding: '2px 8px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                                title="点击试听本句范读"
                              >
                                <SoundOutlined style={{ fontSize: 11 }} />
                                <span>{isReciting && recitingIndex === idx ? '播报中' : '领读'}</span>
                              </button>
                              <span style={{ fontSize: 11, color: '#A8A29E', fontWeight: 600 }}>第 {idx + 1} 联/句</span>
                            </div>
                          </div>
                          <div className={styles.sentenceTransRow}>
                            <strong>【译】：</strong>{pair.translation}
                          </div>
                          {pair.notes && (
                            <div className={styles.sentenceNotesRow}>
                              <strong>【课下注】：</strong>{pair.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 全篇白话畅读 */}
                  {vernacularView === 'full' && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px', lineHeight: 1.8, fontSize: 14, color: '#334155' }}>
                      <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📜 《{activePoem.title}》现代白话文全译：</span>
                      </div>
                      <p style={{ margin: 0, textIndent: '2em' }}>
                        {currentLearningPack?.vernacularFull}
                      </p>
                    </div>
                  )}

                  {/* 课下生词详注卡片 */}
                  {vernacularView === 'notes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentLearningPack?.detailedNotes?.map((note) => (
                        <div
                          key={note.term}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 10,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#1C1917', fontFamily: '"Songti SC", serif' }}>
                              {note.term} {note.pinyin && <span style={{ fontSize: 11, color: '#0284C7', fontFamily: 'sans-serif' }}>({note.pinyin})</span>}
                            </span>
                            {note.type && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '1px 6px', borderRadius: 4 }}>
                                {note.type}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
                            {note.meaning}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================
                  模式二：趣味点字成诗闯关挑战 (字块乱序重组)
                  ========================================================= */}
              {studyMode === 'puzzle' && (
                <div className={styles.gameBoardCard}>
                  <div className={styles.gameTargetGuide}>
                    🌟 挑战目标：请在下方依次点击汉字气泡，拼出千古名句
                  </div>

                  {/* 成诗目标槽位展示 */}
                  <div className={styles.targetSlotsRow}>
                    {Array.from({ length: puzzleTargetSentence.length }).map((_, slotIdx) => {
                      const char = puzzleSelectedChars[slotIdx]
                      return (
                        <div
                          key={`slot-${slotIdx}`}
                          className={`${styles.slotCell} ${char ? styles.slotCellFilled : ''}`}
                          onClick={() => handleRemovePuzzleSlot(slotIdx)}
                          title="点击可撤销此字"
                        >
                          {char || ''}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ fontSize: 11, color: '#A8A29E' }}>
                    💡 提示：点击已填字块可单独撤销；池中藏有干扰错别字，切勿选错哦！
                  </div>

                  {/* 候选字气泡池 */}
                  <div className={styles.bubblePoolRow}>
                    {puzzleCandidates.map((char, cIdx) => {
                      const isUsed = puzzleUsedIndices.has(cIdx)
                      return (
                        <button
                          key={`${char}-${cIdx}`}
                          type="button"
                          className={`${styles.charBubbleBtn} ${isUsed ? styles.charBubbleUsed : ''}`}
                          onClick={() => handleTapPuzzleCandidate(char, cIdx)}
                          disabled={isUsed}
                        >
                          {char}
                        </button>
                      )
                    })}
                  </div>

                  {/* 核验与重置按钮 */}
                  <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 6 }}>
                    <Button
                      style={{ flex: 1, borderRadius: 10 }}
                      onClick={handleResetPuzzle}
                      icon={<UndoOutlined />}
                    >
                      清空重来
                    </Button>
                    <Button
                      type="primary"
                      style={{ flex: 2, background: '#14574D', borderRadius: 10, fontWeight: 700 }}
                      onClick={handleCheckPuzzle}
                      disabled={puzzleSelectedChars.length === 0}
                    >
                      一键核验成诗 ({puzzleSelectedChars.length}/{puzzleTargetSentence.length})
                    </Button>
                  </div>

                  {/* 成功或失败反馈卡片 */}
                  {puzzleSuccess !== null && (
                    <div
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: puzzleSuccess ? '#F0FDF4' : '#FEF2F2',
                        border: `1.5px solid ${puzzleSuccess ? '#86EFAC' : '#FCA5A5'}`,
                        textAlign: 'center',
                      }}
                    >
                      {puzzleSuccess ? (
                        <>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#15803D' }}>
                            🎉 ⭐⭐⭐ 满星通关！成诗完全正确！
                          </div>
                          <div style={{ fontSize: 13, color: '#166534', marginTop: 4, fontFamily: '"Songti SC", serif' }}>
                            【标准名句】：<strong>{puzzleTargetSentence}</strong>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#15803D', marginTop: 4 }}>
                            已牢固掌握诗句字序与字形，中考默写不丢分！
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#B91C1C' }}>
                            ⚠️ 拼出的诗句存在偏差，请点击红字撤销并重新选择！
                          </div>
                          <div style={{ fontSize: 12, color: '#991B1B', marginTop: 4 }}>
                            防错提示：{activePoem.errorTrap}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================
                  模式三：名句飞花对决挑战 (上句对下句抢答)
                  ========================================================= */}
              {/* =========================================================
                  模式三：名句飞花对决挑战 (上句对下句抢答 · 同诗对仗)
                  ========================================================= */}
              {studyMode === 'couplet' && (
                <div className={styles.coupletCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#E11D48', background: '#FFE4E6', padding: '2px 8px', borderRadius: 999 }}>
                        🪶 飞花名句对接挑战
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', background: '#E0F2FE', padding: '2px 8px', borderRadius: 999 }}>
                        《{activePoem.title}》第 {coupletPair.currentNumber} / {coupletPair.totalCouplets} 联
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#78716C' }}>
                      当前得分：<strong style={{ color: '#E11D48' }}>{coupletScore}</strong> 分
                    </span>
                  </div>

                  <div className={styles.coupletPromptBox}>
                    上句出题：【 {coupletPair.prompt} 】
                  </div>

                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    👉 请点击选择与之对接的正确下半句（选项均精选自同一首诗，杜绝一眼识别）：
                  </div>

                  <div className={styles.coupletOptionGrid}>
                    {coupletPair.options.map((opt) => {
                      const isSelected = coupletSelectedOption === opt
                      const isCorrect = opt === coupletPair.correct
                      let optClass = styles.coupletOptionBtn
                      if (coupletSelectedOption) {
                        if (isCorrect) optClass += ` ${styles.coupletOptionCorrect}`
                        else if (isSelected) optClass += ` ${styles.coupletOptionWrong}`
                      }

                      return (
                        <button
                          key={opt}
                          type="button"
                          className={optClass}
                          onClick={() => {
                            if (coupletSelectedOption) return
                            setCoupletSelectedOption(opt)
                            if (opt === coupletPair.correct) {
                              setCoupletScore((prev) => prev + 10)
                              message.success('🎉 对仗工稳！回答正确 +10分！')
                            } else {
                              message.error('⚠️ 选项有误，请注意区分同一首诗中的其他名句！')
                            }
                          }}
                        >
                          <span>{opt}</span>
                          {coupletSelectedOption && isCorrect && <span>✅ 正解</span>}
                          {coupletSelectedOption && isSelected && !isCorrect && <span>❌ 干扰句</span>}
                        </button>
                      )
                    })}
                  </div>

                  {coupletSelectedOption && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                      <div>
                        <strong>标准对联：</strong>
                        <span style={{ color: '#15803D', fontWeight: 800, fontFamily: '"Songti SC", serif', fontSize: 13.5 }}>
                          {coupletPair.prompt}{coupletPair.correct}
                        </span>
                      </div>
                      <div style={{ marginTop: 4 }}>💡 <strong>名句考法解析：</strong>{activePoem.examFocus}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => {
                            setCoupletSelectedOption(null)
                            setCoupletIndex((prev) => prev + 1)
                            setCoupletSeed((prev) => prev + 1)
                          }}
                          style={{ flex: 2, background: '#14574D', fontWeight: 700 }}
                        >
                          下一联对决 ({coupletPair.currentNumber < coupletPair.totalCouplets ? coupletPair.currentNumber + 1 : 1}/{coupletPair.totalCouplets}) ›
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setCoupletSelectedOption(null)
                            setCoupletSeed((prev) => prev + 1)
                          }}
                          style={{ flex: 1 }}
                        >
                          打乱重测本联
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================
                  模式四：四阶递进伴背 (保留经典梯度伴读)
                  ========================================================= */}
              {studyMode === 'ladder' && (
                <>
                  {/* 四阶梯级切换胶囊 */}
                  <div className={styles.ladderNav}>
                    <button
                      type="button"
                      className={`${styles.ladderTab} ${ladderStep === 1 ? styles.ladderTabActive : ''}`}
                      onClick={() => setLadderStep(1)}
                    >
                      1. 全文伴读
                    </button>
                    <button
                      type="button"
                      className={`${styles.ladderTab} ${ladderStep === 2 ? styles.ladderTabActive : ''}`}
                      onClick={() => setLadderStep(2)}
                    >
                      2. 隐易错字
                    </button>
                    <button
                      type="button"
                      className={`${styles.ladderTab} ${ladderStep === 3 ? styles.ladderTabActive : ''}`}
                      onClick={() => setLadderStep(3)}
                    >
                      3. 半隐名句
                    </button>
                    <button
                      type="button"
                      className={`${styles.ladderTab} ${ladderStep === 4 ? styles.ladderTabActive : ''}`}
                      onClick={() => setLadderStep(4)}
                    >
                      4. 盲背通关
                    </button>
                  </div>

                  {/* 宣纸古风诗卷内容区 */}
                  {ladderStep === 4 ? (
                    <div className={`${styles.scrollPaper} ${styles.blindModeBox}`}>
                      <div className={styles.blindEyeIcon}>🙈</div>
                      <div>全文字迹已隐入宣纸底层</div>
                      <div style={{ fontSize: 12, color: '#A89F91', marginTop: 4 }}>
                        请闭眼大声流利背诵全诗；背诵完成后点击下方【家长通关打卡】或【中考默写检验】
                      </div>
                      <Button
                        size="small"
                        style={{ marginTop: 14 }}
                        onClick={() => setLadderStep(1)}
                      >
                        展开全文对照核验
                      </Button>
                    </div>
                  ) : (
                    <div className={styles.scrollPaper}>
                      {activePoem.stanzas.map((line, lineIdx) => {
                        // 第 3 阶：半隐下半句
                        if (ladderStep === 3 && lineIdx % 2 === 1) {
                          const isRevealed = revealedWordIndices.has(lineIdx + 100)
                          return (
                            <div key={line} style={{ margin: '4px 0' }}>
                              <span
                                onClick={() => handleToggleReveal(lineIdx + 100)}
                                style={{
                                  background: isRevealed ? '#FEF08A' : '#E7DECF',
                                  color: isRevealed ? '#B45309' : '#8A6517',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  borderBottom: isRevealed ? 'none' : '2px dashed #8A6517',
                                  cursor: 'pointer',
                                  display: 'inline-block',
                                }}
                              >
                                {isRevealed ? line : '【下半句隐藏 · 点击刮开提示】'}
                              </span>
                            </div>
                          )
                        }

                        // 第 2 阶：隐易错字
                        let renderedLine: React.ReactNode = line
                        if (ladderStep === 2 && activePoem.maskedWords.length > 0) {
                          const parts: React.ReactNode[] = []
                          let cursor = 0
                          activePoem.maskedWords.forEach((mw, mwIdx) => {
                            const wordPos = line.indexOf(mw.word, cursor)
                            if (wordPos !== -1) {
                              if (wordPos > cursor) parts.push(line.slice(cursor, wordPos))
                              const isRevealed = revealedWordIndices.has(mwIdx)
                              parts.push(
                                <span
                                  key={`${mw.word}-${mwIdx}`}
                                  onClick={() => handleToggleReveal(mwIdx)}
                                  className={`${styles.maskWord} ${isRevealed ? styles.maskWordRevealed : ''}`}
                                  title={mw.trapReason}
                                >
                                  {isRevealed ? mw.word : '？'}
                                </span>
                              )
                              cursor = wordPos + mw.word.length
                            }
                          })
                          if (cursor < line.length) parts.push(line.slice(cursor))
                          renderedLine = parts.length > 0 ? parts : line
                        }

                        return (
                          <div key={line} style={{ margin: '3px 0' }}>
                            {renderedLine}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 考点与易错字提醒 */}
                  <div
                    style={{
                      background: '#FAF7F2',
                      border: '1px solid #EAE3D2',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 12,
                      color: '#57534E',
                      lineHeight: 1.6,
                    }}
                  >
                    <div>
                      🎯 <strong>中考常考：</strong>
                      {activePoem.examFocus}
                    </div>
                    <div style={{ marginTop: 2, color: '#BE123C' }}>
                      ⚠️ <strong>防错警示：</strong>
                      {activePoem.errorTrap}
                    </div>
                    {activePoem.printedPage && (
                      <div style={{ marginTop: 2, color: '#0369A1' }}>
                        📖 <strong>统编教材出处：</strong>
                        人教统编版 · 印刷页第 {activePoem.printedPage} 页（{activePoem.textbookSection}）
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* =========================================================
                  模式五：中考深度赏析 (全解全析)
                  ========================================================= */}
              {studyMode === 'appreciation' && (
                <div className={styles.appreciationBox}>
                  <div className={styles.appreciationSectionItem}>
                    <div className={styles.appreciationLabel}>
                      <span>🏛️ 文学常识与作者背景</span>
                    </div>
                    <div className={styles.appreciationContent}>
                      {currentLearningPack?.appreciation?.authorInfo}
                      <div style={{ marginTop: 4, color: '#64748B' }}>
                        {currentLearningPack?.appreciation?.background}
                      </div>
                    </div>
                  </div>

                  <div className={styles.appreciationSectionItem}>
                    <div className={styles.appreciationLabel}>
                      <span>🎨 诗眼与艺术特色赏析</span>
                    </div>
                    <div className={styles.appreciationContent}>
                      {currentLearningPack?.appreciation?.artisticFeature}
                    </div>
                  </div>

                  <div className={styles.appreciationSectionItem}>
                    <div className={styles.appreciationLabel}>
                      <span>💡 篇章主旨与思想情感</span>
                    </div>
                    <div className={styles.appreciationContent}>
                      {currentLearningPack?.appreciation?.mainTheme}
                    </div>
                  </div>

                  <div className={styles.appreciationSectionItem}>
                    <div className={styles.appreciationLabel}>
                      <span>🎯 中考命题导向与答题公式</span>
                    </div>
                    <div className={styles.appreciationContent} style={{ background: '#FFFBEB', borderColor: '#FEF3C7', color: '#92400E' }}>
                      {currentLearningPack?.appreciation?.examStrategy}
                    </div>
                  </div>
                </div>
              )}

              {/* 行动操作区 */}
              <div className={styles.actionDeck}>
                <button
                  type="button"
                  className={styles.btnParentStamp}
                  onClick={() => handleParentStamp(activePoem.id)}
                >
                  <TrophyOutlined />
                  <span>家长伴听：孩子背诵熟练，一键通关打卡</span>
                </button>
                <button
                  type="button"
                  className={styles.btnQuizEnter}
                  onClick={() => {
                    setQuizAnswers({})
                    setQuizSubmittedMap({})
                    setQuizModalOpen(true)
                  }}
                >
                  <ReadOutlined />
                  <span>中考真题情境默写检验 ({activePoem.quizQuestions.length}题) ›</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* =========================================================
            视图四：全册中考语境默写特训卷实战工作台
            ========================================================= */}
        {viewMode === 'contextQuiz' && volumeAllQuestions.length > 0 && (() => {
          const currentQ = volumeAllQuestions[currentQuizIndex]
          const isCorrect = contextQuizSubmitted && 
            contextQuizAnswer.trim().replace(/[，。？！；：、“”‘’\s]/g, '') === 
            currentQ.answer.trim().replace(/[，。？！；：、“”‘’\s]/g, '')

          return (
            <>
              {/* 返回目录 */}
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className="mobile-shell-back"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#14574D',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '4px 0',
                }}
              >
                <LeftOutlined /> 返回《{selectedBook.title}》篇目列表
              </button>

              <div className={styles.quizCardMain}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div className={styles.quizIndexBadge}>
                      <span>中考语境真题</span>
                      <span>第 {currentQuizIndex + 1} / {volumeAllQuestions.length} 题</span>
                    </div>
                    {currentQ.source && (
                      <span className={styles.examSourceBadge}>
                        🏛️ {currentQ.source}
                      </span>
                    )}
                    {currentQ.category && (
                      <span className={styles.examCategoryBadge}>
                        🎯 {currentQ.category}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A' }}>
                    选自《{currentQ.poemTitle}》· {currentQ.poemAuthor}
                  </span>
                </div>

                {/* 题干展示 */}
                <div className={styles.quizQuestionPrompt}>
                  {currentQ.prompt}
                </div>

                {/* 输入答题区 */}
                <div className={styles.quizInputSection}>
                  <div className={styles.quizInputGuide}>
                    <span>✍️ 请在下方默写诗句（支持键盘键入或语音转文字）：</span>
                    <span style={{ color: '#94A3B8' }}>共约 {currentQ.answer.length} 字</span>
                  </div>

                  <Input.TextArea
                    rows={3}
                    placeholder="在此输入空缺的名句…"
                    value={contextQuizAnswer}
                    onChange={(e) => setContextQuizAnswer(e.target.value)}
                    disabled={contextQuizSubmitted}
                    style={{
                      borderRadius: 10,
                      fontSize: 15,
                      lineHeight: 1.6,
                      fontFamily: '"Songti SC", "SimSun", serif',
                      borderColor: '#93C5FD',
                    }}
                  />
                </div>

                {/* 结果比对面板 */}
                {contextQuizSubmitted && (
                  <div className={`${styles.quizResultPanel} ${isCorrect ? styles.quizResultCorrect : styles.quizResultWrong}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14 }}>
                      {isCorrect ? (
                        <span style={{ color: '#15803D' }}>🎉 恭喜！字迹完全正确，一分未丢！</span>
                      ) : (
                        <span style={{ color: '#B91C1C' }}>⚠️ 默写存在字词出入，请对照复查：</span>
                      )}
                    </div>

                    <div className={styles.quizAnswerCompare}>
                      <div>
                        <strong>标准名句：</strong>
                        <span className={styles.standardAnswerText}>{currentQ.answer}</span>
                      </div>
                      {!isCorrect && contextQuizAnswer && (
                        <div style={{ marginTop: 4, color: '#991B1B' }}>
                          <strong>你的作答：</strong>
                          <span>{contextQuizAnswer}</span>
                        </div>
                      )}
                      <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>
                        💡 <strong>中考考法解析：</strong>{currentQ.explanation}
                      </div>
                    </div>

                    {/* 易错字丢分警示 */}
                    {(currentQ.trapWarning || currentQ.errorTrap) && (
                      <div className={styles.trapWarningBox}>
                        <span className={styles.trapWarningIcon}>⚠️</span>
                        <div>
                          <strong>中考防错字警示（防丢分铁律）：</strong>
                          {currentQ.trapWarning || currentQ.errorTrap}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 底部按钮栏 */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  {!contextQuizSubmitted ? (
                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={() => {
                        if (!contextQuizAnswer.trim()) {
                          message.warning('请先输入你的默写答案')
                          return
                        }
                        setContextQuizSubmitted(true)
                      }}
                      style={{ background: '#1D4ED8', borderRadius: 10, fontWeight: 700 }}
                    >
                      核对答案 · 诊断易错字
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="large"
                        onClick={() => {
                          setContextQuizAnswer('')
                          setContextQuizSubmitted(false)
                        }}
                        style={{ borderRadius: 10 }}
                      >
                        再默一次
                      </Button>
                      {currentQuizIndex < volumeAllQuestions.length - 1 ? (
                        <Button
                          type="primary"
                          size="large"
                          block
                          onClick={() => {
                            setCurrentQuizIndex((prev) => prev + 1)
                            setContextQuizAnswer('')
                            setContextQuizSubmitted(false)
                          }}
                          style={{ background: '#1D4ED8', borderRadius: 10, fontWeight: 700 }}
                        >
                          下一题 ({currentQuizIndex + 2}/{volumeAllQuestions.length}) ›
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          size="large"
                          block
                          onClick={() => {
                            message.success('已完成全册中考语境默写特训！')
                            setViewMode('catalog')
                          }}
                          style={{ background: '#15803D', borderRadius: 10, fontWeight: 700 }}
                        >
                          🎉 特训卷作答完毕 · 返回目录
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )
        })()}

        {/* 弹窗：中考情境默写通关检验 (真实中考题型与防错警示) */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>中考情境默写真题检验 · 《{activePoem.title}》</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '1px 7px', borderRadius: 999 }}>
                共 {activePoem.quizQuestions.length} 道精选真题
              </span>
            </div>
          }
          open={quizModalOpen}
          onCancel={() => setQuizModalOpen(false)}
          footer={null}
          width={620}
          centered
        >
          <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}>
            {activePoem.quizQuestions.map((q, qIdx) => {
              const isSubmitted = Boolean(quizSubmittedMap[qIdx])
              const currentInput = quizAnswers[qIdx] || ''
              const isCorrect = isSubmitted &&
                currentInput.trim().replace(/[，。？！；：、“”‘’\s]/g, '') ===
                q.answer.trim().replace(/[，。？！；：、“”‘’\s]/g, '')

              return (
                <div
                  key={q.prompt}
                  style={{
                    background: '#FAFAF9',
                    border: '1px solid #E7E5E4',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 14,
                  }}
                >
                  {/* 题号与中考真题来源标签 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#1C1917' }}>
                        第 {qIdx + 1} 题
                      </span>
                      {q.source && (
                        <span className={styles.examSourceBadge}>
                          🏛️ {q.source}
                        </span>
                      )}
                      {q.category && (
                        <span className={styles.examCategoryBadge}>
                          🎯 {q.category}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#A8A29E' }}>
                      约 {q.answer.length} 字
                    </span>
                  </div>

                  {/* 题干 */}
                  <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65, marginBottom: 10 }}>
                    {q.prompt}
                  </div>

                  {/* 输入与核对按钮 */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Input
                      placeholder="请在横线处默写诗句…"
                      value={currentInput}
                      onChange={(e) => {
                        const val = e.target.value
                        setQuizAnswers((prev) => ({ ...prev, [qIdx]: val }))
                      }}
                      disabled={isSubmitted}
                      style={{
                        borderRadius: 8,
                        fontFamily: '"Songti SC", "SimSun", serif',
                        fontSize: 14,
                      }}
                      onPressEnter={() => {
                        if (!isSubmitted) handleCheckSingleQuiz(qIdx)
                      }}
                    />
                    {!isSubmitted ? (
                      <Button
                        type="primary"
                        onClick={() => handleCheckSingleQuiz(qIdx)}
                        style={{ background: '#14574D', borderRadius: 8, fontWeight: 700 }}
                      >
                        核对
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setQuizSubmittedMap((prev) => ({ ...prev, [qIdx]: false }))
                        }}
                        style={{ borderRadius: 8 }}
                      >
                        重作
                      </Button>
                    )}
                  </div>

                  {/* 提交后比对与防错警示 */}
                  {isSubmitted && (
                    <div
                      style={{
                        background: isCorrect ? '#F0FDF4' : '#FEF2F2',
                        border: `1px solid ${isCorrect ? '#86EFAC' : '#FCA5A5'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ fontWeight: 800, color: isCorrect ? '#15803D' : '#DC2626', marginBottom: 4 }}>
                        {isCorrect ? '🎉 默写准确无误，字迹与标点完全符合中考规范！' : '⚠️ 默写存在偏差，中考阅卷错一字扣全分，请对照标答：'}
                      </div>
                      <div style={{ color: '#166534', lineHeight: 1.6 }}>
                        <strong>【标准诗句】：</strong>
                        <span style={{ fontWeight: 800, fontFamily: '"Songti SC", serif', fontSize: 13.5 }}>
                          {q.answer}
                        </span>
                      </div>
                      {!isCorrect && currentInput && (
                        <div style={{ color: '#991B1B', marginTop: 2, lineHeight: 1.6 }}>
                          <strong>【你的输入】：</strong>
                          <span>{currentInput}</span>
                        </div>
                      )}
                      <div style={{ marginTop: 4, color: '#475569', lineHeight: 1.5 }}>
                        💡 <strong>解析与考向：</strong>{q.explanation}
                      </div>

                      {/* 丢分防错警示 */}
                      {(q.trapWarning || activePoem.errorTrap) && (
                        <div
                          style={{
                            marginTop: 6,
                            background: '#FFFBEB',
                            border: '1px solid #FEF08A',
                            borderRadius: 6,
                            padding: '6px 8px',
                            color: '#92400E',
                            fontSize: 11.5,
                            lineHeight: 1.5,
                          }}
                        >
                          ⚠️ <strong>防错字警示：</strong>{q.trapWarning || activePoem.errorTrap}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
            <Button
              style={{ flex: 1, borderRadius: 8 }}
              onClick={() => setQuizModalOpen(false)}
            >
              稍后继续练习
            </Button>
            <Button
              type="primary"
              style={{ flex: 2, background: '#14574D', borderRadius: 8, fontWeight: 700 }}
              onClick={() => {
                setQuizModalOpen(false)
                handleParentStamp(activePoem.id)
              }}
            >
              <TrophyOutlined style={{ marginRight: 4 }} />
              家长核验通过 · 加盖通关印章
            </Button>
          </div>
        </Modal>

        {/* 弹窗：通关加盖金石朱文篆刻印章 */}
        <Modal
          open={stampSuccessModal}
          onCancel={() => setStampSuccessModal(false)}
          footer={null}
          centered
        >
          <div className={styles.stampCelebration}>
            <div className={styles.bigSeal}>
              熟读<br />成诵
            </div>
            <h3 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800, color: '#451a03' }}>
              恭贺通关《{activePoem.title}》！
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#78716c', textAlign: 'center', lineHeight: 1.6 }}>
              家长已核验通关，该篇目已点亮入库，成长档案与作业背诵记录已同步更新！
            </p>
            <Button
              type="primary"
              onClick={() => {
                setStampSuccessModal(false)
                setViewMode('catalog')
              }}
              style={{ background: '#14574D', marginTop: 14 }}
            >
              返回篇目目录
            </Button>
          </div>
        </Modal>
      </div>
    </PageLayout>
  )
}

export default function ParentPoetryPage() {
  return (
    <App>
      <ParentPoetryPageInner />
    </App>
  )
}
