'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import useSWR from 'swr'
import {
  Button,
  Input,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import {
  BookFilled,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextFilled,
  FolderFilled,
  FolderOpenFilled,
  PlusOutlined,
  SearchOutlined,
  StarFilled,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { fmtDate } from '@/lib/format-date'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'
import {
  materialAudienceText,
  materialFileLabel,
} from '@/lib/material-format'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { BrandModal } from '@/components/Common/BrandModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { resolveTier, TIER_APP, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'

const { Text } = Typography

type TabKey = 'all' | 'student' | 'teacher' | 'mine'

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileType: string
  description: string | null
  audience: string
  source: string
  status: string
  tags: string[]
  teacherId: string | null
  downloads: number
  createdAt: string
  uploader?: { name: string | null }
  teacher?: { id: string; name: string } | null
}

const FILE_TYPE_STYLE: Record<string, { color: string; bg: string }> = {
  pdf: { color: '#DC2626', bg: '#FEE2E2' },
  word: { color: '#2563EB', bg: '#DBEAFE' },
  doc: { color: '#2563EB', bg: '#DBEAFE' },
  docx: { color: '#2563EB', bg: '#DBEAFE' },
  ppt: { color: '#D97706', bg: '#FEF3C7' },
  pptx: { color: '#D97706', bg: '#FEF3C7' },
  excel: { color: '#059669', bg: '#D1FAE5' },
  xls: { color: '#059669', bg: '#D1FAE5' },
  xlsx: { color: '#059669', bg: '#D1FAE5' },
}

const AUDIENCE_STYLE: Record<string, { color: string; bg: string }> = {
  STUDENT: { color: '#059669', bg: '#ECFDF5' },
  TEACHER: { color: '#4F46E5', bg: '#EEF2FF' },
  BOTH: { color: '#D97706', bg: '#FFFBEB' },
}

function rgbaFromHex(hex: string | undefined, alpha: number) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(232,120,74,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getFileStyle(material: Pick<Material, 'fileType' | 'fileName'>) {
  const ext = material.fileName?.split('.').pop()?.toLowerCase() || ''
  return FILE_TYPE_STYLE[material.fileType] || FILE_TYPE_STYLE[ext] || { color: '#4B5563', bg: '#F3F4F6' }
}

function bookCoverStyle(subject: string) {
  const hex = SUBJECT_COLORS[subject] || '#8A6F5C'
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return { background: 'linear-gradient(160deg,#9C7B62 0%,#6E5340 100%)' }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const darken = (n: number) => Math.round(n * 0.62)
  const bright = (n: number) => Math.min(255, Math.round(n * 1.14 + 18))
  return {
    background: `linear-gradient(160deg, rgb(${bright(r)},${bright(g)},${bright(b)}) 0%, rgb(${r},${g},${b}) 46%, rgb(${darken(r)},${darken(g)},${darken(b)}) 100%)`,
  }
}

function softTagStyle(color?: string) {
  return {
    color: color || '#5a4e3a',
    backgroundColor: rgbaFromHex(color, 0.10),
    border: `1px solid ${rgbaFromHex(color, 0.20)}`,
  }
}

function audienceTagStyle(audience: string) {
  const style = AUDIENCE_STYLE[audience] || AUDIENCE_STYLE.BOTH
  return {
    color: style.color,
    backgroundColor: style.bg,
    border: `1px solid ${style.bg}`,
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TeacherMaterialsPage() {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('all')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [keyword, setKeyword] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'word' | 'download'>('pdf')

  // 获取教师身份与专属梯队主题
  const { data: dashData } = useSWR<{ teacher?: { id: string; name: string; tierLevel?: string | null } }>(
    '/api/teacher/dashboard',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const tierTheme = TIER_THEME[currentTier]
  const appTheme = TIER_APP[currentTier]

  // 梯队动态专属风格
  const tierVisual = useMemo(() => {
    switch (currentTier) {
      case 'MANAGER':
        return {
          gradient: 'linear-gradient(135deg, #241A5E 0%, #4C3FA8 55%, #6B5DC2 100%)',
          shadow: '0 12px 30px rgba(76, 63, 168, 0.32)',
          subColor: '#E2D9F4',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#E2D9F4',
          badgeBorder: 'rgba(226, 217, 244, 0.28)',
          accentColor: '#4C3FA8',
          goldColor: '#FDE68A',
          bannerTag: `🛡️ ${tierTheme.label} · 教学资源库`,
        }
      case 'ELITE':
        return {
          gradient: 'linear-gradient(135deg, #061A17 0%, #0D3732 55%, #18524B 100%)',
          shadow: '0 12px 30px rgba(13, 55, 50, 0.38)',
          subColor: '#F6E9C8',
          badgeBg: 'rgba(201, 164, 92, 0.24)',
          badgeFg: '#F6E9C8',
          badgeBorder: 'rgba(201, 164, 92, 0.38)',
          accentColor: '#0D3732',
          goldColor: '#C9A45C',
          bannerTag: `👑 ${tierTheme.label} · 教学资源库`,
        }
      case 'SENIOR':
        return {
          gradient: 'linear-gradient(135deg, #0B2923 0%, #14574D 55%, #1E7E6F 100%)',
          shadow: '0 12px 30px rgba(20, 87, 77, 0.35)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#14574D',
          goldColor: '#F3D98F',
          bannerTag: `⭐ ${tierTheme.label} · 教学资源库`,
        }
      case 'EXPERIENCED':
        return {
          gradient: 'linear-gradient(135deg, #103B31 0%, #267461 55%, #38957E 100%)',
          shadow: '0 12px 30px rgba(38, 116, 97, 0.32)',
          subColor: '#CCFBF1',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#99F6E4',
          badgeBorder: 'rgba(153, 246, 228, 0.25)',
          accentColor: '#267461',
          goldColor: '#FDE68A',
          bannerTag: `🌿 ${tierTheme.label} · 教学资源库`,
        }
      case 'NEW':
      default:
        return {
          gradient: 'linear-gradient(135deg, #174233 0%, #3D8A6F 55%, #52A687 100%)',
          shadow: '0 12px 30px rgba(61, 138, 111, 0.32)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#3D8A6F',
          goldColor: '#FEF08A',
          bannerTag: `🌱 ${tierTheme.label} · 教学资源库`,
        }
    }
  }, [currentTier, tierTheme])

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab })
    if (grade) params.set('grade', grade)
    if (subject) params.set('subject', subject)
    const res = await fetch(`/api/teacher/materials?${params}`)
    const data = await res.json()
    setMaterials(data.materials || [])
    setLoading(false)
  }, [tab, grade, subject])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const subjectOptions = useMemo(() => {
    const source = grade ? GRADE_SUBJECTS[grade] || [] : Array.from(new Set(Object.values(GRADE_SUBJECTS).flat()))
    return source.map((item) => ({ label: item, value: item }))
  }, [grade])

  // 本地模糊过滤
  const filteredMaterials = useMemo(() => {
    if (!keyword.trim()) return materials
    const q = keyword.trim().toLowerCase()
    return materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.grade.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [materials, keyword])

  // 核心统计
  const stats = useMemo(() => {
    const totalCount = materials.length
    const studentCount = materials.filter((m) => m.audience === 'STUDENT' || m.audience === 'BOTH').length
    const teacherCount = materials.filter((m) => m.audience === 'TEACHER' || m.audience === 'BOTH').length
    const mineCount = materials.filter((m) => m.teacherId === dashData?.teacher?.id).length
    const totalDownloads = materials.reduce((sum, m) => sum + (m.downloads || 0), 0)

    return { totalCount, studentCount, teacherCount, mineCount, totalDownloads }
  }, [materials, dashData?.teacher?.id])

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/teacher/materials/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      fetchMaterials()
    } else {
      toast.error('删除失败')
    }
  }

  const handlePreview = async (material: Material) => {
    if (material.fileType === 'word') {
      const res = await fetch(`/api/materials/${material.id}/view`)
      const data = await res.json()
      if (data.viewerUrl) {
        setPreviewType('word')
        setPreviewUrl(data.viewerUrl)
      }
      return
    }
    if (['pdf', 'image'].includes(material.fileType)) {
      setPreviewType(material.fileType as 'pdf' | 'image')
      setPreviewUrl(`/api/materials/${material.id}/view`)
      return
    }
    window.open(`/api/materials/${material.id}/view?download=1`, '_blank')
  }

  return (
    <div style={{ width: '100%', paddingBottom: isMobile ? 88 : 32, color: '#17352F' }}>
      {/* ========================================================= */}
      {/* 顶部根据老师等级/标签动态渲染专属高光数据看板 (HERO BANNER) */}
      {/* ========================================================= */}
      <div
        style={{
          background: tierVisual.gradient,
          borderRadius: 22,
          padding: isMobile ? '20px 18px' : '24px 26px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: tierVisual.shadow,
          marginBottom: 16,
        }}
      >
        {/* 背景光晕 */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -25,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: tierVisual.badgeBg,
                border: `1px solid ${tierVisual.badgeBorder}`,
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
                color: tierVisual.badgeFg,
                marginBottom: 8,
                letterSpacing: '0.04em',
              }}
            >
              <FolderFilled style={{ color: tierVisual.goldColor }} />
              <span>{tierVisual.bannerTag}</span>
            </div>
            <div
              style={{
                color: '#FFFFFF !important',
                fontSize: isMobile ? 24 : 28,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              教学资料与磨课讲义
            </div>
            <div style={{ fontSize: 12.5, color: tierVisual.subColor, marginTop: 5, opacity: 0.95 }}>
              中考提分真题精编 · 随堂练习分发 · 名师教研资源共享
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/teacher/materials/upload')}
            style={{
              background: 'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
              border: 'none',
              borderRadius: 14,
              padding: '9px 15px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: '#4A230D',
              fontWeight: 900,
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              flexShrink: 0,
            }}
          >
            <PlusOutlined style={{ fontSize: 13, color: '#4A230D' }} />
            <span>上传资料</span>
          </button>
        </div>

        {/* 4 大可交互指标小卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 10,
            marginTop: 18,
          }}
        >
          {/* 指标 1：全部资料 */}
          <div
            onClick={() => setTab('all')}
            style={{
              background: tab === 'all' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: tab === 'all' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: tierVisual.subColor }}>
              <span>收录资料</span>
              <BookFilled style={{ color: tierVisual.goldColor }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {stats.totalCount} <span style={{ fontSize: 11, fontWeight: 600 }}>份</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>点击查看全部</div>
          </div>

          {/* 指标 2：学生版资料 */}
          <div
            onClick={() => setTab('student')}
            style={{
              background: tab === 'student' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: tab === 'student' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: tierVisual.subColor }}>
              <span>学生预习/习题</span>
              <UserOutlined style={{ color: tierVisual.goldColor }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {stats.studentCount} <span style={{ fontSize: 11, fontWeight: 600 }}>份</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>开放学生家长下载</div>
          </div>

          {/* 指标 3：教师版备课 */}
          <div
            onClick={() => setTab('teacher')}
            style={{
              background: tab === 'teacher' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: tab === 'teacher' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: tierVisual.subColor }}>
              <span>教案与答案解析</span>
              <FileTextFilled style={{ color: tierVisual.goldColor }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {stats.teacherCount} <span style={{ fontSize: 11, fontWeight: 600 }}>份</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>教师教研专区</div>
          </div>

          {/* 指标 4：我上传的 */}
          <div
            onClick={() => setTab('mine')}
            style={{
              background: tab === 'mine' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: tab === 'mine' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: tierVisual.subColor }}>
              <span>我贡献的资料</span>
              <StarFilled style={{ color: tierVisual.goldColor }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {stats.mineCount} <span style={{ fontSize: 11, fontWeight: 600 }}>份</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>已获下载 {stats.totalDownloads} 次</div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 搜索与年级/科目快捷工具栏                                   */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <Input
          prefix={<SearchOutlined style={{ color: tierVisual.accentColor, fontSize: 15 }} />}
          placeholder="搜索资料名称、学科或知识点关键词..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          allowClear
          style={{ height: 42, borderRadius: 14, border: '1px solid rgba(0,0,0,0.12)', background: '#FFFFFF' }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            placeholder="全部年级"
            allowClear
            value={grade || undefined}
            onChange={(value) => {
              setGrade(value || '')
              setSubject('')
            }}
            options={GRADES.map((item) => ({ label: item, value: item }))}
            style={{ width: 130, height: 36 }}
          />

          <Select
            placeholder="全部科目"
            allowClear
            value={subject || undefined}
            onChange={(value) => setSubject(value || '')}
            options={subjectOptions}
            style={{ width: 130, height: 36 }}
          />

          {(grade || subject || keyword) && (
            <Button
              onClick={() => {
                setGrade('')
                setSubject('')
                setKeyword('')
              }}
              style={{ borderRadius: 8, height: 36, fontSize: 12.5 }}
            >
              清空筛选
            </Button>
          )}
        </div>

        {/* 分类快捷标签条 */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { key: 'all', label: `全部资料 (${stats.totalCount})` },
            { key: 'student', label: `学生版资料 (${stats.studentCount})` },
            { key: 'teacher', label: `教师教研版 (${stats.teacherCount})` },
            { key: 'mine', label: `我上传的 (${stats.mineCount})` },
          ].map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key as TabKey)}
                style={{
                  background: active ? tierVisual.accentColor : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#5A4E3A',
                  border: active ? 'none' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: active ? 800 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: active ? '0 3px 10px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.02)',
                  flexShrink: 0,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 资料卡片流                                                */}
      {/* ========================================================= */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <GuidedEmpty
          title="还没有匹配的教学资料"
          description="上传讲义、练习或答案后，学生和教师可按权限查看，便于重复使用。"
          actionLabel="上传第一份资料"
          onAction={() => router.push('/teacher/materials/upload')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 18,
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* 微型精装书封 */}
              <div className="mini-book" style={bookCoverStyle(material.subject)}>
                <div className="mini-book-spine" />
                <div className="mini-book-inner">
                  <span className="mini-book-title">{material.title}</span>
                  <span className="mini-book-subject">{material.subject}</span>
                  <span className="mini-book-type">{materialFileLabel(material.fileType)}</span>
                </div>
              </div>

              {/* 资料主体信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#17352F', lineHeight: 1.4, marginBottom: 6 }}>
                  {material.title}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#5A4E3A',
                      background: '#F5F2EB',
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {material.grade}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      ...softTagStyle(SUBJECT_COLORS[material.subject]),
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {material.subject}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: getFileStyle(material).color,
                      backgroundColor: getFileStyle(material).bg,
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {materialFileLabel(material.fileType)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      ...audienceTagStyle(material.audience),
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {materialAudienceText(material.audience)}
                  </span>
                </div>

                <div style={{ fontSize: 11.5, color: '#8C7E6A' }}>
                  {material.teacher?.name || material.uploader?.name || '我'} · {fmtDate(material.createdAt)} · 下载{' '}
                  <strong style={{ color: tierVisual.accentColor }}>{material.downloads || 0}</strong> 次
                </div>
              </div>

              {/* 右侧动作按钮 */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 6, flexShrink: 0 }}>
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(material)}
                  style={{ borderRadius: 8, height: 34, fontSize: 12.5 }}
                >
                  预览
                </Button>
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')}
                  style={{ borderRadius: 8, height: 34, fontSize: 12.5 }}
                >
                  下载
                </Button>
                {tab === 'mine' && (
                  <Popconfirm title="确认删除该资料？" onConfirm={() => handleDelete(material.id)}>
                    <Button danger type="text" icon={<DeleteOutlined />} style={{ borderRadius: 8, height: 34 }}>
                      删除
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 预览模态框 */}
      <BrandModal
        title="资料预览"
        open={!!previewUrl}
        footer={null}
        onCancel={() => setPreviewUrl(null)}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0 } }}
      >
        {previewUrl && previewType === 'pdf' && (
          <iframe src={previewUrl} title="PDF预览" style={{ width: '100%', height: '80vh', border: 0 }} />
        )}
        {previewUrl && previewType === 'word' && (
          <iframe src={previewUrl} title="Word预览" style={{ width: '100%', height: '80vh', border: 0 }} />
        )}
        {previewUrl && previewType === 'image' && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <NextImage
              src={previewUrl}
              alt="资料预览"
              width={1200}
              height={800}
              unoptimized
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }}
            />
          </div>
        )}
      </BrandModal>

      <style jsx>{`
        .mini-book {
          position: relative;
          width: 82px;
          height: 108px;
          border-radius: 8px 9px 9px 8px;
          flex: 0 0 82px;
          overflow: hidden;
          box-shadow: 0 8px 16px rgba(40, 30, 20, 0.16), inset -1px 0 0 rgba(255, 255, 255, 0.14);
        }

        .mini-book-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 8px;
          border-radius: 8px 0 0 8px;
          background: rgba(0, 0, 0, 0.16);
          box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.1);
          z-index: 2;
        }

        .mini-book-inner {
          position: absolute;
          inset: 0;
          padding: 10px 8px 8px 14px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .mini-book-title {
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.35;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          flex: 1;
        }

        .mini-book-subject {
          align-self: flex-start;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          font-size: 10px;
          font-weight: 600;
        }

        .mini-book-type {
          align-self: flex-start;
          color: rgba(255, 255, 255, 0.85);
          font-size: 9.5px;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
