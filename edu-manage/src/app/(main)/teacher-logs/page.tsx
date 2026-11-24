'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Row,
  Col,
  Segmented,
  Select,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { useRouter } from 'next/navigation'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  FireOutlined,
  MessageOutlined,
  ReadOutlined,
  RightOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useDivision } from '@/contexts/DivisionContext'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { getTeacherAvatarUrl, DEFAULT_TEACHER_AVATAR } from '@/lib/teacher-avatars'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

const fetcher = (url: string) => fetch(url).then(async (r) => {
  if (!r.ok) throw new Error(`教师日志加载失败（HTTP ${r.status}）`)
  return r.json()
})

const ACTION_LABELS: Record<string, string> = {
  ATTENDANCE_SUBMIT: '考勤提交',
  ATTENDANCE_MISSING: '漏提交',
  PAPER_UPLOAD: '试卷草稿',
  PAPER_PUBLISH: '试卷推送',
  PERFORMANCE_POST: '表现反馈',
  TEACHER_LOGIN: '系统登录',
  COMMENT_REPLY: '回复留言',
  MAKEUP_ARRANGE: '安排补课',
}

type TeacherLogRow = {
  teacherId: string
  teacherName: string
  avatar?: string | null
  gender?: string | null
  subjects?: string
  attendanceStatus: string
  submittedCount: number
  todayLessons: number
  draftPapers?: number
  papersToday: number
  postsToday: number
  commentRepliesToday: number
  todayActionsCount?: number
  monthlyActionsCount?: number
  totalActionsCount?: number
  usageFrequency?: number
  lastAction?: string | null
  lastActionTime?: string | null
  status: 'ACTIVE' | 'PARTIAL' | 'INACTIVE' | string
  alertCount?: number
}

type TeacherLogsData = {
  teachers: TeacherLogRow[]
  summary?: {
    attendanceCompleteTeachers?: number
    pendingPapers?: number
    weeklyFeedbackRate?: number
    alertCount?: number
    activeCount?: number
    partialCount?: number
    inactiveCount?: number
  }
}

type SortMode = 'frequency' | 'today' | 'pending' | 'name'

