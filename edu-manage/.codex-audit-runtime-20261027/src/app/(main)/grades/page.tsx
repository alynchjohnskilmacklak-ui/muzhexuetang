'use client'

import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Button, Empty, Input, Select, Spin, Tag,
} from 'antd'
import {
  ArrowLeftOutlined, BookOutlined, CalendarOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  FileDoneOutlined, SearchOutlined, TeamOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { PageLayout } from '@/components/Layout/PageLayout'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { useIsMobile } from '@/hooks/useIsMobile'

const fetcher = (url: string) => fetch(url).then((response) => {
  if (!response.ok) throw new Error('加载失败')
  return response.json()
})

const SUBJECT_COLORS: Record<string, string> = {
  数学: '#E8784A', 英语: '#185FA5', 物理: '#7C5CFF', 化学: '#1D9E75', 语文: '#D4537E', 生物: '#3FA796', 其他: '#8A8F98',
}

const MEMBER_STYLE: Record<string, { label: string; fg: string; bg: string }> = {
  SVIP: { label: 'SVIP', fg: '#5C3D1A', bg: 'linear-gradient(135deg,#F6D9A8,#E9B96C)' },
  VIP: { label: 'VIP', fg: '#8A5A1E', bg: 'linear-gradient(135deg,#FDE8C8,#F6D9A8)' },
  NORMAL: { label: '普通', fg: '#6B7280', bg: 'rgba(152,162,179,.14)' },
}

function accuracyColor(accuracy: number): string {
  if (accuracy >= 85) return '#1D9E75'
  if (accuracy >= 60) return '#E8784A'
  return '#D9534F'
}

function AvatarBlock({ name, size = 44, photoUrl, gender }: {
  name: string; grade?: string | null; size?: number; photoUrl?: string | null; gender?: string | null
}) {
  return <StudentAvatar photoUrl={photoUrl} gender={gender} name={name} size={size} rounded={false} />
}

function AccuracyBar({ value, height = 6 }: { value: number; height?: number }) {
  const color = accuracyColor(value)
  return (
    <div style={{ height, borderRadius: 999, background: 'rgba(152,162,179,.16)', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`, borderRadius: 999, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
    </div>
  )
}

function GroupStats({
  list, onSelect, isMobile,
}: {
  list: StudentStat[]
  onSelect: (studentId: string) => void
  isMobile: boolean
}) {
  // 各年级答题量对比
  const gradeAgg = useMemo(() => {
    const map = new Map<string, { students: number; questions: number; attempts: number; correct: number }>()
    list.forEach((item) => {
      const key = item.grade || '未分级'
      const current = map.get(key) || { students: 0, questions: 0, attempts: 0, correct: 0 }
      current.students += 1
      current.questions += item.totalQuestions
      current.attempts += item.totalAttempts
      current.correct += item.totalCorrect
      map.set(key, current)
    })
    const order = ['初一', '初二', '初三', '高一', '高二', '高三', '个性化']
    return [...map.entries()].map(([grade, stat]) => ({ grade, ...stat }))
      .sort((a, b) => {
        const ia = order.indexOf(a.grade), ib = order.indexOf(b.grade)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
  }, [list])
  const maxGradeQuestions = Math.max(...gradeAgg.map((item) => item.questions), 1)

  // 学科答题分布
  const subjectAgg = useMemo(() => {
    const map = new Map<string, { questions: number; correct: number; students: number }>()
    list.forEach((item) => {
      item.subjectStats.forEach((stat) => {
        const current = map.get(stat.subject) || { questions: 0, correct: 0, students: 0 }
        current.questions += stat.questions
        current.correct += stat.correct
        current.students += 1
        map.set(stat.subject, current)
      })
    })
    return [...map.entries()].map(([subject, stat]) => ({ subject, ...stat })).sort((a, b) => b.questions - a.questions)
  }, [list])
  const maxSubjectQuestions = Math.max(...subjectAgg.map((item) => item.questions), 1)

  // 正确率区间分布
  const bands = useMemo(() => {
    const bandsDef = [
      { label: '优秀 90%+', min: 90, color: '#1D9E75' },
      { label: '良好 70-89%', min: 70, color: '#27A644' },
      { label: '中等 50-69%', min: 50, color: '#E8784A' },
      { label: '待提升 <50%', min: 0, color: '#D9534F' },
    ]
    return bandsDef.map((band) => ({
      ...band,
      count: list.filter((item) => item.accuracy >= band.min && (band.label.startsWith('优秀') || item.accuracy < (bandsDef[bandsDef.indexOf(band) - 1]?.min ?? 999))).length,
    }))
  }, [list])
  const maxBand = Math.max(...bands.map((band) => band.count), 1)

  const activeTop = useMemo(() => [...list].sort((a, b) => b.totalAttempts - a.totalAttempts).slice(0, 5), [list])

  const barRow = (label: string, value: number, max: number, color: string, extra?: string) => (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3A4A40', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}{extra || ''}</span>
      </div>
      <div style={{ height: 9, borderRadius: 999, background: 'rgba(152,162,179,.14)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(2, Math.round((value / max) * 100))}%`, borderRadius: 999, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
      {/* 年级答题量 */}
      <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2329', marginBottom: 12 }}>各年级答题量对比</div>
        {gradeAgg.length === 0 ? <div style={{ color: '#98A2B3', fontSize: 12.5, padding: '12px 0' }}>暂无数据</div> : gradeAgg.map((item) => barRow(
          `${item.grade}（${item.students}人）`,
          item.questions,
          maxGradeQuestions,
          '#0E5E4E',
          ' 题',
        ))}
      </div>

      {/* 学科热度 */}
      <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2329', marginBottom: 12 }}>学科练习分布</div>
        {subjectAgg.length === 0 ? <div style={{ color: '#98A2B3', fontSize: 12.5, padding: '12px 0' }}>暂无数据</div> : subjectAgg.map((item) => barRow(
          `${item.subject}（${item.students}人练）`,
          item.questions,
          maxSubjectQuestions,
          SUBJECT_COLORS[item.subject] || '#8A8F98',
          ' 题',
        ))}
      </div>

      {/* 正确率区间 */}
      <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2329', marginBottom: 12 }}>学员正确率分布</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {bands.map((band) => (
            <div key={band.label}>
              <div style={{ fontSize: 20, fontWeight: 800, color: band.color, fontVariantNumeric: 'tabular-nums' }}>{band.count}<span style={{ fontSize: 12, color: '#98A2B3', fontWeight: 600 }}> 人</span></div>
              <div style={{ fontSize: 11.5, color: '#98A2B3', marginBottom: 5 }}>{band.label}</div>
              <div style={{ height: 7, borderRadius: 999, background: 'rgba(152,162,179,.14)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(2, Math.round((band.count / maxBand) * 100))}%`, borderRadius: 999, background: band.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 活跃学员 */}
      <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2329', marginBottom: 10 }}>练习最活跃学员</div>
        {activeTop.length === 0 ? (
          <div style={{ color: '#98A2B3', fontSize: 12.5, padding: '12px 0' }}>暂无数据</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {activeTop.map((item, index) => (
              <button
                key={item.studentId}
                onClick={() => onSelect(item.studentId)}
                style={{
                  fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%',
                  display: 'flex', alignItems: 'center', gap: 9,
                  borderRadius: 11, padding: '8px 10px', background: '#F7F5F1', border: '1px solid #EFE8DD',
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 800, color: index < 3 ? '#C9A45C' : '#98A2B3', width: 16 }}>{index + 1}</span>
                <AvatarBlock name={item.name} grade={item.grade} gender={item.gender} size={28} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1F2329' }}>{item.name}</div>
                  <div style={{ fontSize: 10.5, color: '#98A2B3' }}>{item.grade || ''} · 正确率 {item.accuracy}%</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0E5E4E', fontVariantNumeric: 'tabular-nums' }}>{item.totalAttempts}</div>
                  <div style={{ fontSize: 10, color: '#98A2B3' }}>次练习</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function rankMessage(rank: number, gap: number, questions: number): { text: string; fg: string } {
  if (rank === 1) {
    return {
      text: gap > 0
        ? `全年级做题冠军，已超出第 2 名 ${gap} 题，这份坚持太棒了，继续保持！`
        : '全年级做题冠军，你就是本周练习之星，继续领跑！',
      fg: '#C9A45C',
    }
  }
  if (rank === 2) {
    return { text: `离榜首只差 ${gap} 题，再加把劲就能登顶！`, fg: '#E8784A' }
  }
  if (rank === 3) {
    return { text: '稳居前三，继续积累，争取再进一步！', fg: '#8A6B2F' }
  }
  return { text: `距上一名还差 ${gap} 题，坚持练习很快就能超越！`, fg: '#6B7280' }
}

function LeaderboardCard({
  list, grade, gradeOptions, onGradeChange, onSelect,
}: {
  list: StudentStat[]
  grade: string
  gradeOptions: string[]
  onGradeChange: (grade: string) => void
  onSelect: (studentId: string) => void
}) {
  const board = useMemo(() => {
    const scoped = grade ? list.filter((item) => item.grade === grade) : list
    return [...scoped].sort((a, b) => b.totalQuestions - a.totalQuestions).slice(0, 10)
  }, [list, grade])

  const medal = ['linear-gradient(145deg,#F6D9A8,#E9B96C)', 'linear-gradient(145deg,#E8E8EC,#C9CDD4)', 'linear-gradient(145deg,#F0C9A8,#DE9E6E)']

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(201,164,92,.5)', background: 'linear-gradient(155deg,#17352F 0%,#0E5E4E 60%,#0B4B40 100%)', boxShadow: '0 10px 26px rgba(18,60,53,.2)', marginBottom: 14, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -46, right: -30, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,164,92,.22), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(145deg,#F2E3B6,#D8BC7C)', color: '#123C35',
              display: 'grid', placeItems: 'center', fontSize: 16,
              boxShadow: '0 4px 10px rgba(0,0,0,.2)',
            }}>🏆</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#F5F1E8' }}>做题先锋榜</div>
              <div style={{ fontSize: 11.5, color: 'rgba(245,241,232,.6)' }}>同年级答题量排行 · 鼓励每一个坚持</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onGradeChange('')}
              style={{
                fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
                border: grade === '' ? '1px solid #F2E3B6' : '1px solid rgba(242,227,182,.3)',
                color: grade === '' ? '#123C35' : 'rgba(245,241,232,.75)',
                background: grade === '' ? 'linear-gradient(135deg,#F2E3B6,#D8BC7C)' : 'rgba(255,255,255,.06)',
                fontFamily: 'inherit',
              }}
            >全部年级</button>
            {gradeOptions.slice(0, 4).map((option) => (
              <button
                key={option}
                onClick={() => onGradeChange(grade === option ? '' : option)}
                style={{
                  fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
                  border: grade === option ? '1px solid #F2E3B6' : '1px solid rgba(242,227,182,.3)',
                  color: grade === option ? '#123C35' : 'rgba(245,241,232,.75)',
                  background: grade === option ? 'linear-gradient(135deg,#F2E3B6,#D8BC7C)' : 'rgba(255,255,255,.06)',
                  fontFamily: 'inherit',
                }}
              >{option}</button>
            ))}
          </div>
        </div>

        {board.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(245,241,232,.5)', fontSize: 12.5, padding: '28px 0 12px' }}>
            这个年级还没有做题记录，快鼓励学员开始练习吧
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
            {board.map((item, index) => {
              const rank = index + 1
              const previous = index > 0 ? board[index - 1].totalQuestions : 0
              const gap = rank === 1 ? (board.length > 1 ? previous - board[1]?.totalQuestions : 0) : previous - item.totalQuestions
              const msg = rankMessage(rank, gap, item.totalQuestions)
              return (
                <button
                  key={item.studentId}
                  onClick={() => onSelect(item.studentId)}
                  style={{
                    fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%',
                    borderRadius: 13, padding: '9px 12px',
                    background: rank <= 3 ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)',
                    border: rank === 1 ? '1px solid rgba(242,227,182,.45)' : '1px solid rgba(242,227,182,.14)',
                    display: 'flex', alignItems: 'center', gap: 9, transition: 'background .15s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    fontSize: 12.5, fontWeight: 800,
                    color: rank <= 3 ? '#123C35' : 'rgba(245,241,232,.85)',
                    background: rank <= 3 ? medal[rank - 1] : 'rgba(255,255,255,.1)',
                    border: rank <= 3 ? '1px solid rgba(255,255,255,.5)' : '1px solid rgba(242,227,182,.25)',
                  }}>{rank}</div>
                  <AvatarBlock name={item.name} grade={item.grade} gender={item.gender} size={32} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#F5F1E8' }}>{item.name}</span>
                      <span style={{ fontSize: 10.5, color: 'rgba(245,241,232,.55)' }}>{item.grade || ''} · 正确率 {item.accuracy}%</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: msg.fg, marginTop: 2 }}>{msg.text}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: rank === 1 ? '#F2E3B6' : '#F5F1E8', fontVariantNumeric: 'tabular-nums' }}>{item.totalQuestions}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(245,241,232,.55)' }}>答题数</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

type StudentStat = {
  studentId: string
  name: string
  grade: string | null
  gender: string | null
  membershipLevel: string
  totalAttempts: number
  totalQuestions: number
  totalCorrect: number
  accuracy: number
  lastPracticeAt: string | null
  subjectStats: Array<{ subject: string; attempts: number; questions: number; correct: number; accuracy: number }>
}

type StudentDetail = {
  student: {
    id: string; name: string; grade: string | null; gender: string | null;
    membershipLevel: string; school: string | null; phone: string | null;
    remainHours: number; totalHours: number; enrolledAt: string;
  }
  stats: { totalAttempts: number; totalQuestions: number; totalCorrect: number; totalWrong: number; accuracy: number; lastPracticeAt: string | null }
  subjectStats: Array<{ subject: string; attempts: number; questions: number; correct: number; accuracy: number }>
  dailyTrend: Array<{ date: string; label: string; questions: number; attempts: number; accuracy: number }>
  attempts: Array<{
    id: string; setId: string; setTitle: string; subject: string; grade: string;
    score: number; total: number; accuracy: number; wrongCount: number; finishedAt: string;
    wrongQuestions: Array<{ prompt: string; userAnswer: string; correctAnswer: string; explanation: string; imageUrl?: string }>
  }>
  hasMore: boolean
  nextPage: number | null
}

export default function GradesPage() {
  const isMobile = useIsMobile() ?? false
  const [filterGrade, setFilterGrade] = useState<string>('')
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [search, setSearch] = useState('')
  const [leaderboardGrade, setLeaderboardGrade] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailPage, setDetailPage] = useState(1)
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null)

  const { data, isLoading } = useSWR<{ overview: { practicingStudents: number; totalAttempts: number; totalQuestions: number; accuracy: number }; list: StudentStat[] }>('/api/admin/practice-stats', fetcher)
  const list = data?.list || []

  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    list.forEach((item) => { if (item.grade) set.add(String(item.grade)) })
    const order = ['初一', '初二', '初三', '高一', '高二', '高三', '个性化']
    return [...set].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [list])

  const subjectOptions = useMemo(() => {
    const set = new Set<string>()
    list.forEach((item) => item.subjectStats.forEach((stat) => set.add(stat.subject)))
    return [...set]
  }, [list])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return list.filter((item) => {
      if (filterGrade && item.grade !== filterGrade) return false
      if (filterSubject && !item.subjectStats.some((stat) => stat.subject === filterSubject)) return false
      if (keyword && !item.name.toLowerCase().includes(keyword)) return false
      return true
    })
  }, [list, filterGrade, filterSubject, search])

  const { data: detailData, isLoading: detailLoading } = useSWR<StudentDetail>(
    selectedId ? `/api/admin/practice-stats/${selectedId}?page=${detailPage}` : null,
    fetcher,
  )

  const openDetail = useCallback((studentId: string) => {
    setSelectedId(studentId)
    setDetailPage(1)
    setExpandedAttempt(null)
  }, [])

  const backToList = useCallback(() => {
    setSelectedId(null)
  }, [])

  const overviewCards = [
    { label: '练习学员', value: data?.overview.practicingStudents ?? 0, icon: <TeamOutlined />, grad: 'linear-gradient(145deg,#4C8DFF,#2f6fdb)' },
    { label: '累计做题', value: data?.overview.totalAttempts ?? 0, icon: <FileDoneOutlined />, grad: 'linear-gradient(145deg,#27a644,#15804F)' },
    { label: '累计答题', value: data?.overview.totalQuestions ?? 0, icon: <BookOutlined />, grad: 'linear-gradient(145deg,#FFB84D,#E8784A)' },
    { label: '平均正确率', value: `${data?.overview.accuracy ?? 0}%`, icon: <CheckCircleOutlined />, grad: 'linear-gradient(145deg,#7C5CFF,#5A3FD6)' },
  ]

  const topBar = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
      <Select
        value={filterGrade || undefined}
        placeholder="全部年级"
        allowClear
        options={gradeOptions.map((grade) => ({ value: grade, label: grade }))}
        onChange={(value) => setFilterGrade(value || '')}
        style={{ minWidth: 110 }}
      />
      <Select
        value={filterSubject || undefined}
        placeholder="全部学科"
        allowClear
        options={subjectOptions.map((subject) => ({ value: subject, label: subject }))}
        onChange={(value) => setFilterSubject(value || '')}
        style={{ minWidth: 110 }}
      />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="搜索学员姓名"
        prefix={<SearchOutlined style={{ color: '#98A2B3' }} />}
        allowClear
        style={{ maxWidth: 200, borderRadius: 10 }}
      />
    </div>
  )

  if (isMobile && selectedId) {
    return (
      <div style={{ padding: 12, maxWidth: 720, margin: '0 auto' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={backToList} style={{ marginBottom: 10, borderRadius: 10, borderColor: '#D8C9A8', color: '#0E5E4E' }}>返回学员列表</Button>
        {renderDetail(detailLoading, detailData, expandedAttempt, setExpandedAttempt)}
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#1F2329' }}>题库练习统计</div>
        <div style={{ color: '#98A2B3', fontSize: 13, marginTop: 2 }}>学员做题数据全览：练习次数、答题量、正确率与学科掌握情况</div>
      </div>

      {/* 总览统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
        {overviewCards.map((card) => (
          <div key={card.label} style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: card.grad, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, boxShadow: '0 4px 10px rgba(58,50,39,.12)' }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1F2329', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
                <div style={{ color: '#98A2B3', fontSize: 12, marginTop: 1 }}>{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {topBar}

      <LeaderboardCard
        list={list}
        grade={leaderboardGrade}
        gradeOptions={gradeOptions}
        onGradeChange={setLeaderboardGrade}
        onSelect={openDetail}
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0E9DF', padding: 40 }}>
          <Empty description={list.length === 0 ? '还没有学员产生做题记录，等学员完成题库练习后这里会展示统计' : '没有符合条件的学员'}>
            {list.length === 0 && <div style={{ color: '#98A2B3', fontSize: 12.5 }}>学员在家长端「学习资料 · 题库练习」完成作答后自动统计</div>}
          </Empty>
        </div>
      ) : (
        <>
          {isMobile && !selectedId && <GroupStats list={list} onSelect={openDetail} isMobile />}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 380px) 1fr', gap: 14, alignItems: 'start' }}>
          {/* 学员列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12.5, color: '#98A2B3', fontWeight: 600 }}>共 {filtered.length} 名学员</div>
            {filtered.map((item) => (
              <button
                key={item.studentId}
                onClick={() => openDetail(item.studentId)}
                style={{
                  textAlign: 'left', cursor: 'pointer', border: item.studentId === selectedId ? '1px solid rgba(201,164,92,.7)' : '1px solid #F0E9DF',
                  borderRadius: 16, padding: '12px 14px', background: item.studentId === selectedId ? 'linear-gradient(150deg,#FDFAF3,#F7F1E2)' : '#fff',
                  boxShadow: '0 4px 14px rgba(58,50,39,.05)', display: 'flex', gap: 10, alignItems: 'flex-start',
                  fontFamily: 'inherit', width: '100%',
                }}
              >
                <AvatarBlock name={item.name} grade={item.grade} gender={item.gender} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 14.5, color: '#1F2329' }}>{item.name}</span>
                    {item.grade && <span style={{ fontSize: 11, color: '#8A8F98', background: 'rgba(152,162,179,.1)', padding: '1px 7px', borderRadius: 999 }}>{item.grade}</span>}
                    {MEMBER_STYLE[item.membershipLevel] && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999, color: MEMBER_STYLE[item.membershipLevel].fg, background: MEMBER_STYLE[item.membershipLevel].bg }}>{MEMBER_STYLE[item.membershipLevel].label}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1F2329', fontVariantNumeric: 'tabular-nums' }}>{item.totalAttempts}</div>
                      <div style={{ fontSize: 10.5, color: '#98A2B3' }}>做题次数</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1F2329', fontVariantNumeric: 'tabular-nums' }}>{item.totalQuestions}</div>
                      <div style={{ fontSize: 10.5, color: '#98A2B3' }}>答题数</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: accuracyColor(item.accuracy), fontVariantNumeric: 'tabular-nums' }}>{item.accuracy}%</div>
                      <div style={{ fontSize: 10.5, color: '#98A2B3', marginBottom: 3 }}>正确率</div>
                      <AccuracyBar value={item.accuracy} height={5} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                    {item.subjectStats.slice(0, 3).map((stat) => (
                      <span key={stat.subject} style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 999, color: SUBJECT_COLORS[stat.subject] || '#8A6B2F', background: `${SUBJECT_COLORS[stat.subject] || '#C9A45C'}1A` }}>{stat.subject} {stat.accuracy}%</span>
                    ))}
                  </div>
                  {item.lastPracticeAt && (
                    <div style={{ fontSize: 11, color: '#B0B7C3', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ClockCircleOutlined /> 最近练习 {dayjs(item.lastPracticeAt).format('MM-DD HH:mm')}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* 详情 / 群体统计 */}
          {selectedId ? (
            <div>{renderDetail(detailLoading, detailData, expandedAttempt, setExpandedAttempt, () => setDetailPage((page) => page + 1))}</div>
          ) : (
            !isMobile && <GroupStats list={list} onSelect={openDetail} isMobile={false} />
          )}
        </div>
        </>
      )}
    </div>
  )
}

function renderDetail(
  loading: boolean,
  detail: StudentDetail | undefined,
  expandedAttempt: string | null,
  setExpandedAttempt: (id: string | null) => void,
  loadMore?: () => void,
) {
  if (loading && !detail) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  }
  if (!detail) return null

  const { student, stats, subjectStats, dailyTrend, attempts } = detail
  const maxDaily = Math.max(...dailyTrend.map((day) => day.questions), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hero */}
      <div style={{
        borderRadius: 18, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(150deg,#17352F 0%,#0E5E4E 55%,#0B4B40 100%)',
        border: '1px solid rgba(201,164,92,.5)', boxShadow: '0 10px 26px rgba(18,60,53,.2)',
        padding: '16px 18px', color: '#F5F1E8',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,164,92,.22), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <AvatarBlock name={student.name} grade={student.grade} gender={student.gender} size={52} />
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{student.name}</span>
              {student.grade && <span style={{ fontSize: 11, fontWeight: 700, color: '#F2E3B6', background: 'rgba(201,164,92,.16)', border: '1px solid rgba(201,164,92,.5)', padding: '1px 8px', borderRadius: 999 }}>{student.grade}</span>}
              {MEMBER_STYLE[student.membershipLevel] && (
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '1px 8px', borderRadius: 999, color: MEMBER_STYLE[student.membershipLevel].fg, background: MEMBER_STYLE[student.membershipLevel].bg }}>{MEMBER_STYLE[student.membershipLevel].label}</span>
              )}
            </div>
            <div style={{ marginTop: 5, fontSize: 12, color: 'rgba(245,241,232,.7)' }}>
              {student.school || '—'} · {student.phone ? `学员电话 ${student.phone}` : '未留联系电话'} · 剩余课时 {student.remainHours} 节
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#F2E3B6', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{stats.accuracy}%</div>
            <div style={{ fontSize: 11, color: 'rgba(245,241,232,.65)', marginTop: 2 }}>综合正确率</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginTop: 14 }}>
          {[
            { label: '做题次数', value: stats.totalAttempts },
            { label: '答题总数', value: stats.totalQuestions },
            { label: '答对', value: stats.totalCorrect },
            { label: '答错', value: stats.totalWrong },
          ].map((item) => (
            <div key={item.label} style={{ borderRadius: 12, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(242,227,182,.22)', padding: '8px 10px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F5F1E8', fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(245,241,232,.6)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 学科掌握 */}
      {subjectStats.length > 0 && (
        <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2329', marginBottom: 10 }}>学科掌握情况</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
            {subjectStats.map((stat) => (
              <div key={stat.subject} style={{ borderRadius: 12, background: '#F7F5F1', border: '1px solid #EFE8DD', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: SUBJECT_COLORS[stat.subject] || '#8A6B2F' }}>{stat.subject}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: accuracyColor(stat.accuracy), fontVariantNumeric: 'tabular-nums' }}>{stat.accuracy}%</span>
                </div>
                <div style={{ marginTop: 7 }}><AccuracyBar value={stat.accuracy} /></div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#98A2B3' }}>{stat.questions} 题 · {stat.attempts} 次练习 · 答对 {stat.correct}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 近14天趋势 */}
      <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2329', marginBottom: 10 }}>近 14 天练习趋势</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 96 }}>
          {dailyTrend.map((day) => (
            <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: day.questions > 0 ? accuracyColor(day.accuracy) : '#C5CBD5' }}>{day.questions > 0 ? day.accuracy + '%' : ''}</span>
              <div style={{
                width: '100%', borderRadius: '5px 5px 2px 2px',
                height: `${Math.max(4, Math.round((day.questions / maxDaily) * 58))}px`,
                background: day.questions > 0 ? 'linear-gradient(180deg,#C9A45C,#E8784A)' : 'rgba(152,162,179,.12)',
                opacity: day.questions > 0 ? 1 : .6,
              }} />
              <span style={{ fontSize: 9, color: '#B0B7C3', whiteSpace: 'nowrap' }}>{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 做题记录 */}
      <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #F0E9DF', boxShadow: '0 4px 14px rgba(58,50,39,.05)', padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2329', marginBottom: 10 }}>做题记录</div>
        {attempts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#98A2B3', fontSize: 12.5, padding: '16px 0' }}>暂无做题记录</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attempts.map((attempt) => {
              const expanded = expandedAttempt === attempt.id
              return (
                <div key={attempt.id} style={{ borderRadius: 12, border: '1px solid #EFE8DD', background: '#FCFAF7', overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedAttempt(expanded ? null : attempt.id)}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2329' }}>{attempt.setTitle}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '0 7px', borderRadius: 999, color: SUBJECT_COLORS[attempt.subject] || '#8A6B2F', background: `${SUBJECT_COLORS[attempt.subject] || '#C9A45C'}1A` }}>{attempt.subject}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>{dayjs(attempt.finishedAt).format('YYYY-MM-DD HH:mm')} · 得分 {attempt.score}/{attempt.total}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: accuracyColor(attempt.accuracy), fontVariantNumeric: 'tabular-nums' }}>{attempt.accuracy}%</div>
                      <div style={{ fontSize: 10.5, color: attempt.wrongCount > 0 ? '#D9534F' : '#1D9E75' }}>{attempt.wrongCount > 0 ? `${attempt.wrongCount} 题待巩固` : '全部答对'}</div>
                    </div>
                  </button>
                  {expanded && attempt.wrongQuestions.length > 0 && (
                    <div style={{ borderTop: '1px solid #EFE8DD', padding: '10px 12px', background: '#fff' }}>
                      {attempt.wrongQuestions.map((wrong, index) => (
                        <div key={index} style={{ padding: '8px 0', borderBottom: index < attempt.wrongQuestions.length - 1 ? '1px dashed #EFE8DD' : 'none' }}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: '#3A4A40' }}>
                            <span style={{ fontWeight: 700, color: '#D9534F' }}>错题 {index + 1}：</span>{wrong.prompt}
                          </div>
                          {wrong.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={wrong.imageUrl} alt="题目图片" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, marginTop: 6, border: '1px solid #EFE8DD' }} />
                          )}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, fontSize: 11.5 }}>
                            <span style={{ color: '#D9534F', background: 'rgba(217,83,79,.08)', padding: '2px 8px', borderRadius: 6 }}>你的答案：{wrong.userAnswer}</span>
                            <span style={{ color: '#1D9E75', background: 'rgba(29,158,117,.08)', padding: '2px 8px', borderRadius: 6 }}>正确答案：{wrong.correctAnswer}</span>
                          </div>
                          {wrong.explanation && (
                            <div style={{ marginTop: 5, fontSize: 11.5, color: '#8A8F98', lineHeight: 1.6 }}>解析：{wrong.explanation}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {detail.hasMore && loadMore && (
              <Button onClick={loadMore} style={{ borderRadius: 10, borderColor: '#D8C9A8', color: '#0E5E4E' }}>加载更多</Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
