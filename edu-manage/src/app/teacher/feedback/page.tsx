'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'
import { Button, Image as AntImage, Input, Spin, Upload, Tag, Card, Select, Empty } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, PlusOutlined, SendOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { MOODS, QUICK_TAGS, QUICK_KPS, BADGES } from '@/components/FeedbackCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function FeedbackPageInner() {
  const searchParams = useSearchParams()
  const isMobile = useIsMobile() ?? false

  // State
  const [groupId, setGroupId] = useState('')
  const [lessonId, setLessonId] = useState(searchParams.get('lessonId') || '')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [mood, setMood] = useState('GOOD')
  const [tags, setTags] = useState<string[]>([])
  const [kps, setKps] = useState<string[]>([])
  const [badge, setBadge] = useState('')
  const [summary, setSummary] = useState('')
  const [overallComment, setOverallComment] = useState('')
  const [homework, setHomework] = useState<string[]>([])
  const [hwInput, setHwInput] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [uploadExpanded, setUploadExpanded] = useState(false)
  const [studentsExpanded, setStudentsExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)

  // AI generation
  const [aiNote, setAiNote] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPrefilled, setAiPrefilled] = useState<Set<string>>(new Set())

  // Stage summary (only when 1 student selected)
  const [stageExpanded, setStageExpanded] = useState(false)
  const [stageData, setStageData] = useState<any>(null)
  const [stageSummaryText, setStageSummaryText] = useState('')
  const [stageSuggestions, setStageSuggestions] = useState('')
  const [stageMaterialExpanded, setStageMaterialExpanded] = useState(false)

  // Data
  const { data: ctx } = useSWR('/api/teacher/feedback-context', fetcher)
  const groups: any[] = ctx?.groups || []
  const allLessons: any[] = ctx?.lessons || []


  // Selected group
  const selectedGroup = groups.find((g: any) => g.id === groupId)
  const groupStudents: any[] = selectedGroup?.students || []

  // Filtered students
  const filteredStudents = studentSearch
    ? groupStudents.filter((s: any) => s.name.includes(studentSearch))
    : groupStudents

  // Lesson groups for selector
  const lessonOptions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const grouped: Record<string, any[]> = { today: [], recent: [] }
    for (const l of allLessons) {
      const d = new Date(l.lessonDate).toISOString().slice(0, 10)
      const key = d === today ? 'today' : 'recent'
      grouped[key].push(l)
    }
    return [
      ...(grouped.today.length ? [{ label: `今日 (${grouped.today.length})`, options: grouped.today.map((l: any) => ({
        label: `${l.groupName} · ${l.startTime} (${l.studentIds.length}人)`, value: l.id,
      })) }] : []),
      ...(grouped.recent.length ? [{ label: `近7天 (${grouped.recent.length})`, options: grouped.recent.map((l: any) => ({
        label: `${l.groupName} · ${new Date(l.lessonDate).toLocaleDateString('zh-CN', { month:'numeric', day:'numeric' })} ${l.startTime}`, value: l.id,
      })) }] : []),
    ]
  }, [allLessons])

  const selectedLesson = allLessons.find((l: any) => l.id === lessonId)

  // ── Stage summary load when single student selected ──
  const stageStudentId = selectedStudentIds.length === 1 ? selectedStudentIds[0] : null
  const { data: stageDataRaw } = useSWR(
    stageStudentId ? `/api/teacher/stage-summary?studentId=${stageStudentId}&months=3` : null,
    fetcher,
  )
  // Sync SWR data → local state
  useEffect(() => {
    if (stageDataRaw && stageDataRaw !== stageData) {
      setStageData(stageDataRaw)
      if (stageDataRaw.draft) {
        setStageSummaryText(stageDataRaw.draft.summary || '')
        setStageSuggestions(stageDataRaw.draft.suggestions || '')
      } else if (!stageStudentId) {
        setStageSummaryText('')
        setStageSuggestions('')
      }
    }
    if (!stageStudentId) {
      setStageData(null)
      setStageSummaryText('')
      setStageSuggestions('')
    }
  }, [stageStudentId, stageDataRaw]) // eslint-disable-line

  // When lesson selected, auto-pick group + students
  useMemo(() => {
    if (selectedLesson && !groupId) {
      setGroupId(selectedLesson.groupId || '')
      setSelectedStudentIds(selectedLesson.studentIds || [])
    }
  }, [selectedLesson?.id]) // eslint-disable-line

  const toggleStudent = (id: string) => setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  const selectAll = () => setSelectedStudentIds(filteredStudents.map((s: any) => s.id))
  const clearAll = () => setSelectedStudentIds([])
  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  const toggleKp = (kp: string) => setKps(prev => prev.includes(kp) ? prev.filter(k => k !== kp) : [...prev, kp])

  const submit = async (status: 'DRAFT' | 'PUBLISHED') => {
    const targetStudents = selectedStudentIds.length ? selectedStudentIds : selectedLesson?.studentIds || []
    if (!targetStudents.length) { toast.warning('请选择学员'); return }
    if (!overallComment.trim() && !summary.trim() && !kps.length && !imageUrls.length && !stageSummaryText.trim()) {
      toast.warning('请至少填写评语、知识点、寄语或上传资料'); return
    }
    setSaving(true)
    try {
      // 1) Classroom feedback
      const fbRes = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLessonId: lessonId || null, studentIds: targetStudents,
          mood, tags, knowledgePoints: kps, badge, summary, overallComment,
          homework: homework.map((h, i) => ({ order: i + 1, content: h })),
          imageUrls, status,
        }),
      })
      const fbData = await fbRes.json()
      if (!fbRes.ok) { toast.error(`反馈发布失败：${fbData.error || '请检查网络后重试'}`, { duration: 5000 }); return }

      // 2) Stage summary (optional, only when PUBLISHED and text non-empty)
      let stagePublished = false
      if (status === 'PUBLISHED' && stageStudentId && stageSummaryText.trim()) {
        const s1 = await fetch('/api/teacher/stage-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: stageStudentId,
            periodStart: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10),
            periodEnd: new Date().toISOString().slice(0, 10),
            summary: stageSummaryText,
            suggestions: stageSuggestions,
          }),
        })
        const d1 = await s1.json()
        if (s1.ok && d1.stageSummary?.id) {
          await fetch('/api/teacher/stage-summary', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: d1.stageSummary.id, action: 'publish' }),
          })
          stagePublished = true
        }
      }

      if (status === 'PUBLISHED') {
        const msg = stagePublished ? '已发布给家长（课堂反馈 + 本期寄语）' : '已发布给家长，并计入反馈奖励'
        toast.success(msg, { duration: 4000 })
        setSubmitDone(true); setTimeout(() => setSubmitDone(false), 3000)
        setLessonId(''); setSelectedStudentIds([]); setGroupId('')
        setMood('GOOD'); setTags([]); setKps([]); setBadge('')
        setSummary(''); setOverallComment(''); setHomework([]); setImageUrls([])
        setStageSummaryText(''); setStageSuggestions('')
        setStageData(null); setStageExpanded(false)
      } else { toast.success('草稿已保存', { duration: 2000 }) }
    } finally { setSaving(false) }
  }

  const aiGenerateClassroom = async () => {
    if (!aiNote.trim()) { toast.warning('请输入本节课的一句话描述'); return }
    if (!groupId) { toast.warning('请先选择班级'); return }
    setAiGenerating(true)
    try {
      const roster = groupStudents.map((s: any) => ({ id: s.id, name: s.name }))
      const options = {
        moods: MOODS.map(m => ({ value: m.value, label: m.label })),
        tags: QUICK_TAGS,
        knowledgePoints: QUICK_KPS,
      }
      const res = await fetch('/api/teacher/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: aiNote.trim(),
          roster, options,
          selected: { mood, tags, knowledgePoints: kps },
          selectedStudentIds,
          stageMaterial: stageData?.material?.summarySeed?.slice(0, 600) || '',
          lessonId: lessonId || undefined,
          groupId: groupId || undefined,
          courseType: selectedGroup?.course?.type || undefined,
          currentForm: {
            mood, overallComment, tags, knowledgePoints: kps,
            homework, summary, suggestion: summary,
            stageSummaryText, stageSuggestions,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'AI 生成失败，请稍后重试'); return }

      // Check if any real content was generated
      const hasContent = Boolean(
        data.overallComment?.trim() ||
        data.suggestion?.trim() ||
        data.stageSummaryText?.trim() ||
        data.stageSuggestions?.trim() ||
        data.summary?.trim() ||
        data.tags?.length ||
        data.knowledgePoints?.length ||
        data.homework?.length,
      )
      if (!hasContent) {
        toast('AI 没有完全识别，请换一句更具体的描述，或先手动选择学生。')
        return
      }

      const filled = new Set<string>()

      // Student IDs — merge with pre-selected, never clear
      const aiStudentIds: string[] = data.studentIds || []
      if (aiStudentIds.length) {
        const merged = new Set(selectedStudentIds)
        aiStudentIds.forEach((id: string) => merged.add(id))
        setSelectedStudentIds([...merged])
        filled.add('students')
      }
      if (data.unknownNames?.length) {
        toast(`未能在班级中确认：${data.unknownNames.join('、')}`, { duration: 3000 })
      }

      // Mood
      if (data.mood && MOODS.some((m: any) => m.value === data.mood)) {
        setMood(data.mood)
        filled.add('mood')
      }

      // Comment
      if (data.overallComment) {
        setOverallComment(data.overallComment)
        filled.add('comment')
      }

      // Tags — union with pre-selected
      const prevTags = new Set(tags)
      const aiTags = (data.tags || []).filter((t: string) => QUICK_TAGS.includes(t))
      aiTags.forEach((t: string) => prevTags.add(t))
      if (prevTags.size > tags.length) { setTags([...prevTags]); filled.add('tags') }

      // Knowledge points — union
      const prevKps = new Set(kps)
      const aiKps = (data.knowledgePoints || []).filter((k: string) => QUICK_KPS.includes(k))
      aiKps.forEach((k: string) => prevKps.add(k))
      if (prevKps.size > kps.length) { setKps([...prevKps]); filled.add('kps') }

      // Homework
      if (data.homework?.length) { setHomework(data.homework); filled.add('homework') }

      // Suggestion / summary
      if (data.suggestion) { setSummary(data.suggestion); filled.add('suggestion') }
      else if (data.summary) { setSummary(data.summary); filled.add('suggestion') }

      // Stage summary fields
      if (data.stageSummaryText) { setStageSummaryText(data.stageSummaryText); filled.add('stageSummary') }
      if (data.stageSuggestions) { setStageSuggestions(data.stageSuggestions); filled.add('stageSuggestion') }

      setAiPrefilled(filled)

      if (data.needsManualStudentSelection) {
        toast('AI 已生成反馈内容，请先确认学生后再发布。', { duration: 4000 })
      } else if (filled.size > 0) {
        toast.success('已自动填充，请核对后点击发布给家长', { duration: 2500 })
      }
    } catch (e: any) { toast.error(e.message || 'AI 生成失败') }
    finally { setAiGenerating(false) }
  }

  const stageAiGenerate = async (target: 'summary' | 'suggestion') => {
    if (!stageStudentId) return
    setAiGenerating(true)
    const hint = target === 'summary' ? '帮我生成教师寄语' : '帮我写下一步建议'
    try {
      const roster = groupStudents.map((s: any) => ({ id: s.id, name: s.name }))
      const res = await fetch('/api/teacher/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: hint,
          roster,
          selectedStudentIds: [stageStudentId],
          stageMaterial: stageData?.material?.summarySeed?.slice(0, 600) || '',
          options: { moods: [], tags: [], knowledgePoints: [] },
          selected: {},
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'AI 生成失败'); return }
      if (target === 'summary' && data.stageSummaryText) {
        setStageSummaryText(data.stageSummaryText)
        toast.success('已生成教师寄语')
      } else if (target === 'suggestion' && data.stageSuggestions) {
        setStageSuggestions(data.stageSuggestions)
        toast.success('已生成下一步建议')
      } else if (target === 'summary' && data.overallComment) {
        setStageSummaryText(data.overallComment)
        toast.success('已生成教师寄语')
      } else {
        toast.warning('AI 未返回对应内容，请再试一次')
      }
    } catch (e: any) { toast.error(e.message || 'AI 生成失败') }
    finally { setAiGenerating(false) }
  }

  const aiPrefillMark = (key: string) => aiPrefilled.has(key)
    ? <Tag color="processing" style={{ fontSize: 10, marginLeft: 6, borderRadius: 4 }}>AI 预填</Tag>
    : null

  const formSection = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mood */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          课堂状态{aiPrefillMark('mood')}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOODS.map(m => (
            <button key={m.value} onClick={() => setMood(m.value)} style={{
              padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
              background: mood === m.value ? m.color : '#F5F2EE', color: mood === m.value ? '#fff' : '#5a4e3a',
              border: 'none', fontWeight: mood === m.value ? 700 : 400,
            }}><span>{m.emoji}</span> {m.label}</button>
          ))}
        </div>
      </Card>

      {/* Comment */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          评语{aiPrefillMark('comment')}
        </div>
        <Input.TextArea value={overallComment} onChange={e => setOverallComment(e.target.value)}
          rows={3} placeholder="对本次课的整体点评，家长会直接看到" maxLength={300} showCount style={{ borderRadius: 8 }} />
      </Card>

      {/* Tags + KP */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          表现标签{aiPrefillMark('tags')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {QUICK_TAGS.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)} style={{
              padding: '3px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
              background: tags.includes(tag) ? '#534AB7' : '#F5F2EE',
              color: tags.includes(tag) ? '#fff' : '#5a4e3a', border: 'none',
            }}>{tag}</button>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          知识点{aiPrefillMark('kps')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {QUICK_KPS.map(kp => (
            <button key={kp} onClick={() => toggleKp(kp)} style={{
              padding: '3px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
              background: kps.includes(kp) ? '#E8784A' : '#F5F2EE',
              color: kps.includes(kp) ? '#fff' : '#5a4e3a', border: 'none',
            }}>{kp}</button>
          ))}
        </div>
        <Input size="small" placeholder="自定义知识点，回车添加" style={{ borderRadius: 8 }}
          onPressEnter={e => { const v = (e.target as HTMLInputElement).value.trim(); if (v && !kps.includes(v)) { setKps(prev => [...prev, v]); (e.target as HTMLInputElement).value = '' } }} />
      </Card>

      {/* Homework */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          作业布置{aiPrefillMark('homework')}{aiPrefillMark('suggestion')}
        </div>
        {homework.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#98A2B3', fontSize: 12, paddingTop: 6, minWidth: 20 }}>{i + 1}.</span>
            <Input size="small" value={h} onChange={e => setHomework(prev => prev.map((x, j) => j === i ? e.target.value : x))} style={{ flex: 1 }} />
            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => setHomework(prev => prev.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <Input size="small" value={hwInput} onChange={e => setHwInput(e.target.value)} placeholder="添加一项作业" style={{ flex: 1 }}
            onPressEnter={() => { if (hwInput.trim()) { setHomework(prev => [...prev, hwInput.trim()]); setHwInput('') } }} />
          <Button size="small" icon={<PlusOutlined />} onClick={() => { if (hwInput.trim()) { setHomework(prev => [...prev, hwInput.trim()]); setHwInput('') } }}>添加</Button>
        </div>
      </Card>

      {/* Badge — collapsible */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setBadgeOpen(!badgeOpen)}>
          <span>闪光徽章 {badge ? `· ${badge}` : '(可选)'}</span>
          <span style={{ color: '#98A2B3' }}>{badgeOpen ? '收起' : '展开'}</span>
        </div>
        {badgeOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {BADGES.map(b => (
              <button key={b} onClick={() => setBadge(badge === b ? '' : b)} style={{
                padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                background: badge === b ? '#D4A017' : '#F5F2EE',
                color: badge === b ? '#fff' : '#5a4e3a', border: 'none',
              }}>{b}</button>
            ))}
          </div>
        )}
      </Card>

      {/* Upload — collapsible */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setUploadExpanded(!uploadExpanded)}>
          <span>课堂资料 {imageUrls.length ? `(${imageUrls.length})` : '(可选)'}</span>
          <span style={{ color: '#98A2B3', fontSize: 12 }}>{uploadExpanded ? '收起' : '展开'}</span>
        </div>
        {uploadExpanded && (
          <div>
            {imageUrls.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <AntImage.PreviewGroup>{imageUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <AntImage src={normalizeUploadUrl(url)} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
                    <button onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#E24B4A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11 }}>×</button>
                  </div>
                ))}</AntImage.PreviewGroup>
              </div>
            )}
            <Upload.Dragger name="file" accept="image/*" multiple maxCount={9} showUploadList={false}
              beforeUpload={(file) => {
                if (!file.type.startsWith('image/') && !/\.(heic|heif|avif)$/i.test(file.name)) { toast.warning('仅支持图片文件（JPG/PNG/WebP/HEIC）'); return Upload.LIST_IGNORE }
                if (file.size > 20 * 1024 * 1024) { toast.warning('图片不能超过 20MB，请压缩后重新上传'); return Upload.LIST_IGNORE }
                return true
              }}
              customRequest={async ({ file, onSuccess, onError }) => {
                const formData = new FormData()
                formData.append('file', file as File)
                formData.append('uploadType', 'teacher-feedback')
                try {
                  const res = await fetch('/api/upload', { method: 'POST', body: formData })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
                  onSuccess?.(data)
                } catch (err) {
                  onError?.(err instanceof Error ? err : new Error('上传失败'))
                }
              }}
              onChange={info => {
                if (info.file.status === 'uploading') return
                if (info.file.status === 'done') {
                  const url = (info.file.response as any)?.url
                  const error = (info.file.response as any)?.error
                  if (url) setImageUrls(prev => [...prev, url])
                  else toast.error(error || '上传失败', { duration: 5000 })
                } else if (info.file.status === 'error') {
                  const err = (info.file as any)?.error
                  toast.error((err as Error)?.message || '上传失败：请检查网络连接后重试', { duration: 5000 })
                }
              }} style={{ borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#98A2B3' }}>点击或拖拽上传，单张≤20MB，支持 JPG/PNG/WebP/HEIC</div>
            </Upload.Dragger>
          </div>
        )}
      </Card>

      {/* ── Stage Summary ── */}
      {selectedStudentIds.length > 1 ? (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#faf8f5' }}>
          <div style={{ fontSize: 12, color: '#7A869A', textAlign: 'center' }}>
            本期寄语为单个学生专属内容，请只选择一名学生后填写
          </div>
        </Card>
      ) : stageStudentId && (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #F0DDD2' }}>
          <div
            style={{ fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setStageExpanded(!stageExpanded)}
          >
            <span>📋 本期寄语（家长端可见）{stageExpanded ? '' : ' — 点击展开'}</span>
            <span style={{ color: '#98A2B3', fontSize: 12 }}>{stageExpanded ? '收起' : '展开'}</span>
          </div>
          {stageExpanded && (
            <div style={{ marginTop: 10 }}>
              {/* Auto-material (collapsible) */}
              {stageData?.material && (
                <div style={{ background: '#FFF8F4', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setStageMaterialExpanded(!stageMaterialExpanded)}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#5a4e3a' }}>自动素材参考</span>
                    <Button type="link" size="small" style={{ fontSize: 11, padding: 0 }}>
                      {stageMaterialExpanded ? '收起' : '展开'}
                    </Button>
                  </div>
                  {stageMaterialExpanded && (
                    <>
                      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Tag color="green" style={{ fontSize: 11 }}>出勤 {stageData.material.overview.attendanceRate ?? '暂无'}%</Tag>
                        <Tag color="blue" style={{ fontSize: 11 }}>掌握 {stageData.material.overview.masteryRate ?? '暂无'}%</Tag>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', fontSize: 12, color: '#5a4e3a', lineHeight: 1.5 }}>
                        {stageData.material.summarySeed}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>教师寄语</span>
                <Button type="link" size="small" icon={<ThunderboltOutlined />} loading={aiGenerating}
                  onClick={() => stageAiGenerate('summary')}
                  style={{ fontSize: 11, padding: 0 }}>AI 写寄语</Button>
              </div>
              <Input.TextArea
                rows={4}
                maxLength={500}
                showCount
                value={stageSummaryText}
                onChange={e => setStageSummaryText(e.target.value)}
                placeholder="结合自动素材，写给家长看的阶段学情小结"
                style={{ borderRadius: 8 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 4px' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>下一步建议</span>
                <Button type="link" size="small" icon={<ThunderboltOutlined />} loading={aiGenerating}
                  onClick={() => stageAiGenerate('suggestion')}
                  style={{ fontSize: 11, padding: 0 }}>AI 写建议</Button>
              </div>
              <Input.TextArea
                rows={2}
                maxLength={200}
                showCount
                value={stageSuggestions}
                onChange={e => setStageSuggestions(e.target.value)}
                placeholder="例如：接下来重点巩固计算准确率"
                style={{ borderRadius: 8 }}
              />

              <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 8 }}>
                非空时随课堂反馈一并发布（家长端「案」板块）
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Submit — fixed bottom bar on mobile */}
      <div style={{
        display: 'flex', gap: 10, paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom))' : 24,
        ...(isMobile ? {
          position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 1000,
          background: '#fff', padding: '10px 16px', borderTop: '1px solid #EEE7E1', boxShadow: '0 -2px 8px rgba(0,0,0,.06)',
        } : {}),
      }}>
        <Button block onClick={() => submit('DRAFT')} loading={saving} style={{ flex: 1 }}>保存草稿</Button>
        <Button block type="primary" icon={submitDone ? <CheckCircleOutlined /> : <SendOutlined />}
          onClick={() => submit('PUBLISHED')} loading={saving}
          style={{ flex: 2, background: submitDone ? '#1D9E75' : '#E8784A', borderColor: submitDone ? '#1D9E75' : '#E8784A', fontWeight: 700 }}>
          {submitDone ? '已发布' : saving ? '发布中...' : '发布给家长'}
        </Button>
      </div>
      {/* Spacer for fixed bar on mobile */}
      {isMobile && <div style={{ height: 152 }} />}
    </div>
  )

  return (
    <div style={isMobile ? {} : { display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
      {/* LEFT: class picker + lesson + AI + student selection (desktop) */}
      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 12, maxHeight: '100vh', overflowY: 'auto' }}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>选择班级</div>
            <Select size="small" value={groupId || undefined} onChange={(v: string) => { setGroupId(v); setLessonId(''); setSelectedStudentIds([]) }}
              allowClear placeholder="全部班级" style={{ width: '100%' }}
              options={groups.map((g: any) => ({ label: `${g.courseName} (${g.studentCount}人)`, value: g.id }))} />
            {!groupId && groups.length === 0 && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 6 }}>暂无班级数据</div>}
          </Card>

          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>关联课次</div>
            <Select size="small" value={lessonId || undefined} onChange={(v: string) => { setLessonId(v || ''); setSelectedStudentIds(v ? (allLessons.find((l: any) => l.id === v)?.studentIds || []) : []) }}
              allowClear placeholder="选择课次" style={{ width: '100%' }} options={lessonOptions} />
          </Card>

          {/* AI input — desktop left column */}
          {groupId && (
            <Card size="small" style={{ borderRadius: 12, border: '1px dashed #E8784A', background: '#FFFBF7' }}>
              <div style={{ fontSize: 12, color: '#8d806f', marginBottom: 8 }}>
                ✨ AI 结构化填充 —— 一句话描述，自动填表
              </div>
              <Input
                size="small"
                placeholder="马紫晨上课积极回答，函数掌握不错…"
                value={aiNote}
                onChange={e => setAiNote(e.target.value)}
                onPressEnter={aiGenerateClassroom}
                style={{ borderRadius: 8, marginBottom: 6 }}
                allowClear
                disabled={aiGenerating}
              />
              <Button
                type="primary"
                size="small"
                block
                icon={<ThunderboltOutlined />}
                loading={aiGenerating}
                onClick={aiGenerateClassroom}
                style={{ background: '#E8784A' }}
              >
                AI 生成草稿
              </Button>
            </Card>
          )}

          {/* Student list — collapsible */}
          {groupId && (
            <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setStudentsExpanded(!studentsExpanded)}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {selectedGroup?.courseName || '班级'} ({filteredStudents.length}人)
                  {selectedStudentIds.length > 0 && (
                    <span style={{ fontWeight: 400, color: '#E8784A', marginLeft: 6, fontSize: 12 }}>
                      已选 {selectedStudentIds.length} 人
                    </span>
                  )}
                </span>
                <span style={{ color: '#98A2B3', fontSize: 12 }}>{studentsExpanded ? '收起 ▲' : '展开 ▼'}</span>
              </div>
              {/* Always show selected chips */}
              {selectedStudentIds.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedStudentIds.map((id) => {
                    const s = groupStudents.find((gs: any) => gs.id === id)
                    return s ? (
                      <Tag key={id} closable color="orange" style={{ borderRadius: 9999, fontSize: 11, margin: 0 }}
                        onClose={(e: any) => { e.preventDefault(); toggleStudent(id) }}>{s.name}</Tag>
                    ) : null
                  })}
                </div>
              )}
              {studentsExpanded && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    <Input size="small" prefix={<SearchOutlined />} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="搜索" style={{ flex: 1, borderRadius: 8 }} />
                    <Button size="small" onClick={selectAll} style={{ fontSize: 11 }}>全选</Button>
                    <Button size="small" onClick={clearAll} style={{ fontSize: 11 }}>清空</Button>
                  </div>
                  {filteredStudents.length === 0 ? (
                    <Empty description="该班级暂无学员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {filteredStudents.map((s: any) => {
                        const selected = selectedStudentIds.includes(s.id)
                        return (
                          <div key={s.id} onClick={() => toggleStudent(s.id)} style={{
                            padding: 8, borderRadius: 8, cursor: 'pointer', border: selected ? '2px solid #E8784A' : '1px solid #EEE7E1',
                            background: selected ? '#FFF3EC' : '#fff', transition: 'all .15s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 8, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#E8784A', flexShrink: 0 }}>{s.name[0]}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          {!groupId && (
            <div style={{ fontSize: 13, color: '#7A869A', textAlign: 'center', padding: '20px 0' }}>请先选择班级</div>
          )}

        </div>
      )}

      {/* RIGHT: Form (desktop) / everything (mobile) */}
      <div style={!isMobile ? { position: 'sticky', top: 12, display: 'flex', flexDirection: 'column', gap: 14 } : { display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Mobile: AI input + class/lesson picker + student cards */}
        {isMobile && (
          <>
            {groupId && (
              <Card size="small" style={{ borderRadius: 12, border: '1px dashed #E8784A', background: '#FFFBF7' }}>
                <div style={{ fontSize: 12, color: '#8d806f', marginBottom: 6 }}>
                  ✨ AI 结构化填充 —— 一句话描述，自动填表
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input
                    size="small"
                    placeholder="马紫晨上课积极回答，函数掌握不错…"
                    value={aiNote}
                    onChange={e => setAiNote(e.target.value)}
                    style={{ flex: 1, borderRadius: 8 }}
                    allowClear
                    disabled={aiGenerating}
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<ThunderboltOutlined />}
                    loading={aiGenerating}
                    onClick={aiGenerateClassroom}
                    style={{ whiteSpace: 'nowrap', background: '#E8784A' }}
                  >
                    生成
                  </Button>
                </div>
              </Card>
            )}
            <Select size="small" value={groupId || undefined} onChange={(v: string) => { setGroupId(v); setLessonId(''); setSelectedStudentIds([]) }}
              allowClear placeholder="选择班级" style={{ width: '100%' }}
              options={groups.map((g: any) => ({ label: `${g.courseName} (${g.studentCount}人)`, value: g.id }))} />
            <Select size="small" value={lessonId || undefined} onChange={(v: string) => { setLessonId(v || ''); setSelectedStudentIds(v ? (allLessons.find((l: any) => l.id === v)?.studentIds || []) : []) }}
              allowClear placeholder="关联课次" style={{ width: '100%' }} options={lessonOptions} />

            {groupId && (
              <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setStudentsExpanded(!studentsExpanded)}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {selectedGroup?.courseName || '班级'} ({filteredStudents.length}人)
                    {selectedStudentIds.length > 0 && (
                      <span style={{ fontWeight: 400, color: '#E8784A', marginLeft: 6, fontSize: 12 }}>已选 {selectedStudentIds.length} 人</span>
                    )}
                  </span>
                  <span style={{ color: '#98A2B3', fontSize: 12 }}>{studentsExpanded ? '收起 ▲' : '展开 ▼'}</span>
                </div>
                {selectedStudentIds.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {selectedStudentIds.map((id) => {
                      const s = groupStudents.find((gs: any) => gs.id === id)
                      return s ? (
                        <Tag key={id} closable color="orange" style={{ borderRadius: 9999, fontSize: 11, margin: 0 }}
                          onClose={(e: any) => { e.preventDefault(); toggleStudent(id) }}>{s.name}</Tag>
                      ) : null
                    })}
                  </div>
                )}
                {studentsExpanded && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      <Button size="small" onClick={selectAll} style={{ fontSize: 11 }}>全选</Button>
                      <Button size="small" onClick={clearAll} style={{ fontSize: 11 }}>清空</Button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {filteredStudents.map((s: any) => {
                        const selected = selectedStudentIds.includes(s.id)
                        return (
                          <div key={s.id} onClick={() => toggleStudent(s.id)} style={{
                            padding: 8, borderRadius: 8, cursor: 'pointer', border: selected ? '2px solid #E8784A' : '1px solid #EEE7E1',
                            background: selected ? '#FFF3EC' : '#fff',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#E8784A' }}>{s.name[0]}</div>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {/* Multi-student info */}
        {selectedStudentIds.length > 1 && (
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#FFFBF7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>已选 {selectedStudentIds.length} 位学员</div>
            <div style={{ fontSize: 11, color: '#7A869A' }}>批量反馈适合发共同内容，个性化评价建议单独选择学生补充</div>
          </Card>
        )}

        {/* Form (includes AI input, classroom feedback, stage-summary) */}
        {formSection}

      </div>
    </div>
  )
}

export default function TeacherFeedbackPage() {
  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1F2329' }}>课堂反馈</h2>
        <div style={{ fontSize: 13, color: '#98A2B3', marginTop: 4 }}>发布后家长实时收到通知，并计入反馈奖励</div>
      </div>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>}>
        <FeedbackPageInner />
      </Suspense>
    </div>
  )
}
