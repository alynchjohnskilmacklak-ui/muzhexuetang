'use client'

import { useEffect, useMemo, useState } from 'react'
import { Select, Segmented, message } from 'antd'
import {
  DownloadOutlined,
  EyeOutlined,
  UserOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  FilePdfOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { GRADE_SUBJECTS } from '@/data/subjects'
import { fmtDate } from '@/lib/format-date'
import { materialFileLabel } from '@/lib/material-format'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { useRouter } from 'next/navigation'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { readParentChildPreference, rememberParentChild } from '@/lib/parent-child-preference'
import { getArchiveEntryTransitionName, runDocumentViewTransition } from '@/lib/ui-motion'

const MATERIAL_PREVIEW_KEY = 'muzhe-parent-material-preview'

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileType: string
  materialType: string
  description: string | null
  downloads?: number
  teacher?: { id: string; name: string } | null
  createdAt: string
}

type MaterialReturnState = {
  id?: string
  view?: 'list' | 'covers'
  selectedGrade?: string
  selectedSubject?: string
  selectedType?: string
  activeChildId?: string
}

const MATERIAL_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'TEXTBOOK', label: '同步课本' },
  { value: 'HANDOUT', label: '名师讲义' },
  { value: 'EXAM', label: '单元试卷' },
  { value: 'EXERCISE', label: '课后题库' },
  { value: 'ANSWER', label: '参考答案' },
] as const

// 雅致新国风典雅藏书色谱（低饱和度、高级质感）
const SUBJECT_BOOK_THEMES: Record<string, {
  name: string
  spine: string
  bg: string
  accent: string
  badgeBg: string
  badgeText: string
  icon: string
}> = {
  语文: {
    name: '语文',
    spine: '#103831',
    bg: 'linear-gradient(150deg, #1d5045 0%, #133931 52%, #0c2621 100%)',
    accent: '#C9A45C',
    badgeBg: 'rgba(201, 164, 92, 0.28)',
    badgeText: '#fcefc7',
    icon: '📖',
  },
  数学: {
    name: '数学',
    spine: '#132840',
    bg: 'linear-gradient(150deg, #1d436b 0%, #142e4d 52%, #0d1e33 100%)',
    accent: '#7ab8ff',
    badgeBg: 'rgba(122, 184, 255, 0.25)',
    badgeText: '#e1f0ff',
    icon: '📐',
  },
  英语: {
    name: '英语',
    spine: '#3d2711',
    bg: 'linear-gradient(150deg, #593d1f 0%, #3d2813 52%, #291a0c 100%)',
    accent: '#e6b56c',
    badgeBg: 'rgba(230, 181, 108, 0.25)',
    badgeText: '#fdf3de',
    icon: '🔤',
  },
  物理: {
    name: '物理',
    spine: '#172845',
    bg: 'linear-gradient(150deg, #25406d 0%, #182b4a 52%, #0f1c30 100%)',
    accent: '#82b1ff',
    badgeBg: 'rgba(130, 177, 255, 0.25)',
    badgeText: '#e8f1ff',
    icon: '⚡',
  },
  化学: {
    name: '化学',
    spine: '#103330',
    bg: 'linear-gradient(150deg, #1a4f4b 0%, #113633 52%, #0b2422 100%)',
    accent: '#64d8cb',
    badgeBg: 'rgba(100, 216, 203, 0.25)',
    badgeText: '#e0fbf7',
    icon: '🧪',
  },
  生物: {
    name: '生物',
    spine: '#12301c',
    bg: 'linear-gradient(150deg, #1e4d2f 0%, #13341e 52%, #0c2414 100%)',
    accent: '#81c784',
    badgeBg: 'rgba(129, 199, 132, 0.25)',
    badgeText: '#e8f5e9',
    icon: '🌱',
  },
  道德与法治: {
    name: '道德与法治',
    spine: '#3d1717',
    bg: 'linear-gradient(150deg, #5e2828 0%, #3f1919 52%, #2b0f0f 100%)',
    accent: '#ff8a80',
    badgeBg: 'rgba(255, 138, 128, 0.25)',
    badgeText: '#ffebee',
    icon: '⚖️',
  },
  历史: {
    name: '历史',
    spine: '#382314',
    bg: 'linear-gradient(150deg, #573a24 0%, #3b2616 52%, #26180c 100%)',
    accent: '#d7ccc8',
    badgeBg: 'rgba(215, 204, 200, 0.25)',
    badgeText: '#efebe9',
    icon: '🏛️',
  },
  地理: {
    name: '地理',
    spine: '#143026',
    bg: 'linear-gradient(150deg, #224d3e 0%, #163428 52%, #0e241b 100%)',
    accent: '#80cbc4',
    badgeBg: 'rgba(128, 203, 196, 0.25)',
    badgeText: '#e0f2f1',
    icon: '🌍',
  },
}

