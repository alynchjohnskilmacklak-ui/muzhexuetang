'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Divider, Empty, Image as AntImage, Input, List, Modal, Select, Tag, Typography, Upload } from 'antd'
import {
  ArrowLeftOutlined, BookOutlined, EditOutlined, LineChartOutlined,
  PlusOutlined, RocketOutlined, SaveOutlined, SendOutlined, TrophyOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useSignedUrls } from '@/hooks/useSignedUrls'

const { Text, Paragraph } = Typography
const { TextArea } = Input

type FeedbackItem = {
  id: string
  createdAt: string
  lessonDate: string | null
  courseName: string | null
  knowledgePoints: string[]
  summary: string
  mood: string | null
  imageUrls: string[]
  parentReply: string | null
  parentRepliedAt: string | null
}
type PerformancePost = { id: string; createdAt: string; mood: string; content: string }
type AttendanceRow = { id: string; status: string; courseName: string; lessonDate: string; startTime: string }

type StudentSummary = {
  id: string
  name: string
  grade?: string | null
  gender?: string | null
  school?: string | null
  membershipLevel?: string | null
  parentName?: string | null
  parentPhone?: string | null
  phone?: string | null
  status: string
  courseNames: string[]
  taughtHours: number
  remainHours: number
  attendanceRate: number | null
}

const fetcher = (url: string) => fetch(url).then(async r => {
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || '请求失败')
  return data
})
async function requestJson<T = unknown>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '操作失败')
  return data as T
}

const MOOD_MAP: Record<string, { label: string; color: string }> = {
  GREAT: { label: '非常好', color: '#1D9E75' },
  GOOD: { label: '好', color: '#E8784A' },
  NORMAL: { label: '一般', color: '#f5a623' },
  BAD: { label: '较差', color: '#D4537E' },
}

const ATT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PRESENT: { label: '出勤', color: '#1D9E75', bg: 'rgba(29,158,117,.1)' },
  LEAVE: { label: '请假', color: '#C2572C', bg: 'rgba(245,166,35,.12)' },
  ABSENT: { label: '旷课', color: '#D4537E', bg: 'rgba(212,83,126,.1)' },
  MAKEUP: { label: '补课', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' },
}

function membershipBadge(level?: string | null) {
  if (level === 'SVIP') return { text: '★ SVIP', color: '#5A4420', bg: 'linear-gradient(135deg,#E4C97F,#C9A45C)' }
  if (level === 'VIP') return { text: '★ VIP', color: '#7A3A18', bg: 'linear-gradient(135deg,#F7A97C,#F0875B)' }
  return { text: '普通', color: 'rgba(255,255,255,.85)', bg: 'rgba(255,255,255,.14)' }
}

