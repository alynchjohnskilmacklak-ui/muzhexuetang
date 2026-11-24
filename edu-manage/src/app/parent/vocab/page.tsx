'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { App } from 'antd'
import { CheckCircleOutlined, LeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'
import { readParentChildPreference, rememberParentChild } from '@/lib/parent-child-preference'
import { EnglishHub } from './_components/EnglishHub'
import type { VocabCatalog, VocabQuestion, VocabSubmissionResult } from './_components/types'
import styles from './vocab.module.css'

function VocabModuleLoading() {
  return (
    <div className={styles.page}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <CardSkeleton rows={3} />
      </div>
    </div>
  )
}

const VerbMasteryHub = dynamic(
  () => import('./_components/VerbMasteryHub').then((module) => module.VerbMasteryHub),
  { loading: VocabModuleLoading },
)
const GrammarHub = dynamic(
  () => import('./_components/GrammarHub').then((module) => module.GrammarHub),
  { loading: VocabModuleLoading },
)
const CompositionHub = dynamic(
  () => import('./_components/CompositionHub').then((module) => module.CompositionHub),
  { loading: VocabModuleLoading },
)
const GradeBookshelf = dynamic(
  () => import('./_components/GradeBookshelf').then((module) => module.GradeBookshelf),
  { loading: VocabModuleLoading },
)
const VocabHome = dynamic(
  () => import('./_components/VocabHome').then((module) => module.VocabHome),
  { loading: VocabModuleLoading },
)
const DeckSession = dynamic(
  () => import('./_components/DeckSession').then((module) => module.DeckSession),
  { loading: VocabModuleLoading },
)
const ReviewStack = dynamic(
  () => import('./_components/ReviewStack').then((module) => module.ReviewStack),
  { loading: VocabModuleLoading },
)

interface Child {
  id: string
  name: string
  grade: string | null
  membershipLevel?: string | null
}

type Stage = 'hub' | 'bookshelf' | 'vocab' | 'deck' | 'review' | 'result' | 'verbs' | 'grammar' | 'composition'

function ParentVocabPageInner() {
  const { message } = App.useApp()
  const [children, setChildren] = useState<Child[]>([])
  const [activeChildId, setActiveChildId] = useState('')
  const [catalog, setCatalog] = useState<VocabCatalog | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [stage, setStage] = useState<Stage>('hub')
  const [deckQuestions, setDeckQuestions] = useState<VocabQuestion[]>([])
  const [deckScope, setDeckScope] = useState<'new' | 'review'>('new')
  const [deckUnit, setDeckUnit] = useState<string | null>(null)
  const [reviewQuestions, setReviewQuestions] = useState<VocabQuestion[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{ correct: number; total: number; wrong: number } | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  useEffect(() => {
    if (stage !== 'deck' && stage !== 'review') return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [stage])

  const [selectedGrade, setSelectedGrade] = useState<string>('初一')
  const [selectedVolume, setSelectedVolume] = useState<string>('上册')

  const loadCatalog = useCallback(async (childId: string, grade: string, volume: string) => {
    if (!childId) {
      setCatalog(null)
      setCatalogLoading(false)
      return
    }
    setCatalogLoading(true)
    try {
      const params = new URLSearchParams({ studentId: childId, grade, volume })
      const res = await fetch(`/api/parent/vocab?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '加载失败')
      setCatalog(data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '词表加载失败，请稍后重试')
      setCatalog(null)
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const loadChildren = async () => {
      try {
        const requestedId = readParentChildPreference()
        const res = await fetch(`/api/parent/children${requestedId ? `?childId=${encodeURIComponent(requestedId)}` : ''}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '加载失败')
        const rawList: Child[] = data.children || []
        const seenIds = new Set<string>()
        const seenNames = new Set<string>()
        const list = rawList.filter((child) => {
          if (!child?.id || !child?.name) return false
          if (seenIds.has(child.id) || seenNames.has(child.name)) return false
          seenIds.add(child.id)
          seenNames.add(child.name)
          return true
        })
        setChildren(list)
        const selected = list.find((child) => child.id === data.activeChildId) || list[0]
        const selectedId = selected?.id || ''
        setActiveChildId(selectedId)
        let initialGrade = '初一'
        if (selected) {
          rememberParentChild(selected.id, selected.membershipLevel)
          if (selected.grade) {
            initialGrade = selected.grade.includes('初二') ? '初二' : selected.grade.includes('初三') ? '初三' : '初一'
            setSelectedGrade(initialGrade)
          }
        }
        await loadCatalog(selectedId, initialGrade, '上册')
      } catch {
        setCatalogLoading(false)
        message.error('孩子信息加载失败，请刷新页面后重试')
      }
    }
    loadChildren()
  }, [loadCatalog])

  const handleChildChange = (id: string) => {
    const child = children.find((item) => item.id === id)
    setActiveChildId(id)
    if (child) rememberParentChild(child.id, child.membershipLevel)
    void loadCatalog(id, selectedGrade, selectedVolume)
  }

  const fetchDeck = useCallback(async (scope: 'new' | 'review', unit: string | null): Promise<VocabQuestion[]> => {
    const params = new URLSearchParams({
      studentId: activeChildId,
      scope,
      grade: selectedGrade,
      volume: selectedVolume,
      limit: '16',
    })
    if (unit) params.set('unit', unit)
    const res = await fetch(`/api/parent/vocab/deck?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '题目生成失败')
    return data.questions ?? []
  }, [activeChildId, selectedGrade, selectedVolume])

  const startDeck = useCallback(async (unit: string | null, scope: 'new' | 'review') => {
    if (!activeChildId) {
      message.warning('请先选择孩子')
      return
    }
    try {
      const questions = await fetchDeck(scope, unit)
      if (questions.length === 0) {
        message.info(scope === 'review' ? '复习池暂时为空，去背几组新单词吧' : '该单元暂时没有可练习的单词')
        return
      }
      setDeckQuestions(questions)
      setDeckScope(scope)
      setDeckUnit(unit)
      setStage('deck')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '题目生成失败，请稍后重试')
    }
  }, [activeChildId, fetchDeck])

  const finishDeck = useCallback(async (results: VocabSubmissionResult[]) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const submissionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `vocab-${Date.now()}`
      const res = await fetch('/api/parent/vocab/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeChildId,
          grade: selectedGrade,
          volume: selectedVolume,
          unit: deckUnit,
          scope: deckScope,
          submissionId,
          results,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')
      const total = data.total ?? results.length
      const correct = data.correct ?? total - (data.wrongIds?.length ?? 0)
      setLastResult({ correct, total, wrong: total - correct })

      const review = await fetchDeck('review', null)
      setReviewQuestions(review)
      setStage(review.length > 0 ? 'review' : 'result')
      void loadCatalog(activeChildId, selectedGrade, selectedVolume)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '练习记录保存失败，请保留作答后重试')
    } finally {
      setSubmitting(false)
    }
  }, [activeChildId, selectedGrade, selectedVolume, deckUnit, deckScope, submitting, fetchDeck, loadCatalog])

  const backHome = useCallback(() => {
    setStage('vocab')
    setLastResult(null)
    setDeckQuestions([])
    setReviewQuestions([])
    void loadCatalog(activeChildId, selectedGrade, selectedVolume)
  }, [activeChildId, selectedGrade, selectedVolume, loadCatalog])

  const handleMobileBack = useCallback(() => {
    if (stage === 'vocab') {
      setStage('bookshelf')
      return true
    }
    if (stage === 'bookshelf') {
      setStage('hub')
      return true
    }
    if (stage === 'deck' || stage === 'result') {
      backHome()
      return true
    }
    if (stage === 'review') {
      setStage('result')
      return true
    }
    if (stage === 'verbs' || stage === 'grammar' || stage === 'composition') {
      setStage('hub')
      return true
    }
    return false
  }, [backHome, stage])

  useMobileBackHandler(handleMobileBack)

  const handleSelectModule = (mod: 'vocab' | 'verbs' | 'grammar' | 'composition') => {
    if (mod === 'vocab') {
      setStage('bookshelf')
      return
    }
    setStage(mod)
  }

  const handleSelectBookFromBookshelf = (grade: string, volume: string) => {
    setSelectedGrade(grade)
    setSelectedVolume(volume)
    void loadCatalog(activeChildId, grade, volume)
    setStage('vocab')
  }

  const activeChild = children.find((c) => c.id === activeChildId)

  if (stage === 'verbs') {
    return (
      <VerbMasteryHub
        onBack={() => setStage('hub')}
        studentName={activeChild?.name}
        studentId={activeChildId}
      />
    )
  }

  if (stage === 'grammar') {
    return (
      <GrammarHub
        onBack={() => setStage('hub')}
        studentName={activeChild?.name}
        studentId={activeChildId}
      />
    )
  }

  if (stage === 'composition') {
    return (
      <CompositionHub
        onBack={() => setStage('hub')}
        studentName={activeChild?.name}
        studentId={activeChildId}
      />
    )
  }

  if (stage === 'deck') {
    return portalRoot ? createPortal(
      <div className={styles.studyScreen} role="dialog" aria-modal="true" aria-label="背单词练习">
        <DeckSession
          questions={deckQuestions}
          scope={deckScope}
          unit={deckUnit}
          onFinish={finishDeck}
          onQuit={backHome}
        />
      </div>,
      portalRoot,
    ) : null
  }

  if (stage === 'review') {
    return portalRoot ? createPortal(
      <div className={styles.studyScreen} role="dialog" aria-modal="true" aria-label="错词复习">
        <ReviewStack questions={reviewQuestions} onDone={() => setStage('result')} onQuit={() => setStage('result')} />
      </div>,
      portalRoot,
    ) : null
  }

  if (stage === 'result') {
    return (
      <div className={styles.page}>
        <div className={styles.resultBanner}>
          <div className={styles.resultIcon}><CheckCircleOutlined /></div>
          <p className={styles.resultTitle}>本次练习完成</p>
          <p className={styles.resultMeta}>
            共 {lastResult?.total ?? 0} 个单词，答对 {lastResult?.correct ?? 0} 个
            {lastResult && lastResult.wrong > 0 ? `，${lastResult.wrong} 个已进入复习池` : ''}
          </p>
          <div className={styles.resultActions}>
            {reviewQuestions.length > 0 && (
              <button type="button" className={styles.primaryBtn} onClick={() => setStage('review')}>
                <ReloadOutlined /> 继续复习
              </button>
            )}
            <button type="button" className={`${styles.ghostBtn} mobile-shell-back`} onClick={backHome}>
              <LeftOutlined /> 返回单词列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'hub') {
    return (
      <EnglishHub
        childList={children}
        activeChildId={activeChildId}
        onChildChange={handleChildChange}
        catalog={catalog}
        selectedGrade={selectedGrade}
        selectedVolume={selectedVolume}
        onSelectModule={handleSelectModule}
      />
    )
  }

  if (stage === 'bookshelf') {
    return (
      <GradeBookshelf
        catalog={catalog}
        currentGrade={selectedGrade}
        currentVolume={selectedVolume}
        onBack={() => setStage('hub')}
        onSelectBook={handleSelectBookFromBookshelf}
      />
    )
  }

  return (
    <VocabHome
      catalog={catalog}
      loading={catalogLoading}
      selectedGrade={selectedGrade}
      selectedVolume={selectedVolume}
      onBack={() => setStage('bookshelf')}
      onStart={startDeck}
    />
  )
}

export default function ParentVocabPage() {
  return (
    <App>
      <ParentVocabPageInner />
    </App>
  )
}