function getSubjectTheme(subject: string) {
  for (const [key, theme] of Object.entries(SUBJECT_BOOK_THEMES)) {
    if (subject.includes(key) || key.includes(subject)) return theme
  }
  return {
    name: subject,
    spine: '#143b35',
    bg: 'linear-gradient(150deg, #184841 0%, #123832 52%, #0d2723 100%)',
    accent: '#C9A45C',
    badgeBg: 'rgba(201, 164, 92, 0.25)',
    badgeText: '#fcefc7',
    icon: '📚',
  }
}

export default function ParentMaterialsPage() {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'covers'>('covers')
  const [selectedGrade, setSelectedGrade] = useState<string>('初一')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Array<{ id: string; name: string; grade: string | null }>>([])
  const [activeChildId, setActiveChildId] = useState('')

  // 默认选中当前孩子所在年级，严格按 id 与 name 双重去重，根除重复选项
  useEffect(() => {
    const resolveDefaultGrade = async () => {
      try {
        let returnState: MaterialReturnState | null = null
        try {
          const stored = sessionStorage.getItem(MATERIAL_PREVIEW_KEY)
          const parsed = stored ? JSON.parse(stored) as MaterialReturnState : null
          if (parsed?.id) {
            returnState = parsed
            sessionStorage.removeItem(MATERIAL_PREVIEW_KEY)
            if (parsed.view) setView(parsed.view)
            if (parsed.selectedSubject) setSelectedSubject(parsed.selectedSubject)
            if (parsed.selectedType) setSelectedType(parsed.selectedType)
          } else if (stored) {
            sessionStorage.removeItem(MATERIAL_PREVIEW_KEY)
          }
        } catch { /* Browser storage fallback */ }

        const requestedId = readParentChildPreference()
        const res = await fetch(`/api/parent/children${requestedId ? `?childId=${encodeURIComponent(requestedId)}` : ''}`)
        if (!res.ok) throw new Error('孩子信息加载失败')
        const data = await res.json()
        const rawList: Array<{ id: string; name: string; grade: string | null; membershipLevel?: string | null }> = data.children || []

        // 严格去重：相同姓名或相同ID只保留一条，消除重复选项
        const seenNames = new Set<string>()
        const seenIds = new Set<string>()
        const students: Array<{ id: string; name: string; grade: string | null; membershipLevel?: string | null }> = []
        for (const c of rawList) {
          if (!c?.id || !c?.name) continue
          const trimmedName = c.name.trim()
          if (seenNames.has(trimmedName) || seenIds.has(c.id)) continue
          seenNames.add(trimmedName)
          seenIds.add(c.id)
          students.push({
            ...c,
            name: trimmedName,
          })
        }

        if (!students.length) {
          setLoading(false)
          return
        }

        setChildren(students)
        const params = new URLSearchParams(window.location.search)
        const childId = returnState?.activeChildId
          || params.get('childId')
          || requestedId
          || (document.cookie.match(/(?:^|;\s*)mz_parent_active_child=([^;]*)/)?.[1] || '')
          || students[0].id

        const active = students.find((item) => item.id === childId) || students[0]
        rememberParentChild(active.id, active.membershipLevel)
        setActiveChildId(active.id)

        if (returnState?.selectedGrade) {
          setSelectedGrade(returnState.selectedGrade)
        } else if (active.grade) {
          setSelectedGrade(normalizeTextbookGrade(active.grade))
        }
      } catch {
        setLoading(false)
        message.error('孩子信息加载失败，请刷新页面重试')
      }
    }
    resolveDefaultGrade()
  }, [])

  // 切换孩子：直接与年级联动，不再需要多余的年级选择条
  const handleChildSelect = (childId: string) => {
    const child = children.find(c => c.id === childId)
    if (!child) return
    setActiveChildId(childId)
    rememberParentChild(childId)
    if (child.grade) {
      setSelectedGrade(normalizeTextbookGrade(child.grade))
      setSelectedSubject('')
    }
  }

  // 加载资料
  useEffect(() => {
    if (!selectedGrade) return
    const fetchMaterials = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ grade: selectedGrade })
        if (selectedSubject) params.set('subject', selectedSubject)
        if (selectedType) params.set('materialType', selectedType)
        const res = await fetch(`/api/parent/materials?${params.toString()}`)
        if (!res.ok) throw new Error('学习资料加载失败')
        const data = await res.json()
        setMaterials(data.materials || [])
      } catch {
        setMaterials([])
        message.error('学习资料加载失败，请稍后刷新重试')
      } finally {
        setLoading(false)
      }
    }
    fetchMaterials()
  }, [selectedGrade, selectedSubject, selectedType])

  const subjects = useMemo(() => {
    return GRADE_SUBJECTS[selectedGrade] || ['语文', '数学', '英语', '道德与法治', '历史', '地理', '生物']
  }, [selectedGrade])

  const activeChild = children.find(c => c.id === activeChildId)

  const handleView = (material: Material) => {
    const transitionName = getArchiveEntryTransitionName('material', material.id)
    const theme = getSubjectTheme(material.subject)
    let storageSaved = false
    try {
      sessionStorage.setItem(MATERIAL_PREVIEW_KEY, JSON.stringify({
        id: material.id,
        title: material.title,
        subject: material.subject,
        grade: material.grade,
        coverBackground: theme.bg,
        view,
        selectedGrade,
        selectedSubject,
        selectedType,
        activeChildId,
        transitionName,
      }))
      storageSaved = true
    } catch { /* fallback */ }

    const navigate = () => router.push(`/parent/materials/preview?id=${material.id}`)
    let navigationStarted = false
    const transitioned = storageSaved && runDocumentViewTransition(async () => {
      navigationStarted = true
      navigate()
      let frames = 0
      while (frames < 120) {
        if (document.querySelector(`[data-material-transition-ready="${material.id}"]`)) return
        frames += 1
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      }
    })
    if (!transitioned && !navigationStarted) navigate()
  }

  const handleDownload = (material: Material, e?: React.MouseEvent) => {
    e?.stopPropagation()
    window.open(`/api/materials/${material.id}/view?download=1`, '_blank')
  }

  return (
    <div className="clean-materials-page">
      {/* 
        【第1层：顶部主标题栏】
        左侧：页面主标题 + 年级同步徽标 (+ 单学员时优雅呈现学员标签)
        右侧：视图切换胶囊 (书架 / 列表)
      */}
      <header className="page-header">
        <div className="header-brand-wrap">
          <div className="title-row">
            <h1 className="main-title">学习资料</h1>
            <span className="grade-badge">{selectedGrade}同步</span>
            {children.length === 1 && activeChild && (
              <span className="single-child-badge">
                <UserOutlined />
                <span>{activeChild.name}</span>
              </span>
            )}
          </div>
          <p className="subtitle">老师精选课本 · 考点讲义 · 随堂试卷</p>
        </div>

        <div className="header-actions">
          {/* 紧凑双态视图切换按钮 */}
          <div className="view-switch-capsule">
            <button
              type="button"
              className={`view-opt ${view === 'covers' ? 'active' : ''}`}
              onClick={() => setView('covers')}
              aria-label="书架模式"
              title="切换为书架封面模式"
            >
              <AppstoreOutlined />
            </button>
            <button
              type="button"
              className={`view-opt ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              aria-label="列表模式"
              title="切换为清单列表模式"
            >
              <UnorderedListOutlined />
            </button>
          </div>
        </div>
      </header>

      {/* 
        【第2层：多学员专属切换胶囊栏（仅当学员数 > 1 时显示）】
        设计语言与题库练习页 100% 统一，保证全站体验一致
      */}
      {children.length > 1 && (
        <div className="materials-child-bar">
          <div className="child-bar-label">
            <span className="child-bar-icon"><UserOutlined /></span>
            <span>当前学员</span>
          </div>
          <Segmented
            size="middle"
            className="child-segmented"
            value={activeChildId}
            onChange={(val) => handleChildSelect(val as string)}
            options={children.map((c) => ({
              label: `${c.name} · ${c.grade ? normalizeTextbookGrade(c.grade) : '初中'}`,
              value: c.id,
            }))}
          />
        </div>
      )}

      {/* 
        【第2层：唯一的学科横向选择胶囊栏】
        全科横向滑动，选中状态为沉稳墨绿，无冗余多层背景
      */}
      <nav className="subject-scroll-bar" aria-label="选择科目">
        <button
          type="button"
          className={`subject-chip ${selectedSubject === '' ? 'active' : ''}`}
          onClick={() => setSelectedSubject('')}
        >
          全部科目
        </button>
        {subjects.map((s) => {
          const theme = getSubjectTheme(s)
          const isActive = selectedSubject === s
          return (
            <button
              key={s}
              type="button"
              className={`subject-chip ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedSubject(s)}
            >
              <span className="chip-icon">{theme.icon}</span>
              <span>{s}</span>
            </button>
          )
        })}
      </nav>

      {/* 
        【第3层：极轻量辅助栏】
        左侧：轻巧分类下拉（全部 / 课本 / 讲义 / 试卷）
        右侧：资料数量统计
      */}
      <div className="sub-filter-row">
        <div className="type-selector-wrap">
          <Select
            size="small"
            className="clean-type-select"
            value={selectedType}
            onChange={(val) => setSelectedType(val)}
            options={MATERIAL_TYPES.map(t => ({ label: t.label, value: t.value }))}
            popupMatchSelectWidth={false}
          />
        </div>

        <div className="count-hint">
          共 {materials.length} 份学习材料
        </div>
      </div>

      {/* 
        【第4层：主体内容呈现区】
        书架模式或列表模式，干净开阔，视觉中心突出
      */}
      <main className="content-area">
        {loading ? (
          view === 'covers' ? (
            <div className="grid-covers">
              {[0, 1, 2, 3].map((slot) => (
                <div className="skeleton-card" key={slot}>
                  <div className="skeleton-cover" />
                  <div className="skeleton-bar" />
                </div>
              ))}
            </div>
          ) : (
            <div className="list-rows">
              {[0, 1, 2, 3].map((slot) => (
                <div className="skeleton-row" key={slot}>
                  <div className="skeleton-thumb" />
                  <div className="skeleton-text">
                    <div className="skeleton-bar w-70" />
                    <div className="skeleton-bar w-40" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : materials.length === 0 ? (
          <div className="empty-box">
            <GuidedEmpty
              title={selectedSubject ? `暂无${selectedSubject}资料` : '当前分类暂无学习材料'}
              description={selectedSubject ? '老师上传对应科目讲义后将在此同步' : '老师准备好讲义和试卷后会展示在这里，帮助孩子课后复习'}
              actionLabel={selectedSubject ? '查看全部科目' : '去题库练习'}
              onAction={() => selectedSubject ? setSelectedSubject('') : router.push('/parent/practice')}
            />
          </div>
        ) : view === 'covers' ? (
          /* ================= 书架封面视图（典雅新国风书卷） ================= */
          <div className="grid-covers">
            {materials.map((material, idx) => {
              const theme = getSubjectTheme(material.subject)
              return (
                <article
                  key={material.id}
                  className="book-unit stagger-item"
                  style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                >
                  <div
                    className="book-jacket"
                    role="button"
                    tabIndex={0}
                    aria-label={`预览${material.title}`}
                    data-material-source={material.id}
                    style={{
                      background: theme.bg,
                      viewTransitionName: getArchiveEntryTransitionName('material', material.id),
                    } as React.CSSProperties}
                    onClick={() => handleView(material)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleView(material)
                      }
                    }}
                  >
                    {/* 书脊折痕与烫金线 */}
                    <div className="jacket-spine" style={{ background: theme.spine }} />
                    <div className="jacket-gold-line" style={{ background: theme.accent }} />

                    {/* 封面内封排版 */}
                    <div className="jacket-content">
                      <div className="jacket-head">
                        <span
                          className="subject-badge"
                          style={{ background: theme.badgeBg, color: theme.badgeText }}
                        >
                          {theme.icon} {material.subject}
                        </span>
                        <span className="format-badge">
                          {materialFileLabel(material.fileType)}
                        </span>
                      </div>

                      <div className="jacket-body">
                        <h2 className="book-heading">{material.title}</h2>
                      </div>

                      <div className="jacket-foot">
                        <span className="grade-tag">{material.grade}</span>
                        <span className="read-action">
                          翻阅 <RightOutlined style={{ fontSize: 9 }} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 封面底部简述条 */}
                  <div className="book-sub-bar">
                    <span className="teacher-info">
                      {material.teacher?.name || '任课老师'} · {fmtDate(material.createdAt)}
                    </span>
                    <button
                      type="button"
                      className="download-round-btn"
                      title={`下载 ${material.title}`}
                      onClick={(e) => handleDownload(material, e)}
                    >
                      <DownloadOutlined />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          /* ================= 资料列表视图（微拟物清单卡片） ================= */
          <div className="list-rows">
            {materials.map((material, idx) => {
              const theme = getSubjectTheme(material.subject)
              return (
                <div
                  key={material.id}
                  className="list-card stagger-item"
                  style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
                  onClick={() => handleView(material)}
                >
                  {/* 左侧迷你微型立体书脊 */}
                  <div className="micro-book" style={{ background: theme.bg }}>
                    <div className="micro-spine" style={{ background: theme.spine }} />
                    <span className="micro-icon">{theme.icon}</span>
                  </div>

                  <div className="card-center">
                    <h3 className="card-title">{material.title}</h3>
                    <div className="card-labels">
                      <span className="tag-grade">{material.grade}</span>
                      <span className="tag-subject" style={{ color: theme.accent, background: theme.badgeBg }}>
                        {material.subject}
                      </span>
                      <span className="tag-type">
                        <FilePdfOutlined /> {materialFileLabel(material.fileType)}
                      </span>
                      <span className="tag-date">
                        {material.teacher?.name || '任课老师'} · {fmtDate(material.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="card-btns">
                    <button
                      type="button"
                      className="preview-pill-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleView(material)
                      }}
                    >
                      <EyeOutlined /> 查阅
                    </button>
                    <button
                      type="button"
                      className="download-icon-btn"
                      title="下载材料"
                      onClick={(e) => handleDownload(material, e)}
                    >
                      <DownloadOutlined />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 页面专属精炼样式（彻底消除堆叠与挤压） */}
      <style jsx>{`
        .clean-materials-page {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 14px 16px 40px;
        }

        /* 顶部 Header */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 12px;
        }

        .header-brand-wrap {
          min-width: 0;
          flex: 1;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .main-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: #17352F;
          letter-spacing: -0.3px;
        }

        .grade-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(20, 87, 77, 0.08);
          color: #14574D;
          white-space: nowrap;
        }

        .single-child-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(20, 87, 77, 0.06);
          color: #14574D;
          white-space: nowrap;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 12px;
          color: #7A694F;
          white-space: normal;
          line-height: 1.4;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* 专属学员切换栏（多学员时展示，统一与题库练习页一致） */
        .materials-child-bar {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 8px 12px;
          border: 1px solid rgba(20, 87, 77, 0.1);
          box-shadow: 0 2px 8px rgba(20, 87, 77, 0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 10px;
        }

        .child-bar-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #14574D;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .child-bar-icon {
          font-size: 12px;
          color: #14574D;
          background: rgba(20, 87, 77, 0.08);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        :global(.child-segmented.ant-segmented) {
          background: #F4F1EA !important;
          padding: 3px !important;
          border-radius: 999px !important;
          max-width: 100% !important;
          overflow-x: auto !important;
          scrollbar-width: none !important;
        }

        :global(.child-segmented.ant-segmented::-webkit-scrollbar) {
          display: none !important;
        }

        :global(.child-segmented .ant-segmented-group) {
          display: flex !important;
          gap: 2px !important;
        }

        :global(.child-segmented .ant-segmented-item) {
          border-radius: 999px !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          color: #5A4E3A !important;
          padding: 3px 12px !important;
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
          white-space: nowrap !important;
        }

        :global(.child-segmented .ant-segmented-item-selected) {
          background: #14574D !important;
          color: #ffffff !important;
          border-radius: 999px !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 6px rgba(20, 87, 77, 0.22) !important;
        }

        :global(.child-segmented .ant-segmented-item:hover:not(.ant-segmented-item-selected)) {
          color: #14574D !important;
        }

        /* 视图切换胶囊 */
        .view-switch-capsule {
          display: flex;
          align-items: center;
          background: #f0eee9;
          border-radius: 999px;
          padding: 2px;
          gap: 2px;
        }

        .view-opt {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #7A6E58;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-opt.active {
          background: #FFFFFF;
          color: #14574D;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        }

        /* 学科横向滑动栏 */
        .subject-scroll-bar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 12px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .subject-scroll-bar::-webkit-scrollbar {
          display: none;
        }

        .subject-chip {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          border-radius: 999px;
          background: #FFFFFF;
          border: 1px solid rgba(20, 87, 77, 0.12);
          color: #5A4E3A;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(20, 87, 77, 0.03);
          touch-action: manipulation;
        }

        .subject-chip:hover {
          border-color: #14574D;
          color: #14574D;
        }

        .subject-chip.active {
          background: #14574D;
          border-color: #14574D;
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(20, 87, 77, 0.22);
        }

        .chip-icon {
          font-size: 13px;
        }

        /* 辅助筛选行 */
        .sub-filter-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 2px;
        }

        :global(.clean-type-select.ant-select) {
          font-size: 12.5px !important;
        }

        :global(.clean-type-select .ant-select-selector) {
          border-radius: 8px !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          background: #ffffff !important;
          padding: 0 10px !important;
          height: 28px !important;
        }

        .count-hint {
          font-size: 11.5px;
          color: #8A7E6B;
        }

        /* 内容区 */
        .content-area {
          min-height: 320px;
        }

        /* 书架网格 */
        .grid-covers {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px 14px;
        }

        .book-unit {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .book-jacket {
          position: relative;
          aspect-ratio: 3 / 4.15;
          border-radius: 10px 14px 14px 10px;
          box-shadow:
            0 10px 22px rgba(18, 48, 42, 0.18),
            0 2px 6px rgba(18, 48, 42, 0.08),
            inset -1px 0 0 rgba(255, 255, 255, 0.18);
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s ease;
          user-select: none;
        }

        .book-jacket:hover {
          transform: translateY(-3px);
          box-shadow:
            0 14px 28px rgba(18, 48, 42, 0.25),
            0 3px 8px rgba(18, 48, 42, 0.12);
        }

        .book-jacket:active {
          transform: scale(0.98);
        }

        .jacket-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 13px;
          border-radius: 10px 0 0 10px;
          opacity: 0.85;
          z-index: 2;
          box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.15);
        }

        .jacket-gold-line {
          position: absolute;
          left: 13px;
          top: 0;
          bottom: 0;
          width: 2px;
          opacity: 0.65;
          z-index: 2;
        }

        .jacket-content {
          position: absolute;
          inset: 0;
          padding: 16px 12px 12px 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          z-index: 1;
        }

        .jacket-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .subject-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          backdrop-filter: blur(4px);
        }

        .format-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }

        .jacket-body {
          margin: auto 0;
        }

        .book-heading {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.45;
          color: #ffffff;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .jacket-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .grade-tag {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.88);
          font-weight: 600;
        }

        .read-action {
          font-size: 11px;
          font-weight: 700;
          color: #fcefc7;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        .book-sub-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 7px;
          padding: 0 3px;
          gap: 6px;
        }

        .teacher-info {
          font-size: 11.5px;
          color: #8A7E6B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .download-round-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid rgba(20, 87, 77, 0.15);
          background: #ffffff;
          color: #14574D;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .download-round-btn:hover {
          background: #14574D;
          color: #ffffff;
        }

        /* 列表视图 */
        .list-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .list-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid rgba(20, 87, 77, 0.1);
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 6px rgba(20, 87, 77, 0.03);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .list-card:hover {
          border-color: #14574D;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(20, 87, 77, 0.07);
        }

        .micro-book {
          width: 38px;
          height: 48px;
          border-radius: 5px 7px 7px 5px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: -1px 2px 4px rgba(0, 0, 0, 0.15);
          flex-shrink: 0;
        }

        .micro-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          border-radius: 5px 0 0 5px;
          opacity: 0.85;
        }

        .micro-icon {
          font-size: 15px;
        }

        .card-center {
          flex: 1;
          min-width: 0;
        }

        .card-title {
          margin: 0 0 3px;
          font-size: 14px;
          font-weight: 800;
          color: #17352F;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-labels {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tag-grade {
          font-size: 10.5px;
          padding: 1px 5px;
          border-radius: 4px;
          background: #f0eee8;
          color: #695e4d;
          font-weight: 600;
        }

        .tag-subject {
          font-size: 10.5px;
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 700;
        }

        .tag-type {
          font-size: 10.5px;
          color: #8A7E6B;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        .tag-date {
          font-size: 10.5px;
          color: #999;
        }

        .card-btns {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .preview-pill-btn {
          border: 1px solid rgba(20, 87, 77, 0.2);
          background: #f4f8f7;
          color: #14574D;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: all 0.2s ease;
        }

        .preview-pill-btn:hover {
          background: #14574D;
          color: #ffffff;
        }

        .download-icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(20, 87, 77, 0.15);
          background: #ffffff;
          color: #14574D;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .download-icon-btn:hover {
          background: #14574D;
          color: #ffffff;
        }

        /* 骨架屏 */
        .skeleton-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .skeleton-cover {
          aspect-ratio: 3 / 4.15;
          border-radius: 12px;
          background: linear-gradient(90deg, #f0eee9 25%, #e6e3dc 50%, #f0eee9 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s infinite;
        }

        .skeleton-row {
          background: #ffffff;
          border-radius: 12px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .skeleton-thumb {
          width: 38px;
          height: 48px;
          border-radius: 6px;
          background: #eee8de;
        }

        .skeleton-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .skeleton-bar {
          height: 12px;
          border-radius: 4px;
          background: #eee8de;
        }

        .w-70 { width: 70%; }
        .w-40 { width: 40%; }

        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .empty-box {
          background: #ffffff;
          border-radius: 16px;
          border: 1px dashed rgba(20, 87, 77, 0.15);
          padding: 32px 16px;
          margin-top: 10px;
        }

        @media (max-width: 480px) {
          .clean-materials-page {
            padding: 12px 12px 36px;
          }

          .materials-child-bar {
            padding: 6px 10px;
            gap: 8px;
          }

          .child-bar-label span {
            font-size: 12px;
          }

          :global(.child-segmented .ant-segmented-item) {
            font-size: 12px !important;
            padding: 2px 9px !important;
          }

          .main-title {
            font-size: 18px;
          }

          .grid-covers {
            gap: 12px 10px;
          }

          .jacket-content {
            padding: 14px 10px 10px 18px;
          }

          .jacket-spine {
            width: 11px;
          }

          .jacket-gold-line {
            left: 11px;
          }

          .book-heading {
            font-size: 13.5px;
          }

          .tag-date {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