export default function TeacherLogsPage() {
  const router = useRouter()
  const { division } = useDivision()
  const isMobile = useIsMobile() ?? false
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PARTIAL' | 'INACTIVE'>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('frequency')

  const { data, error, isLoading, mutate } = useSWR<TeacherLogsData>(
    `/api/teacher-logs?division=${encodeURIComponent(division)}`,
    fetcher,
    { refreshInterval: 60_000 }
  )

  const rawTeachers = useMemo(() => data?.teachers || [], [data?.teachers])

  // Filter and sort
  const filteredTeachers = useMemo(() => {
    let list = [...rawTeachers]

    // Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((t) => t.status === statusFilter)
    }

    // Search query
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((t) =>
        t.teacherName.toLowerCase().includes(q) ||
        (t.subjects && t.subjects.toLowerCase().includes(q))
      )
    }

    // Sort order
    list.sort((a, b) => {
      if (sortMode === 'frequency') {
        const freqA = a.usageFrequency ?? ((a.monthlyActionsCount || 0) * 3 + (a.todayActionsCount || 0) * 5)
        const freqB = b.usageFrequency ?? ((b.monthlyActionsCount || 0) * 3 + (b.todayActionsCount || 0) * 5)
        if (freqB !== freqA) return freqB - freqA
        if ((b.todayActionsCount || 0) !== (a.todayActionsCount || 0)) {
          return (b.todayActionsCount || 0) - (a.todayActionsCount || 0)
        }
        return a.teacherName.localeCompare(b.teacherName, 'zh-Hans-CN')
      }

      if (sortMode === 'today') {
        const todayA = a.todayActionsCount || 0
        const todayB = b.todayActionsCount || 0
        if (todayB !== todayA) return todayB - todayA
        return a.teacherName.localeCompare(b.teacherName, 'zh-Hans-CN')
      }

      if (sortMode === 'pending') {
        // Pending attendance or alerts first
        const pendingA = Math.max(0, a.todayLessons - a.submittedCount) + (a.alertCount || 0) * 2
        const pendingB = Math.max(0, b.todayLessons - b.submittedCount) + (b.alertCount || 0) * 2
        if (pendingB !== pendingA) return pendingB - pendingA
        return a.teacherName.localeCompare(b.teacherName, 'zh-Hans-CN')
      }

      if (sortMode === 'name') {
        return a.teacherName.localeCompare(b.teacherName, 'zh-Hans-CN')
      }

      return 0
    })

    return list
  }, [rawTeachers, statusFilter, search, sortMode])

  const counts = useMemo(() => {
    const total = rawTeachers.length
    const active = rawTeachers.filter((t) => t.status === 'ACTIVE').length
    const partial = rawTeachers.filter((t) => t.status === 'PARTIAL').length
    const inactive = rawTeachers.filter((t) => t.status === 'INACTIVE').length
    return { total, active, partial, inactive }
  }, [rawTeachers])

  const formatLastActionTime = (iso?: string | null) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      return isToday ? `今日 ${timeStr}` : `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`
    } catch {
      return ''
    }
  }

  return (
    <PageLayout
      title="教师行为日志监控"
      subtitle="监控全校教师教学履职、今日考勤提交、试卷推送、课后反馈与系统使用频次"
    >
      {/* 顶部核心指标看板 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid #EDE8E1',
            boxShadow: '0 2px 8px rgba(20,87,77,.04)',
          }}>
            <div style={{ fontSize: 12, color: '#8A92A6', marginBottom: 4 }}>今日考勤完成</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#0E5E4E', fontVariantNumeric: 'tabular-nums' }}>
                {data?.summary?.attendanceCompleteTeachers ?? 0}
              </span>
              <span style={{ fontSize: 12, color: '#8A92A6' }}>人已交</span>
            </div>
            <div style={{ fontSize: 11, color: '#0E5E4E', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircleOutlined /> 实时考勤跟踪
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid #EDE8E1',
            boxShadow: '0 2px 8px rgba(20,87,77,.04)',
          }}>
            <div style={{ fontSize: 12, color: '#8A92A6', marginBottom: 4 }}>待推送试卷</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#C6821E', fontVariantNumeric: 'tabular-nums' }}>
                {data?.summary?.pendingPapers ?? 0}
              </span>
              <span style={{ fontSize: 12, color: '#8A92A6' }}>份草稿</span>
            </div>
            <div style={{ fontSize: 11, color: '#C6821E', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <WarningOutlined /> 待发布至家长端
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid #EDE8E1',
            boxShadow: '0 2px 8px rgba(20,87,77,.04)',
          }}>
            <div style={{ fontSize: 12, color: '#8A92A6', marginBottom: 4 }}>本周反馈覆盖</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#534AB7', fontVariantNumeric: 'tabular-nums' }}>
                {data?.summary?.weeklyFeedbackRate ?? 0}%
              </span>
              <span style={{ fontSize: 12, color: '#8A92A6' }}>在读学员</span>
            </div>
            <div style={{ fontSize: 11, color: '#534AB7', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ReadOutlined /> 课堂表现点评
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid #EDE8E1',
            boxShadow: '0 2px 8px rgba(20,87,77,.04)',
          }}>
            <div style={{ fontSize: 12, color: '#8A92A6', marginBottom: 4 }}>履职异常预警</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontSize: 24,
                fontWeight: 800,
                color: (data?.summary?.alertCount ?? 0) > 0 ? '#E24B4A' : '#1D9E75',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {data?.summary?.alertCount ?? 0}
              </span>
              <span style={{ fontSize: 12, color: '#8A92A6' }}>条未处理</span>
            </div>
            <div style={{
              fontSize: 11,
              color: (data?.summary?.alertCount ?? 0) > 0 ? '#E24B4A' : '#1D9E75',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              {(data?.summary?.alertCount ?? 0) > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              {(data?.summary?.alertCount ?? 0) > 0 ? '需教务跟进' : '运作正常'}
            </div>
          </div>
        </Col>
      </Row>

      {/* 搜索、状态筛选与使用频率排序控制条 */}
      <Card
        bordered={false}
        style={{
          borderRadius: 14,
          marginBottom: 16,
          background: '#ffffff',
          border: '1px solid #EDE8E1',
          boxShadow: '0 2px 8px rgba(20,87,77,.04)',
        }}
        styles={{ body: { padding: '12px 14px' } }}
      >
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 10,
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
        }}>
          {/* 左侧：搜索 + 状态筛选 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
          }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#8A92A6' }} />}
              placeholder="搜索教师姓名或科目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{
                width: isMobile ? '100%' : 220,
                borderRadius: 8,
              }}
            />

            <Segmented
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as typeof statusFilter)}
              options={[
                { label: `全部 (${counts.total})`, value: 'ALL' },
                { label: `活跃 (${counts.active})`, value: 'ACTIVE' },
                { label: `部分完成 (${counts.partial})`, value: 'PARTIAL' },
                { label: `今日未操作 (${counts.inactive})`, value: 'INACTIVE' },
              ]}
              style={{
                maxWidth: '100%',
                overflowX: 'auto',
              }}
            />
          </div>

          {/* 右侧：排序选项（默认按使用频率） */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: isMobile ? 'flex-start' : 'center',
          }}>
            <span style={{ fontSize: 12, color: '#8A92A6', whiteSpace: 'nowrap' }}>排序：</span>
            <Select<SortMode>
              value={sortMode}
              onChange={(val) => setSortMode(val)}
              options={[
                { label: '⚡ 按使用频率（从高到低）', value: 'frequency' },
                { label: '🔥 按今日操作数', value: 'today' },
                { label: '⚠️ 按待办与预警优先', value: 'pending' },
                { label: '🔤 按教师姓名', value: 'name' },
              ]}
              style={{ width: isMobile ? '100%' : 200 }}
            />
          </div>
        </div>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 12 }}
          message="教师行为日志加载失败"
          description={error.message || '请检查网络连接后重试'}
          action={<Button size="small" onClick={() => mutate()}>重试</Button>}
        />
      )}

      {/* 加载中状态 */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#8A92A6', fontSize: 13 }}>正在按使用频率分析教师行为日志...</div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 14, textAlign: 'center', padding: '40px 0' }}>
          <Empty description={search || statusFilter !== 'ALL' ? '没有匹配的教师记录' : '暂无教师行为日志'} />
        </Card>
      ) : (
        /* 教师行为日志卡片网格列表 */
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 14,
        }}>
          {filteredTeachers.map((teacher, index) => {
            const subjects = (teacher.subjects || '').split(',').filter(Boolean)
            const attendancePending = teacher.todayLessons > teacher.submittedCount
            const isAttendanceAllDone = teacher.todayLessons > 0 && teacher.submittedCount >= teacher.todayLessons
            const monthlyFreq = teacher.monthlyActionsCount ?? 0
            const todayActions = teacher.todayActionsCount ?? 0
            const isHighUsage = (sortMode === 'frequency' && index < 3 && monthlyFreq > 0)

            return (
              <div
                key={teacher.teacherId}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: isHighUsage
                    ? '1.5px solid #C9A45C'
                    : teacher.status === 'PARTIAL'
                    ? '1.5px solid #E5C37A'
                    : '1px solid #EDE8E1',
                  boxShadow: isHighUsage
                    ? '0 6px 18px rgba(201,164,92,.18)'
                    : '0 2px 10px rgba(20,87,77,.04)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 使用频率 TOP 角标（仅前3名展示） */}
                {isHighUsage && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'linear-gradient(135deg, #E5C37A, #C9A45C)',
                    color: '#17352F',
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderBottomLeftRadius: 10,
                    boxShadow: '0 2px 6px rgba(201,164,92,.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}>
                    <FireOutlined /> 活跃 TOP {index + 1}
                  </div>
                )}

                {/* 顶部身份栏：头像 + 姓名 + 状态 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1.5px solid #EDE8E1',
                    background: '#FAF8F5',
                  }}>
                    <CachedAvatarImage
                      src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.teacherId)}
                      fallbackSrc={getTeacherAvatarUrl(null, teacher.gender, teacher.teacherId) || DEFAULT_TEACHER_AVATAR}
                      alt={teacher.teacherName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2329' }}>
                        {teacher.teacherName}
                      </span>

                      {/* 状态徽标 */}
                      {teacher.status === 'ACTIVE' ? (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 8px',
                          borderRadius: 999,
                          background: 'rgba(29,158,117,.12)',
                          color: '#0E5E4E',
                          border: '1px solid rgba(29,158,117,.3)',
                        }}>
                          今日活跃
                        </span>
                      ) : teacher.status === 'PARTIAL' ? (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 8px',
                          borderRadius: 999,
                          background: 'rgba(245,166,35,.12)',
                          color: '#B25E09',
                          border: '1px solid rgba(245,166,35,.35)',
                        }}>
                          考勤待交
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '1px 8px',
                          borderRadius: 999,
                          background: '#F2F4F7',
                          color: '#667085',
                          border: '1px solid #D0D5DD',
                        }}>
                          今日无操作
                        </span>
                      )}

                      {/* 预警红点 */}
                      {(teacher.alertCount || 0) > 0 && (
                        <Badge count={`${teacher.alertCount} 预警`} style={{ backgroundColor: '#E24B4A' }} />
                      )}
                    </div>

                    {/* 科目标签 */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {subjects.length > 0 ? (
                        subjects.map((s) => {
                          const sc = SUBJECT_COLORS[s] || { bg: '#FAF8F5', color: '#5A6472' }
                          return (
                            <span
                              key={s}
                              style={{
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: sc.bg,
                                color: sc.color,
                                fontWeight: 500,
                              }}
                            >
                              {s}
                            </span>
                          )
                        })
                      ) : (
                        <span style={{ fontSize: 11, color: '#98A2B3' }}>未设置科目</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 今日业务操作指标四宫格 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                  background: '#FAF8F5',
                  padding: '10px 8px',
                  borderRadius: 12,
                  border: '1px solid #F0ECE4',
                }}>
                  {/* 考勤 */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#8A92A6' }}>考勤提交</div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      marginTop: 2,
                      fontVariantNumeric: 'tabular-nums',
                      color: attendancePending
                        ? '#E24B4A'
                        : isAttendanceAllDone
                        ? '#1D9E75'
                        : '#5A6472',
                    }}>
                      {teacher.submittedCount}/{teacher.todayLessons}
                    </div>
                  </div>

                  {/* 试卷 */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#8A92A6' }}>试卷推送</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: teacher.papersToday > 0 ? '#14574D' : '#5A6472', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {teacher.papersToday}
                    </div>
                  </div>

                  {/* 表现反馈 */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#8A92A6' }}>表现反馈</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: teacher.postsToday > 0 ? '#534AB7' : '#5A6472', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {teacher.postsToday}
                    </div>
                  </div>

                  {/* 留言回复 */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#8A92A6' }}>留言互动</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: teacher.commentRepliesToday > 0 ? '#E8784A' : '#5A6472', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {teacher.commentRepliesToday}
                    </div>
                  </div>
                </div>

                {/* 使用频率统计栏 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(20,87,77,.05)',
                  border: '1px dashed rgba(20,87,77,.2)',
                  fontSize: 12,
                  color: '#14574D',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ThunderboltOutlined style={{ color: '#E5C37A' }} />
                    <strong>使用频次：</strong>
                    近30天 {monthlyFreq} 次操作
                  </span>
                  <span style={{ color: todayActions > 0 ? '#1D9E75' : '#8A92A6', fontWeight: 600 }}>
                    今日 {todayActions} 次
                  </span>
                </div>

                {/* 底部信息与动作栏 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 4,
                  borderTop: '1px solid #F5F1E8',
                  marginTop: 'auto',
                }}>
                  <div style={{ fontSize: 12, color: '#8A92A6', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <ClockCircleOutlined style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {teacher.lastAction
                        ? `${ACTION_LABELS[teacher.lastAction] || teacher.lastAction} · ${formatLastActionTime(teacher.lastActionTime)}`
                        : '今日暂无操作记录'}
                    </span>
                  </div>

                  <Button
                    type="link"
                    size="small"
                    onClick={() => router.push(`/teacher-logs/${teacher.teacherId}`)}
                    style={{
                      color: '#14574D',
                      fontWeight: 600,
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    查看详情 <RightOutlined style={{ fontSize: 10 }} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