export function TeacherStudentDetailClient({
  student, feedbacks, performancePosts, attendances,
}: {
  student: StudentSummary
  feedbacks: FeedbackItem[]
  performancePosts: PerformancePost[]
  attendances: AttendanceRow[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState('feedback')

  const badge = membershipBadge(student.membershipLevel)
  const genderText = student.gender === 'male' || student.gender === 'MALE' ? '男' : student.gender === 'female' || student.gender === 'FEMALE' ? '女' : '-'

  // 反馈记录：课堂反馈 + 表现动态按时间倒序合并
  const feedbackTimeline = useMemo(() => {
    const items: Array<{ key: string; kind: 'class' | 'performance'; at: number; node: FeedbackItem | PerformancePost }> = [
      ...feedbacks.map((f) => ({ key: f.id, kind: 'class' as const, at: new Date(f.createdAt).getTime(), node: f })),
      ...performancePosts.map((p) => ({ key: p.id, kind: 'performance' as const, at: new Date(p.createdAt).getTime(), node: p })),
    ]
    return items.sort((a, b) => b.at - a.at)
  }, [feedbacks, performancePosts])

  const allImageKeys = useMemo(() => feedbacks.flatMap((f) => f.imageUrls), [feedbacks])
  const { urls: signedImages } = useSignedUrls(allImageKeys)
  const signedByKey = useMemo(() => {
    const map: Record<string, string> = {}
    allImageKeys.forEach((k, i) => { if (signedImages[i]) map[k] = signedImages[i] })
    return map
  }, [allImageKeys, signedImages])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 96px', overflowX: 'clip' }}>
      {/* 返回 + 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px 12px' }}>
        <Button
          type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push('/teacher/students')}
          style={{ color: '#123C35' }}
        />
        <Text strong style={{ fontSize: 17, color: '#123C35' }}>学员详情</Text>
      </div>

      {/* Hero 卡 */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(155deg,#1B4A3D 0%,#0E5E4E 55%,#123C35 100%)',
        boxShadow: '0 12px 28px rgba(14,94,78,.28)',
        padding: '22px 20px 18px', color: '#fff',
      }}>
        {/* 金色装饰 */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.28),transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: -56, left: -30, width: 130, height: 130, borderRadius: 999, background: 'radial-gradient(circle,rgba(255,255,255,.08),transparent 65%)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, flexShrink: 0,
            background: 'linear-gradient(145deg,#E4C97F,#C9A45C)', color: '#123C35',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, boxShadow: '0 6px 14px rgba(0,0,0,.18)',
          }}>
            {(student.name || '?')[0]}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: .3 }}>{student.name}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
                color: badge.color, background: badge.bg, border: '1px solid rgba(255,255,255,.25)',
              }}>{badge.text}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                background: student.status === 'ACTIVE' ? 'rgba(74,222,128,.16)' : 'rgba(255,255,255,.12)',
                color: student.status === 'ACTIVE' ? '#7CF0B0' : 'rgba(255,255,255,.8)',
                border: '1px solid rgba(255,255,255,.18)',
              }}>
                {student.status === 'ACTIVE' ? '在读' : student.status === 'COMPLETED' ? '已结课' : student.status === 'TRIAL' ? '试听' : student.status}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{student.grade || '未设年级'} · {genderText}</span>
              {student.school && <span style={{ opacity: .75 }}>· {student.school}</span>}
            </div>
            {student.courseNames.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {student.courseNames.slice(0, 3).map((name, i) => (
                  <span key={`${name}-${i}`} style={{
                    fontSize: 11, padding: '2px 9px', borderRadius: 999,
                    background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.9)',
                    border: '1px solid rgba(255,255,255,.2)',
                  }}>{name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          position: 'relative', marginTop: 18, display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8,
          background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '12px 6px',
          border: '1px solid rgba(255,255,255,.12)',
        }}>
          <HeroMetric label="出勤率" value={student.attendanceRate == null ? '--' : `${student.attendanceRate}%`} accent={student.attendanceRate != null && student.attendanceRate >= 90} />
          <HeroMetric label="已上课时" value={`${student.taughtHours}h`} />
          <HeroMetric label="剩余课时" value={`${student.remainHours}h`} accent={student.remainHours <= 0} />
          <HeroMetric label="课堂反馈" value={`${feedbacks.length}次`} />
        </div>
      </div>

      {/* 快捷操作 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginTop: 12 }}>
        <div onClick={() => router.push(`/teacher/feedback?studentId=${student.id}`)} style={{
          borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
          background: 'linear-gradient(135deg,#F0875B,#E8784A)',
          boxShadow: '0 8px 18px rgba(232,120,74,.30)',
          color: '#fff', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}><EditOutlined /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>写课堂反馈</div>
            <div style={{ fontSize: 11, opacity: .85, marginTop: 1 }}>记录本节课表现与作业</div>
          </div>
        </div>
        <div onClick={() => router.push(`/teacher/feedback?studentId=${student.id}`)} style={{
          borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
          border: '1.5px solid rgba(14,94,78,.25)', background: '#fff',
          color: '#123C35', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: 'rgba(14,94,78,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}><SendOutlined /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>写表现反馈</div>
            <div style={{ fontSize: 11, color: '#8d806f', marginTop: 1 }}>学习状态、进步与建议</div>
          </div>
        </div>
      </div>

      {/* 家长信息条 */}
      {(student.parentName || student.parentPhone || student.phone) && (
        <div style={{
          marginTop: 10, borderRadius: 14, border: '1px solid var(--color-hairline)',
          background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 15 }}>👨‍👩‍👧</span>
          <div style={{ fontSize: 13, color: '#123C35', flex: 1, minWidth: 0 }}>
            <Text strong>{student.parentName || '未填写家长'}</Text>
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{student.parentPhone || student.phone || '未填写电话'}</Text>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 16, padding: '0 2px' }}>
        {[
          { key: 'feedback', label: '反馈记录', icon: <BookOutlined /> },
          { key: 'lessons', label: '上课记录', icon: <LineChartOutlined /> },
          { key: 'growth', label: '成长档案', icon: <TrophyOutlined /> },
        ].map((t) => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 12, cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 800 : 500,
            background: tab === t.key ? 'linear-gradient(135deg,#1B4A3D,#0E5E4E)' : '#fff',
            color: tab === t.key ? '#fff' : '#5a4e3a',
            border: tab === t.key ? 'none' : '1px solid var(--color-hairline)',
            boxShadow: tab === t.key ? '0 6px 14px rgba(14,94,78,.22)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {t.icon}{t.label}
          </div>
        ))}
      </div>

      {/* 反馈记录 */}
      {tab === 'feedback' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!feedbackTimeline.length && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ color: '#8d806f', fontSize: 13 }}>
                  <div>还没有反馈记录</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>上完课后记得为 TA 写课堂反馈</div>
                </div>
              }
              style={{ padding: '36px 0' }}
            />
          )}
          {feedbackTimeline.map((item) => item.kind === 'class' ? (
            <ClassFeedbackCard key={item.key} f={item.node as FeedbackItem} signedByKey={signedByKey} />
          ) : (
            <PerformanceCard key={item.key} p={item.node as PerformancePost} />
          ))}
        </div>
      )}

      {/* 上课记录 */}
      {tab === 'lessons' && (
        <div style={{ marginTop: 12 }}>
          {!attendances.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: '#8d806f', fontSize: 13 }}>暂无上课记录</span>} style={{ padding: '36px 0' }} />
          ) : (
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'linear-gradient(180deg,rgba(232,120,74,.5),rgba(14,94,78,.2))', borderRadius: 2 }} />
              {attendances.map((a) => {
                const st = ATT_STATUS[a.status] || { label: a.status, color: '#8d806f', bg: 'rgba(0,0,0,.04)' }
                return (
                  <div key={a.id} style={{ position: 'relative', paddingBottom: 14 }}>
                    <div style={{ position: 'absolute', left: -17.5, top: 4, width: 11, height: 11, borderRadius: 999, background: st.color, border: '2.5px solid #fff', boxShadow: '0 0 0 2px rgba(0,0,0,.04)' }} />
                    <div style={{
                      background: '#fff', border: '1px solid var(--color-hairline)', borderRadius: 14,
                      padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#123C35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.courseName}</div>
                          <div style={{ fontSize: 12, color: '#8d806f', marginTop: 3 }}>
                            {a.lessonDate.slice(0, 10)} {a.startTime}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                          background: st.bg, color: st.color, whiteSpace: 'nowrap',
                        }}>{st.label}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 成长档案 */}
      {tab === 'growth' && <GrowthArchive studentId={student.id} />}
    </div>
  )
}

function HeroMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: accent ? '#F7A97C' : '#E4C97F', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function ClassFeedbackCard({ f, signedByKey }: { f: FeedbackItem; signedByKey: Record<string, string> }) {
  const mood = f.mood ? (MOOD_MAP[f.mood] || { label: f.mood, color: '#8d806f' }) : null
  const imgs = f.imageUrls.map((k) => signedByKey[k]).filter(Boolean)
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--color-hairline)', borderRadius: 16, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 14, color: '#123C35' }}>{f.courseName || '课堂反馈'}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
            {f.lessonDate ? f.lessonDate.slice(0, 10) : f.createdAt.slice(0, 10)}
          </Text>
        </div>
        {mood && <span style={{ fontSize: 12, fontWeight: 700, color: mood.color, background: 'rgba(0,0,0,.04)', padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{mood.label}</span>}
      </div>
      {f.knowledgePoints.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {f.knowledgePoints.slice(0, 6).map((kp, i) => (
            <Tag key={`${kp}-${i}`} style={{ fontSize: 11, margin: 0, background: 'rgba(14,94,78,.06)', color: '#0E5E4E', border: '1px solid rgba(14,94,78,.15)', borderRadius: 6 }}>{kp}</Tag>
          ))}
        </div>
      )}
      <Paragraph style={{ fontSize: 13, color: '#3d3a33', marginBottom: 0, lineHeight: 1.65 }} ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}>
        {f.summary || '（无文字内容）'}
      </Paragraph>
      {imgs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {imgs.slice(0, 6).map((url, i) => (
            <AntImage key={i} src={url} width={64} height={64} style={{ borderRadius: 10, objectFit: 'cover' }} preview />
          ))}
        </div>
      )}
      {f.parentReply && (
        <div style={{ marginTop: 10, borderRadius: 10, background: 'rgba(201,164,92,.08)', border: '1px solid rgba(201,164,92,.2)', padding: '8px 12px', fontSize: 12, color: '#7a6424' }}>
          <Text style={{ fontSize: 11, color: '#C9A45C', fontWeight: 700 }}>家长回复</Text>
          <div style={{ marginTop: 2, color: '#5a4e3a' }}>{f.parentReply}</div>
        </div>
      )}
    </div>
  )
}

