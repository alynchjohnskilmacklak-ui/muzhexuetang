'use client'

import { Suspense, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Image as AntImage, Input, Spin, Upload } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { MobileSelect } from '@/components/MobileSelect'
import { MOODS, QUICK_TAGS, QUICK_KPS, BADGES, FeedbackCard } from '@/components/FeedbackCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function FeedbackPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile() ?? false

  const [lessonId, setLessonId] = useState(searchParams.get('lessonId') || '')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [mood, setMood] = useState('GOOD')
  const [tags, setTags] = useState<string[]>([])
  const [kps, setKps] = useState<string[]>([])
  const [badge, setBadge] = useState('')
  const [summary, setSummary] = useState('')
  const [overallComment, setOverallComment] = useState('')
  const [homework, setHomework] = useState<string[]>([])
  const [hwInput, setHwInput] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)

  const { data: lessonsData } = useSWR('/api/teacher/lessons?days=30', fetcher)
  const allLessons: any[] = Array.isArray(lessonsData) ? lessonsData : []

  const { data: studentsData } = useSWR('/api/teacher/students', fetcher)
  const allStudents: any[] = Array.isArray(studentsData) ? studentsData : []

  const { data: historyData, mutate } = useSWR('/api/feedback?limit=20', fetcher)
  const history: any[] = Array.isArray(historyData?.feedbacks) ? historyData.feedbacks : []

  const lessonGroups = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart.getTime() + 86400000)

    // 只保留今天及之前的课次（排除未来课次）
    const pastAndToday = allLessons.filter((l: any) => new Date(l.lessonDate) < tomorrowStart)

    const sorted = [...pastAndToday].sort((a, b) =>
      new Date(b.lessonDate).getTime() - new Date(a.lessonDate).getTime() ||
      String(b.startTime || '').localeCompare(String(a.startTime || ''))
    )

    const toOption = (l: any) => {
      const isOneOnOne = l.courseType === 'ONE_ON_ONE' || l.courseType === 'SMALL_GROUP'
      const typeLabel = l.courseType === 'ONE_ON_ONE' ? '一对一' : l.courseType === 'SMALL_GROUP' ? '小组课' : '班课'
      const dateStr = new Date(l.lessonDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
      return {
        label: isOneOnOne
          ? `【${typeLabel}】${l.oneOnOneStudentName || l.groupName} · ${dateStr} ${l.startTime}`
          : `【班课】${l.groupName} · ${dateStr} ${l.startTime}（${l.studentCount || 0}人）`,
        value: l.id,
      }
    }

    const todays = sorted.filter((l: any) => {
      const d = new Date(l.lessonDate)
      return d >= todayStart && d < tomorrowStart
    })
    const thisWeekStart = new Date(todayStart)
    thisWeekStart.setDate(todayStart.getDate() - 6)
    const recent = sorted.filter((l: any) => {
      const d = new Date(l.lessonDate)
      return d >= thisWeekStart && d < todayStart
    })
    const older = sorted.filter((l: any) => new Date(l.lessonDate) < thisWeekStart)

    return [
      ...(todays.length ? [{ label: `今日课次（${todays.length}节）`, options: todays.map(toOption) }] : []),
      ...(recent.length ? [{ label: `近7天（${recent.length}节）`, options: recent.map(toOption) }] : []),
      ...(older.length ? [{ label: `更早历史（${older.length}节）`, options: older.slice(0, 30).map(toOption) }] : []),
    ]
  }, [allLessons])

  const selectedLesson = allLessons.find((l: any) => l.id === lessonId)
  const lessonStudents: any[] = selectedLesson?.students || []
  const studentList = lessonStudents.length ? lessonStudents : allStudents.slice(0, 50)

  const toggleStudent = (id: string) => setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  const toggleKp = (kp: string) => setKps(prev => prev.includes(kp) ? prev.filter(k => k !== kp) : [...prev, kp])

  const submit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!overallComment.trim() && !summary.trim() && !kps.length && !imageUrls.length) {
      toast.warning('请至少填写评语、知识点或上传资料')
      return
    }
    const targetStudents = selectedStudentIds.length ? selectedStudentIds : lessonStudents.map((s: any) => s.id)
    if (!targetStudents.length && !lessonId) {
      toast.warning('请关联课次或选择学员')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLessonId: lessonId || null,
          studentIds: targetStudents,
          mood, tags, knowledgePoints: kps, badge,
          summary, overallComment,
          homework: homework.map((h, i) => ({ order: i + 1, content: h })),
          imageUrls,
          status,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(`发布失败：${data.error || '请检查网络后重试'}`, { duration: 5000 }); return }
      if (status === 'PUBLISHED') {
        toast.success('反馈已发布，家长会立即收到通知 ✅', { duration: 4000 })
        setSubmitDone(true)
        setTimeout(() => setSubmitDone(false), 3000)
        setLessonId(''); setSelectedStudentIds([]); setMood('GOOD'); setTags([]); setKps([])
        setBadge(''); setSummary(''); setOverallComment(''); setHomework([]); setImageUrls([])
        mutate()
      } else {
        toast.success('草稿已保存', { duration: 2000 })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '440px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

      {/* Left: edit form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Lesson selector */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>📅 关联课次（可选）</div>
          <MobileSelect
            allowClear placeholder="选择今日或历史课次"
            style={{ width: '100%' }}
            value={lessonId || undefined}
            onChange={(v: any) => { setLessonId(v || ''); setSelectedStudentIds([]) }}
            onClear={() => { setLessonId(''); setSelectedStudentIds([]) }}
            options={lessonGroups.flatMap(g => g.options)}
          />
          {selectedLesson && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 4 }}>
                {selectedLesson.startTime} · {lessonStudents.length}位学员已自动关联
              </div>
              <button onClick={() => { setLessonId(''); setSelectedStudentIds([]) }}
                style={{ fontSize: 12, color: '#E24B4A', background: '#FFF0EE',
                  border: '1px solid #FFD0CC', borderRadius: 6, padding: '3px 10px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                ✕ 取消关联
              </button>
            </div>
          )}
        </div>

        {/* Student selector (manual when no lesson) */}
        {!lessonId && (
          <div style={{ fontSize: 12, color: '#D97706', background: '#FFFBF5', padding: '6px 10px', borderRadius: 6, border: '1px solid #FED7AA', marginBottom: 0 }}>
            未关联课次时需手动选择学员，反馈仅发给所选学员。
          </div>
        )}
        {!lessonStudents.length && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>👤 选择学员</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allStudents.slice(0, 30).map((s: any) => {
                const selected = selectedStudentIds.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleStudent(s.id)} style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                    background: selected ? '#E8784A' : '#F5F2EE',
                    color: selected ? '#fff' : '#5a4e3a',
                    border: 'none', fontWeight: selected ? 700 : 400,
                  }}>
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Mood */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>🌡 课堂状态</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button key={m.value} onClick={() => setMood(m.value)} style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
                background: mood === m.value ? m.color : '#F5F2EE',
                color: mood === m.value ? '#fff' : '#5a4e3a',
                border: 'none', fontWeight: mood === m.value ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>✍️ 评语</div>
          <Input.TextArea
            value={overallComment}
            onChange={e => setOverallComment(e.target.value)}
            rows={3}
            placeholder="对本次课的整体点评，家长会直接看到..."
            maxLength={300}
            showCount
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Quick tags */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>🏷 表现标签</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)} style={{
                padding: '4px 12px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
                background: tags.includes(tag) ? '#534AB7' : '#F5F2EE',
                color: tags.includes(tag) ? '#fff' : '#5a4e3a',
                border: 'none',
              }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge points */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>📚 知识点</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {QUICK_KPS.map(kp => (
              <button key={kp} onClick={() => toggleKp(kp)} style={{
                padding: '4px 12px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
                background: kps.includes(kp) ? '#E8784A' : '#F5F2EE',
                color: kps.includes(kp) ? '#fff' : '#5a4e3a',
                border: 'none',
              }}>
                {kp}
              </button>
            ))}
          </div>
          <Input size="small" placeholder="自定义知识点 回车添加" style={{ borderRadius: 8 }}
            onPressEnter={e => {
              const v = (e.target as HTMLInputElement).value.trim()
              if (v && !kps.includes(v)) { setKps(prev => [...prev, v]); (e.target as HTMLInputElement).value = '' }
            }} />
        </div>

        {/* Badge */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>🏅 闪光徽章（可选）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BADGES.map(b => (
              <button key={b} onClick={() => setBadge(badge === b ? '' : b)} style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                background: badge === b ? '#D4A017' : '#F5F2EE',
                color: badge === b ? '#fff' : '#5a4e3a',
                border: 'none', fontWeight: badge === b ? 700 : 400,
              }}>
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Homework */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>📝 作业布置</div>
          {homework.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
        </div>

        {/* Upload images */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE7E1', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>🖼 课堂资料</div>
          {imageUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <AntImage.PreviewGroup>
                {imageUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <AntImage src={normalizeUploadUrl(url)} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
                    <button onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#E24B4A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'grid', placeItems: 'center' }}>×</button>
                  </div>
                ))}
              </AntImage.PreviewGroup>
            </div>
          )}
          <Upload.Dragger name="file" action="/api/upload" accept="image/*" multiple maxCount={9} showUploadList={false}
            onChange={info => { if (info.file.status === 'done') { const url = (info.file.response as { url?: string })?.url; if (url) setImageUrls(prev => [...prev, url]) } }}
            style={{ borderRadius: 8, padding: '10px 0' }}>
            <div style={{ fontSize: 13, color: '#98A2B3' }}>点击或拖拽上传课堂照片</div>
          </Upload.Dragger>
        </div>

        {/* Submit buttons */}
        <div style={{ display: 'flex', gap: 10, paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          <Button block onClick={() => submit('DRAFT')} loading={saving} style={{ flex: 1 }}>保存草稿</Button>
          <Button block type="primary" icon={submitDone ? <CheckCircleOutlined /> : <SendOutlined />}
            onClick={() => submit('PUBLISHED')} loading={saving}
            style={{ flex: 2,
              background: submitDone ? '#1D9E75' : '#E8784A',
              borderColor: submitDone ? '#1D9E75' : '#E8784A',
              fontWeight: 700, transition: 'background .3s' }}>
            {submitDone ? '已发布 ✓' : saving ? '发布中...' : '发布 · 同步家长 💰'}
          </Button>
        </div>
      </div>

      {/* Right: history */}
      {!isMobile && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 12 }}>历史反馈记录</div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#98A2B3' }}>暂无反馈记录</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((item: any) => (
                <FeedbackCard key={item.id} item={item} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TeacherFeedbackPage() {
  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1F2329' }}>成长反馈</h2>
        <div style={{ fontSize: 13, color: '#98A2B3', marginTop: 4 }}>发布后家长实时收到通知，并计入反馈奖励 💰</div>
      </div>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>}>
        <FeedbackPageInner />
      </Suspense>
    </div>
  )
}
