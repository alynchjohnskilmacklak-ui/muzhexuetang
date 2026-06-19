'use client'

import { Suspense, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Image as AntImage, Input, Spin, Upload, Tag, Card, Select, Empty } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, PlusOutlined, SendOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { MOODS, QUICK_TAGS, QUICK_KPS, BADGES, FeedbackCard } from '@/components/FeedbackCard'
import { StudentContextPanel } from '@/components/teacher/StudentContextPanel'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function FeedbackPageInner() {
  const router = useRouter()
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
  const [saving, setSaving] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)

  // Data
  const { data: ctx } = useSWR('/api/teacher/feedback-context', fetcher)
  const groups: any[] = ctx?.groups || []
  const allLessons: any[] = ctx?.lessons || []

  const { data: historyData, mutate } = useSWR('/api/feedback?limit=20', fetcher)
  const history: any[] = Array.isArray(historyData?.feedbacks) ? historyData.feedbacks : []

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
    if (!overallComment.trim() && !summary.trim() && !kps.length && !imageUrls.length) {
      toast.warning('请至少填写评语、知识点或上传资料'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLessonId: lessonId || null, studentIds: targetStudents,
          mood, tags, knowledgePoints: kps, badge, summary, overallComment,
          homework: homework.map((h, i) => ({ order: i + 1, content: h })),
          imageUrls, status,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(`发布失败：${data.error || '请检查网络后重试'}`, { duration: 5000 }); return }
      if (status === 'PUBLISHED') {
        toast.success('反馈已发布，家长会立即收到通知', { duration: 4000 })
        setSubmitDone(true); setTimeout(() => setSubmitDone(false), 3000)
        setLessonId(''); setSelectedStudentIds([]); setGroupId('')
        setMood('GOOD'); setTags([]); setKps([]); setBadge('')
        setSummary(''); setOverallComment(''); setHomework([]); setImageUrls([])
        mutate()
      } else { toast.success('草稿已保存', { duration: 2000 }) }
    } finally { setSaving(false) }
  }

  const formSection = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mood */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>课堂状态</div>
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
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>评语</div>
        <Input.TextArea value={overallComment} onChange={e => setOverallComment(e.target.value)}
          rows={3} placeholder="对本次课的整体点评，家长会直接看到" maxLength={300} showCount style={{ borderRadius: 8 }} />
      </Card>

      {/* Tags + KP */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>表现标签</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {QUICK_TAGS.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)} style={{
              padding: '3px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
              background: tags.includes(tag) ? '#534AB7' : '#F5F2EE',
              color: tags.includes(tag) ? '#fff' : '#5a4e3a', border: 'none',
            }}>{tag}</button>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>知识点</div>
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
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>作业布置</div>
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

      {/* Badge */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>闪光徽章（可选）</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BADGES.map(b => (
            <button key={b} onClick={() => setBadge(badge === b ? '' : b)} style={{
              padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
              background: badge === b ? '#D4A017' : '#F5F2EE',
              color: badge === b ? '#fff' : '#5a4e3a', border: 'none',
            }}>{b}</button>
          ))}
        </div>
      </Card>

      {/* Upload */}
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>课堂资料</div>
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
        <Upload.Dragger name="file" action="/api/upload" accept="image/*" multiple maxCount={9} showUploadList={false}
          data={{ uploadType: 'teacher-feedback' }}
          beforeUpload={(file) => {
            if (!file.type.startsWith('image/') && !/\.(heic|heif|avif)$/i.test(file.name)) { toast.warning('仅支持图片文件'); return Upload.LIST_IGNORE }
            if (file.size > 5 * 1024 * 1024) { toast.warning('图片不能超过 5MB'); return Upload.LIST_IGNORE }
            return true
          }}
          onChange={info => {
            if (info.file.status === 'uploading') return
            if (info.file.status === 'done') {
              const url = (info.file.response as any)?.url
              const error = (info.file.response as any)?.error
              if (url) setImageUrls(prev => [...prev, url])
              else toast.error(error || '上传失败', { duration: 5000 })
            } else if (info.file.status === 'error') {
              toast.error('上传失败，网络不稳定或服务器限制，请重试', { duration: 5000 })
            }
          }} style={{ borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#98A2B3' }}>点击或拖拽上传，单张≤5MB</div>
        </Upload.Dragger>
      </Card>

      {/* Submit */}
      <div style={{ display: 'flex', gap: 10, paddingBottom: 24 }}>
        <Button block onClick={() => submit('DRAFT')} loading={saving} style={{ flex: 1 }}>保存草稿</Button>
        <Button block type="primary" icon={submitDone ? <CheckCircleOutlined /> : <SendOutlined />}
          onClick={() => submit('PUBLISHED')} loading={saving}
          style={{ flex: 2, background: submitDone ? '#1D9E75' : '#E8784A', borderColor: submitDone ? '#1D9E75' : '#E8784A', fontWeight: 700 }}>
          {submitDone ? '已发布' : saving ? '发布中...' : '发布给家长'}
        </Button>
      </div>
    </div>
  )

  return (
    <div style={isMobile ? {} : { display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr) 360px', gap: 20, alignItems: 'start' }}>
      {/* LEFT: Class & lesson picker */}
      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 12 }}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>选择班级</div>
            <Select size="small" value={groupId || undefined} onChange={(v: string) => { setGroupId(v); setLessonId(''); setSelectedStudentIds([]) }}
              allowClear placeholder="全部班级" style={{ width: '100%' }}
              options={groups.map((g: any) => ({ label: `${g.courseName} (${g.studentCount}人)`, value: g.id }))} />
            {!groupId && groups.length === 0 && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 6 }}>暂无班级数据</div>}
          </Card>

          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>关联课次</div>
            <Select size="small" value={lessonId || undefined} onChange={(v: string) => { setLessonId(v); if (v) setSelectedStudentIds(allLessons.find((l: any) => l.id === v)?.studentIds || []) }}
              allowClear placeholder="选择课次" style={{ width: '100%' }} options={lessonOptions} />
          </Card>

          {/* Simple stats */}
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 11, color: '#7A869A', display: 'flex', justifyContent: 'space-between' }}>
              <span>班级数</span><strong>{groups.length}</strong>
            </div>
            <div style={{ fontSize: 11, color: '#7A869A', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span>近7天课次</span><strong>{allLessons.length}</strong>
            </div>
            <div style={{ fontSize: 11, color: '#7A869A', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span>本月反馈</span><strong>{history.length}</strong>
            </div>
          </Card>

          {/* History list */}
          <div style={{ fontSize: 13, fontWeight: 700 }}>历史反馈</div>
          {history.slice(0, 10).map((item: any) => <FeedbackCard key={item.id} item={item} compact />)}
        </div>
      )}

      {/* MIDDLE: Student cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Mobile: class/lesson picker */}
        {isMobile && (
          <>
            <Select size="small" value={groupId || undefined} onChange={(v: string) => { setGroupId(v); setLessonId(''); setSelectedStudentIds([]) }}
              allowClear placeholder="选择班级" style={{ width: '100%' }}
              options={groups.map((g: any) => ({ label: `${g.courseName} (${g.studentCount}人)`, value: g.id }))} />
            <Select size="small" value={lessonId || undefined} onChange={(v: string) => { setLessonId(v); if (v) setSelectedStudentIds(allLessons.find((l: any) => l.id === v)?.studentIds || []) }}
              allowClear placeholder="关联课次" style={{ width: '100%' }} options={lessonOptions} />
          </>
        )}

        {/* Student list */}
        {groupId && (
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedGroup?.courseName || '班级'} 学员 ({filteredStudents.length}人)</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input size="small" prefix={<SearchOutlined />} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="搜索" style={{ width: 120, borderRadius: 8 }} />
                <Button size="small" onClick={selectAll}>全选</Button>
                <Button size="small" onClick={clearAll}>清空</Button>
              </div>
            </div>
            {filteredStudents.length === 0 ? (
              <Empty description="该班级暂无学员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {filteredStudents.map((s: any) => {
                  const selected = selectedStudentIds.includes(s.id)
                  const needsFeedback = s.daysSinceLastFeedback === null || s.daysSinceLastFeedback > 7
                  const lowHours = s.remainHours != null && s.remainHours <= 2
                  return (
                    <div key={s.id} onClick={() => toggleStudent(s.id)} style={{
                      padding: 10, borderRadius: 10, cursor: 'pointer', border: selected ? '2px solid #E8784A' : '1px solid #EEE7E1',
                      background: selected ? '#FFF3EC' : '#fff', transition: 'all .15s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#E8784A' }}>{s.name[0]}</div>
                        {needsFeedback && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF9F27' }} title="超过7天未反馈" />}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#7A869A' }}>{[s.grade, s.school].filter(Boolean).join(' / ') || '-'}</div>
                      <div style={{ fontSize: 11, color: '#B0B8C1', marginTop: 2 }}>
                        剩余 {s.remainHours ?? '—'}h {s.attendanceRate != null ? `· 出勤${s.attendanceRate}%` : ''}
                      </div>
                      {s.daysSinceLastFeedback != null && (
                        <div style={{ fontSize: 10, marginTop: 2, color: needsFeedback ? '#EF9F27' : '#1D9E75' }}>
                          {needsFeedback ? `⚠ ${s.daysSinceLastFeedback}天未反馈` : `${s.daysSinceLastFeedback}天前反馈`}
                        </div>
                      )}
                      {lowHours && <div style={{ fontSize: 10, color: '#E24B4A', marginTop: 1 }}>课时不足</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* Selected count + form (mobile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {selectedStudentIds.length > 0 && (
            <Tag color="orange" style={{ borderRadius: 9999 }}>已选 {selectedStudentIds.length} 人</Tag>
          )}
          {!groupId && (
            <div style={{ fontSize: 13, color: '#7A869A', padding: '20px 0', textAlign: 'center' }}>
              请先选择班级，然后选择学员
            </div>
          )}
        </div>

        {/* Mobile: form below students */}
        {isMobile && formSection}
      </div>

      {/* RIGHT: Form (desktop) + history (mobile) */}
      {!isMobile ? (
        <div style={{ position: 'sticky', top: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selectedStudentIds.length === 1 && (
            <StudentContextPanel studentId={selectedStudentIds[0]} />
          )}
          {selectedStudentIds.length > 1 && (
            <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#FFFBF7' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>已选 {selectedStudentIds.length} 位学员</div>
              <div style={{ fontSize: 11, color: '#7A869A' }}>批量反馈适合发共同内容，个性化评价建议单独选择学生补充</div>
            </Card>
          )}
          {formSection}
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>历史反馈</div>
          {history.slice(0, 5).map((item: any) => <FeedbackCard key={item.id} item={item} compact />)}
        </div>
      )}
    </div>
  )
}

export default function TeacherFeedbackPage() {
  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1F2329' }}>成长反馈工作台</h2>
        <div style={{ fontSize: 13, color: '#98A2B3', marginTop: 4 }}>发布后家长实时收到通知，并计入反馈奖励</div>
      </div>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>}>
        <FeedbackPageInner />
      </Suspense>
    </div>
  )
}