function PerformanceCard({ p }: { p: PerformancePost }) {
  const mood = MOOD_MAP[p.mood] || { label: p.mood, color: '#8d806f' }
  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-hairline)', borderRadius: 16, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#123C35' }}>
          <span style={{ color: mood.color, marginRight: 6 }}>表现反馈 · {mood.label}</span>
        </span>
        <Text type="secondary" style={{ fontSize: 11 }}>{p.createdAt.slice(0, 10)}</Text>
      </div>
      <Paragraph style={{ fontSize: 13, color: '#3d3a33', marginBottom: 0, lineHeight: 1.6 }} ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}>
        {p.content}
      </Paragraph>
    </div>
  )
}

/* ============ 成长档案（阶段总结 / 学习目标 / 薄弱点 / 掌握度） ============ */
function GrowthArchive({ studentId }: { studentId: string }) {
  const [summary, setSummary] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [keywords, setKeywords] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const [goals, setGoals] = useState<Array<{ id: string; subject: string; goalDesc: string; isAchieved: boolean }>>([])
  const [goalSubject, setGoalSubject] = useState('')
  const [goalDesc, setGoalDesc] = useState('')

  const [weaknesses, setWeaknesses] = useState<Array<{ id: string; topic: string; mistakeCount: number; suggestion?: string | null }>>([])
  const [weakTopic, setWeakTopic] = useState('')
  const [weakCount, setWeakCount] = useState<number | null>(1)
  const [weakSuggestion, setWeakSuggestion] = useState('')

  const [mastery, setMastery] = useState<Array<{ id: string; knowledgePoint: string; level: string }>>([])
  const [kpInput, setKpInput] = useState('')
  const [kpLevel, setKpLevel] = useState('NEEDS_REVIEW')
  const [kpNote, setKpNote] = useState('')

  useEffect(() => {
    fetcher(`/api/teacher/stage-summary?studentId=${studentId}&months=3`).then((d: { draft?: { summary?: string; suggestions?: string } | null }) => {
      if (d.draft?.summary) setSummary(d.draft.summary)
      if (d.draft?.suggestions) setSuggestions(d.draft.suggestions)
    }).catch(() => {})
    fetcher(`/api/teacher/learning-goals?studentId=${studentId}`).then((d: { goals?: Array<{ id: string; subject: string; goalDesc: string; isAchieved: boolean }> }) => setGoals(d.goals || [])).catch(() => {})
    fetcher(`/api/teacher/weaknesses?studentId=${studentId}`).then((d: { weaknesses?: Array<{ id: string; topic: string; mistakeCount: number; suggestion?: string | null }> }) => setWeaknesses(d.weaknesses || [])).catch(() => {})
    fetcher(`/api/teacher/mastery?studentId=${studentId}`).then((d: { records?: Array<{ id: string; knowledgePoint: string; level: string }> }) => setMastery(d.records || [])).catch(() => {})
  }, [studentId])

  async function doAiGenerate() {
    setAiGenerating(true)
    try {
      const res = await requestJson<{ draft?: string }>('/api/teacher/ai-feedback', { method: 'POST', body: JSON.stringify({ studentId, keywords, kind: 'stage' }) })
      if (res.draft) { setSummary(res.draft); toast.success('AI 草稿已生成，请核对后保存') } else toast.warning('AI 未返回内容，请稍后重试')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '生成失败') }
    finally { setAiGenerating(false) }
  }

  async function saveStage(publish = false) {
    if (publish) setPublishing(true); else setSaving(true)
    try {
      const d = await requestJson<{ stageSummary: { id: string } }>('/api/teacher/stage-summary', {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          periodStart: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10),
          periodEnd: new Date().toISOString().slice(0, 10),
          summary, suggestions,
        }),
      })
      if (publish) {
        await requestJson('/api/teacher/stage-summary', { method: 'PATCH', body: JSON.stringify({ id: d.stageSummary.id, action: 'publish' }) })
        toast.success('已发布，家长端将显示本期寄语')
      } else toast.success('草稿已保存')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '保存失败') }
    finally { setSaving(false); setPublishing(false) }
  }

  async function addGoal() {
    try {
      await requestJson('/api/teacher/learning-goals', { method: 'POST', body: JSON.stringify({ studentId, subject: goalSubject, goalDesc }) })
      toast.success('目标已添加'); setGoalSubject(''); setGoalDesc('')
      const d = await fetcher(`/api/teacher/learning-goals?studentId=${studentId}`) as { goals?: Array<{ id: string; subject: string; goalDesc: string; isAchieved: boolean }> }; setGoals(d.goals || [])
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '添加失败') }
  }

  async function toggleGoal(id: string, isAchieved: boolean) {
    try {
      await requestJson('/api/teacher/learning-goals', { method: 'PATCH', body: JSON.stringify({ id, isAchieved }) })
      setGoals(goals.map((g) => g.id === id ? { ...g, isAchieved } : g))
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '更新失败') }
  }

  async function addWeakness() {
    try {
      await requestJson('/api/teacher/weaknesses', { method: 'POST', body: JSON.stringify({ studentId, topic: weakTopic, mistakeCount: weakCount, suggestion: weakSuggestion }) })
      toast.success('薄弱点已记录'); setWeakTopic(''); setWeakCount(1); setWeakSuggestion('')
      const d = await fetcher(`/api/teacher/weaknesses?studentId=${studentId}`) as { weaknesses?: Array<{ id: string; topic: string; mistakeCount: number; suggestion?: string | null }> }; setWeaknesses(d.weaknesses || [])
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '添加失败') }
  }

  async function addMastery() {
    try {
      await requestJson('/api/teacher/mastery', { method: 'POST', body: JSON.stringify({ studentId, knowledgePoint: kpInput, level: kpLevel, note: kpNote }) })
      toast.success('掌握度已记录'); setKpInput(''); setKpLevel('NEEDS_REVIEW'); setKpNote('')
      const d = await fetcher(`/api/teacher/mastery?studentId=${studentId}`) as { records?: Array<{ id: string; knowledgePoint: string; level: string }> }; setMastery(d.records || [])
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '添加失败') }
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 阶段总结 */}
      <div style={{ background: '#fff', border: '1px solid var(--color-hairline)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#C9A45C' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#123C35' }}>阶段总结 · 家长寄语</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Input size="small" placeholder="AI 关键词（如：进步、专注）" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={{ flex: 1 }} />
          <Button size="small" icon={<RocketOutlined />} loading={aiGenerating} onClick={doAiGenerate} style={{ background: 'linear-gradient(135deg,#1B4A3D,#0E5E4E)', color: '#fff', border: 'none' }}>AI 生成</Button>
        </div>
        <TextArea rows={4} placeholder="总结本阶段学习情况、进步与亮点…" value={summary} onChange={(e) => setSummary(e.target.value)} style={{ borderRadius: 10, fontSize: 13 }} />
        <div style={{ marginTop: 8 }}>
          <TextArea rows={2} placeholder="给家长的建议（选填）" value={suggestions} onChange={(e) => setSuggestions(e.target.value)} style={{ borderRadius: 10, fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button size="small" icon={<SaveOutlined />} loading={saving} onClick={() => saveStage(false)} style={{ flex: 1 }}>保存草稿</Button>
          <Button size="small" type="primary" icon={<SendOutlined />} loading={publishing} onClick={() => saveStage(true)} style={{ flex: 1, background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>发布寄语</Button>
        </div>
      </div>

      {/* 学习目标 */}
      <div style={{ background: '#fff', border: '1px solid var(--color-hairline)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#E8784A' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#123C35' }}>学习目标</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <Input size="small" placeholder="学科" value={goalSubject} onChange={(e) => setGoalSubject(e.target.value)} style={{ width: 88 }} />
          <Input size="small" placeholder="目标描述" value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addGoal} style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>添加</Button>
        </div>
        {!goals.length ? <div style={{ color: '#98A2B3', fontSize: 12, padding: '4px 0' }}>暂无学习目标，为 TA 设定一个吧</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {goals.map((g) => (
              <div key={g.id} onClick={() => toggleGoal(g.id, !g.isAchieved)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
                background: g.isAchieved ? 'rgba(29,158,117,.07)' : 'rgba(232,120,74,.05)',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 13 }}>{g.isAchieved ? '✅' : '🎯'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: g.isAchieved ? '#1D9E75' : '#123C35', textDecoration: g.isAchieved ? 'line-through' : 'none' }}>
                    {g.subject ? `[${g.subject}] ` : ''}{g.goalDesc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 薄弱点 */}
      <div style={{ background: '#fff', border: '1px solid var(--color-hairline)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#D4537E' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#123C35' }}>薄弱点记录</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <Input size="small" placeholder="知识点/题型" value={weakTopic} onChange={(e) => setWeakTopic(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
          <Input size="small" type="number" min={1} placeholder="错次" value={weakCount ?? ''} onChange={(e) => setWeakCount(Number(e.target.value))} style={{ width: 64 }} />
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addWeakness} style={{ background: '#D4537E', borderColor: '#D4537E' }}>记录</Button>
        </div>
        {!weaknesses.length ? <div style={{ color: '#98A2B3', fontSize: 12, padding: '4px 0' }}>暂无薄弱点记录</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weaknesses.map((w) => (
              <div key={w.id} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(212,83,126,.05)', border: '1px solid rgba(212,83,126,.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#123C35' }}>{w.topic}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#D4537E', whiteSpace: 'nowrap' }}>错 {w.mistakeCount} 次</span>
                </div>
                {w.suggestion && <div style={{ fontSize: 12, color: '#8d806f', marginTop: 3 }}>建议：{w.suggestion}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 掌握度 */}
      <div style={{ background: '#fff', border: '1px solid var(--color-hairline)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#1D9E75' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#123C35' }}>知识掌握度</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <Input size="small" placeholder="知识点" value={kpInput} onChange={(e) => setKpInput(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
          <Select
            size="small" value={kpLevel} onChange={setKpLevel} style={{ width: 90 }}
            options={[{ value: 'MASTERED', label: '已掌握' }, { value: 'NEEDS_REVIEW', label: '需复习' }, { value: 'NEEDS_PRACTICE', label: '薄弱' }]}
          />
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addMastery} style={{ background: '#1D9E75', borderColor: '#1D9E75' }}>记录</Button>
        </div>
        {!mastery.length ? <div style={{ color: '#98A2B3', fontSize: 12, padding: '4px 0' }}>暂无掌握度记录</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mastery.map((m) => {
              const cfg = { MASTERED: { label: '已掌握', color: '#1D9E75', bg: 'rgba(29,158,117,.08)' }, NEEDS_REVIEW: { label: '需复习', color: '#C2572C', bg: 'rgba(245,166,35,.12)' }, NEEDS_PRACTICE: { label: '薄弱', color: '#D4537E', bg: 'rgba(212,83,126,.08)' } }[m.level] || { label: m.level, color: '#8d806f', bg: 'rgba(0,0,0,.04)' }
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: cfg.bg }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#123C35' }}>{m.knowledgePoint}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
