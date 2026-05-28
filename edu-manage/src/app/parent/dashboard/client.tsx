'use client'

import { Row, Col, Card, Tag, Typography, Button, Space } from 'antd'
import { BellOutlined, ClockCircleOutlined, HeartOutlined, TeamOutlined, EnvironmentOutlined, IdcardOutlined, BookOutlined, BulbOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getDailyQuote } from '@/data/daily-quotes'
import { formatPercent } from '@/lib/format'
import { TodayStatus } from '@/components/Parent/TodayStatus'
import { WeeklyReport } from '@/components/Parent/WeeklyReport'

const { Title, Text } = Typography

const MOOD_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  GREAT: { bg: '#E1F5EE', color: '#1D9E75', label: '棒' },
  GOOD: { bg: '#EEEDFE', color: '#534AB7', label: '好' },
  OKAY: { bg: '#FAEEDA', color: '#BA7517', label: '一般' },
  NEEDS_ATTENTION: { bg: '#FCEBEB', color: '#E24B4A', label: '关注' },
}

function getLessonStatus(l: { startTime: string; endTime: string; attendanceSubmittedAt?: string | null }): { text: string; color: string } {
  // Teacher has submitted attendance → finished
  if (l.attendanceSubmittedAt) return { text: '已结束', color: 'default' }

  const now = Date.now()
  const start = new Date(l.startTime).getTime()
  const end = new Date(l.endTime).getTime()
  if (now < start) return { text: '待上课', color: 'blue' }
  if (now >= start && now <= end) return { text: '上课中', color: 'processing' }

  // Past end time but no attendance submitted → waiting
  return { text: '待老师确认', color: 'orange' }
}

export function ParentDashboardClient({
  students, studentTeachers, todaySchedules, todayClassLessons,
  notifications, latestPost, latestClassroomFeedback,
  monthMoods, monthClassroomFeedbacks, attendanceRate, badgeCount,
  todayAttendances = [], todayFeedbackCount = 0, todayPaperCount = 0, todayMeal = null,
}: {
  students: any[]
  studentTeachers: Record<string, string[]>
  todaySchedules: any[]
  todayClassLessons: any[]
  notifications: any[]
  latestPost: any
  latestClassroomFeedback: any
  monthMoods: any[]
  monthClassroomFeedbacks: any[]
  attendanceRate: number
  badgeCount: number
  todayAttendances?: any[]
  todayFeedbackCount?: number
  todayPaperCount?: number
  todayMeal?: any
}) {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dailyQuote = getDailyQuote()

  // Build mood map
  const moodMap: Record<number, { mood: string; ids: string[] }> = {}
  monthMoods.forEach((m: any) => {
    const day = new Date(m.createdAt).getDate()
    if (!moodMap[day]) moodMap[day] = { mood: m.mood, ids: [] }
    moodMap[day].ids.push(m.id)
  })
  monthClassroomFeedbacks.forEach((f: any) => {
    const day = new Date(f.createdAt).getDate()
    if (!moodMap[day]) moodMap[day] = { mood: 'GOOD', ids: [] }
    moodMap[day].ids.push(f.id)
  })

  // Collect all teacher names across all students
  const allTeacherNames = new Set<string>()
  Object.values(studentTeachers).forEach(names => names.forEach(n => allTeacherNames.add(n)))

  // Merge schedule + classlesson into unified today list
  // studentNames are already filtered to only current parent's children
  const todayLessons = [
    ...todaySchedules.map((s: any) => ({
      id: s.id,
      title: s.title,
      startTime: s.startTime ? new Date(s.startTime).toTimeString().slice(0, 5) : '',
      endTime: s.endTime ? new Date(s.endTime).toTimeString().slice(0, 5) : '',
      teacherName: s.teacherName,
      roomName: s.roomName,
      studentNames: s.studentNames || [],
      startTimeRaw: s.startTime,
      endTimeRaw: s.endTime,
      attendanceSubmittedAt: s.attendanceSubmittedAt,
    })),
    ...todayClassLessons.map((l: any) => ({
      id: l.id,
      title: l.title,
      startTime: l.startTime || '',
      endTime: l.endTime || '',
      teacherName: l.teacherName,
      roomName: l.roomName,
      studentNames: l.studentNames || [],
      startTimeRaw: l.startTimeRaw,
      endTimeRaw: l.endTimeRaw,
      attendanceSubmittedAt: l.attendanceSubmittedAt,
    })),
  ].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  const completedAttendanceCount = todayLessons.filter((lesson) => lesson.attendanceSubmittedAt).length
  const pendingConfirmCount = todayLessons.filter((lesson) => getLessonStatus(lesson).text === '待老师确认').length
  const activeLesson = todayLessons.find((lesson) => getLessonStatus(lesson).text === '上课中')
  const nextLesson = todayLessons.find((lesson) => getLessonStatus(lesson).text === '待上课')
  const todayStatus = !todayLessons.length
    ? '今日暂无课程'
    : activeLesson
      ? '上课中'
      : pendingConfirmCount > 0
        ? '待老师确认'
        : nextLesson
          ? '待上课'
          : completedAttendanceCount === todayLessons.length
            ? '今日课程已完成'
            : '待老师确认'
  const latestTimes = [
    latestPost?.createdAt,
    latestClassroomFeedback?.createdAt,
    notifications[0]?.createdAt,
    ...todayAttendances.map((attendance: any) => attendance.createdAt),
  ].filter(Boolean).map((value) => new Date(value).getTime())
  const latestUpdate = latestTimes.length ? new Date(Math.max(...latestTimes)).toLocaleString('zh-CN') : '暂无更新'
  const todayTeachers = [...new Set(todayLessons.map((lesson) => lesson.teacherName).filter(Boolean))]
  const todayRooms = [...new Set(todayLessons.map((lesson) => lesson.roomName).filter(Boolean))]
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const primaryStudent = students[0]
  const heroStudentName = primaryStudent?.name || '同学'

  const goCalendarDay = (day: number) => {
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    router.push(`/parent/growth?date=${d}`)
  }

  // Latest feedback
  const latestFeedbackItems: { type: string; teacherName: string; studentName: string; content: string; date: Date; mood?: string; id: string }[] = []
  if (latestPost) {
    latestFeedbackItems.push({
      type: '表现反馈',
      teacherName: latestPost.teacher?.name || '老师',
      studentName: latestPost.student?.name || '',
      content: latestPost.content,
      date: new Date(latestPost.createdAt),
      mood: latestPost.mood,
      id: latestPost.id,
    })
  }
  if (latestClassroomFeedback) {
    latestFeedbackItems.push({
      type: '课堂反馈',
      teacherName: latestClassroomFeedback.teacher?.name || '老师',
      studentName: '',
      content: latestClassroomFeedback.summary || '课堂资料已更新',
      date: new Date(latestClassroomFeedback.createdAt),
      id: latestClassroomFeedback.id,
    })
  }
  latestFeedbackItems.sort((a, b) => b.date.getTime() - a.date.getTime())
  const latestFeedback = latestFeedbackItems[0] || null

  return (
    <div>
      {/* Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #E8784A 0%, #F08A54 30%, #d4693a 70%, #bf5028 100%)',
        borderRadius: 16, padding: isMobile ? '18px 16px' : '24px 28px', marginBottom: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, bottom: -30, fontSize: 140, fontWeight: 700, color: 'rgba(255,255,255,.04)', userSelect: 'none', lineHeight: 1 }}>🌸</div>
        <div style={{ position: 'absolute', right: 120, top: -20, fontSize: 80, fontWeight: 700, color: 'rgba(255,255,255,.03)', userSelect: 'none', lineHeight: 1 }}>⭐</div>

        <Row gutter={[isMobile ? 12 : 24, 16]} align="middle">
          <Col flex="auto">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,.2)',
                border: '2px solid rgba(255,255,255,.3)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff',
                flexShrink: 0,
              }}>
                {heroStudentName[0]}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                  {heroStudentName}
                  {students.length > 1 && <span style={{ fontSize: 14, fontWeight: 400, opacity: .8, marginLeft: 8 }}>
                    {students.slice(1).map((s: any) => s.name).join('、')}等{students.length}人
                  </span>}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
                  {primaryStudent?.grade ? `${primaryStudent.grade} · ` : ''}
                  负责老师：{allTeacherNames.size > 0 ? [...allTeacherNames].join('、') : '暂未分配'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.86)', marginTop: 8 }}>
                  今日状态：<strong>{todayStatus}</strong> · 最近更新：{latestUpdate}
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(4px)',
              borderRadius: 10, padding: '10px 16px', display: 'inline-block',
            }}>
              <Text style={{ color: 'rgba(255,255,255,.92)', fontSize: 14, fontStyle: 'italic', letterSpacing: 1 }}>
                「每一个孩子都有花期，我们静待花开。」
              </Text>
            </div>
          </Col>

          <Col>
            <div style={{ textAlign: 'right', color: 'rgba(255,255,255,.9)' }}>
              <div style={{ fontSize: 11, opacity: .6, marginBottom: 3 }}>今日</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{format(today, 'M月d日 EEEE', { locale: zhCN })}</div>
            </div>
          </Col>
        </Row>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginTop: 20 }}>
          {[
            { val: todayLessons.length, label: '今日课次' },
            { val: formatPercent(attendanceRate), label: '本月出勤率' },
            { val: badgeCount, label: '已获徽章', icon: true },
            { val: notifications.filter((n: any) => !n.read).length, label: '待处理通知' },
          ].map(({ val, label, icon }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(4px)',
              borderRadius: 12, padding: '12px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {icon ? `🌟 ${val}` : val}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <TodayStatus />
      <WeeklyReport />

      <div style={{
        margin: '16px 0',
        padding: '16px 20px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(232,117,69,.12) 0%, rgba(232,145,69,.06) 100%)',
        border: '1px solid rgba(232,117,69,.2)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <span style={{
          position: 'absolute',
          top: -8,
          left: 12,
          fontSize: 60,
          color: 'rgba(232,117,69,.15)',
          fontFamily: 'Georgia, serif',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          &quot;
        </span>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 8 }}>
          <BulbOutlined style={{ color: '#E87545', fontSize: 18, marginTop: 2, flexShrink: 0 }} />
          <div>
            <Text style={{ fontSize: 14, lineHeight: 1.9, color: '#7a4a2a', fontStyle: 'italic', display: 'block' }}>
              {dailyQuote.text}
            </Text>
            <Text style={{ fontSize: 11, color: '#c4895a', display: 'block', marginTop: 8 }}>
              — 每日语录 第 {dailyQuote.index} 条 · {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </Text>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            className="parent-card"
            style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', height: '100%' }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>今日在校状态</span>}
            extra={<Tag color={todayStatus === '待老师确认' ? 'orange' : todayStatus === '上课中' ? 'processing' : todayStatus.includes('完成') ? 'green' : 'blue'}>{todayStatus}</Tag>}
          >
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
              {[
                ['今日课程', `${todayLessons.length}节`],
                ['已完成考勤', `${completedAttendanceCount}节`],
                ['待老师确认', `${pendingConfirmCount}节`],
                ['负责老师', todayTeachers.join('、') || '暂未分配'],
                ['今日教室', todayRooms.join('、') || '暂未分配'],
                ['课时扣除', todayAttendances.length ? '已记录' : '待确认'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#FFFBF7', borderRadius: 10, padding: 10, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#9A8E7A' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2933', marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
                </div>
              ))}
            </div>
            {!todayLessons.length && (
              <Text type="secondary" style={{ fontSize: 12 }}>今日暂无课程，可以查看学习资料、课堂反馈或成长动态。</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            className="parent-card"
            style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', height: '100%' }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>今日成长简报</span>}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                ['课程', `${todayLessons.length}节`],
                ['考勤', `${completedAttendanceCount}节`],
                ['反馈', `${todayFeedbackCount}条`],
                ['试卷/资料', `${todayPaperCount}份`],
                ['通知', `${notifications.filter((n: any) => new Date(n.createdAt).toDateString() === today.toDateString()).length}条`],
                ['就餐', todayMeal ? '已发布' : '未发布'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#FAF8F5', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                  <div style={{ color: '#E8784A', fontWeight: 800, fontSize: 16 }}>{value}</div>
                  <div style={{ color: '#9A8E7A', fontSize: 11 }}>{label}</div>
                </div>
              ))}
            </div>
            <Space wrap>
              <Button size={isMobile ? 'middle' : 'small'} onClick={() => router.push(`/parent/growth?date=${todayStr}`)}>查看成长动态</Button>
              <Button size={isMobile ? 'middle' : 'small'} onClick={() => router.push('/parent/class-feedback')}>查看课堂反馈</Button>
              <Button size={isMobile ? 'middle' : 'small'} onClick={() => router.push('/parent/archive')}>查看学习档案</Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24}>
          <Card bordered={false} className="parent-card" style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }} title={<span style={{ fontSize: 15, fontWeight: 600 }}>今日就餐</span>}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
              <div>
                <Text strong>{todayMeal ? `${todayMeal.mainDish}${todayMeal.sideDish ? ` · ${todayMeal.sideDish}` : ''}` : '今日菜单暂未发布，老师会及时更新。'}</Text>
                <div style={{ color: '#8D806F', fontSize: 12, marginTop: 4 }}>每日餐食均会留样，如有问题请及时联系负责人。</div>
              </div>
              <Button style={{ minHeight: 40 }} onClick={() => router.push('/parent/meals')}>查看就餐安排</Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 2x2 Card Grid */}
      <Row gutter={[16, 16]}>
        {/* Today's Lessons */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', height: '100%' }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>📅 今日课次</span>}
          >
            {todayLessons.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', padding: '24px 0', textAlign: 'center' }}>今日暂无课程，孩子在校好好休息吧 ☀️</Text>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {todayLessons.map((l: any, i: number) => {
                  const status = getLessonStatus(l)
                  return (
                    <div key={i} style={{
                      padding: '12px', marginBottom: 8, borderRadius: 10,
                      background: '#FFFBF7', border: '1px solid #FBF0EA',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text strong style={{ fontSize: 13, color: '#1F2933' }}>{l.title}</Text>
                        <Tag color={status.color} style={{ borderRadius: 9999, fontSize: 10 }}>{status.text}</Tag>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 6, fontSize: 11, color: '#7A869A' }}>
                        <span><ClockCircleOutlined style={{ marginRight: 3 }} />{l.startTime}-{l.endTime}</span>
                        <span><TeamOutlined style={{ marginRight: 3 }} />{l.teacherName || '暂未分配'}</span>
                        <span><EnvironmentOutlined style={{ marginRight: 3 }} />{l.roomName || '暂未分配'}</span>
                        {l.studentNames?.length > 0 && (
                          <span><IdcardOutlined style={{ marginRight: 3 }} />{l.studentNames.join('、')}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Latest Notifications */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', height: '100%' }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>待办与通知</span>}
            extra={<a onClick={() => router.push('/parent/notifications')} style={{ fontSize: 12, color: '#E8784A' }}>查看全部 →</a>}
          >
            {notifications.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', padding: '24px 0', textAlign: 'center' }}>暂无通知</Text>
            ) : (
              notifications.slice(0, 3).map((n: any) => (
                <div key={n.id} style={{
                  padding: '10px 0', borderBottom: '1px solid #FBF0EA',
                  display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
                }} onClick={() => router.push(n.href || `/parent/notifications/${n.id}`)}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: n.read ? '#f5f5f5' : 'rgba(232,120,74,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BellOutlined style={{ color: n.read ? '#98A2B3' : '#E8784A', fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Text strong style={{ fontSize: 12, color: n.read ? '#7A869A' : '#1F2933' }} ellipsis>{n.title}</Text>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8784A', marginTop: 5, flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 2 }}>
                      {new Date(n.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>

        {/* Monthly Mood Calendar */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>😊 本月情绪日历</span>}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#98A2B3', padding: '2px 0' }}>{d}</div>
              ))}
              {Array.from({ length: new Date(today.getFullYear(), today.getMonth(), 1).getDay() || 7 }, (_, i) => i).slice(0, (new Date(today.getFullYear(), today.getMonth(), 1).getDay() || 7) - 1).map(i => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const moodData = moodMap[day]
                const mc = moodData ? MOOD_COLORS[moodData.mood] : null
                const isToday = day === today.getDate()
                const hasFeedback = !!moodData
                return (
                  <div key={day} style={{
                    height: 30, borderRadius: 6, display: 'grid', placeItems: 'center',
                    background: mc ? mc.bg : '#f8f8f8',
                    color: mc ? mc.color : '#ccc',
                    border: isToday ? '2px solid #E8784A' : '1px solid transparent',
                    fontSize: 11, fontWeight: mc ? 500 : 400,
                    cursor: hasFeedback ? 'pointer' : 'default',
                  }} onClick={() => hasFeedback && goCalendarDay(day)}>{day}</div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10, flexWrap: 'wrap' }}>
              {Object.entries(MOOD_COLORS).map(([key, c]) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.bg }} />
                  <span style={{ color: c.color }}>{c.label}</span>
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f0f0f0' }} />
                <span style={{ color: '#ccc' }}>无</span>
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 8, textAlign: 'center' }}>
              点击有颜色的日期查看当天反馈
            </Text>
          </Card>
        </Col>

        {/* Latest Teacher Feedback */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', height: '100%' }}
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>老师最新关注</span>}
            extra={latestFeedback && <a onClick={() => router.push('/parent/growth')} style={{ fontSize: 12, color: '#E8784A' }}>查看全部 →</a>}
          >
            {latestFeedback ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {latestFeedback.type === '课堂反馈' ? (
                    <BookOutlined style={{ color: '#534AB7' }} />
                  ) : (
                    <HeartOutlined style={{ color: '#E8784A' }} />
                  )}
                  <Text strong style={{ fontSize: 13 }}>{latestFeedback.teacherName}</Text>
                  <Tag style={{ borderRadius: 9999, fontSize: 10 }}>{latestFeedback.type}</Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {new Date(latestFeedback.date).toLocaleString('zh-CN')}
                  </Text>
                </div>
                {latestFeedback.studentName && (
                  <Text style={{ fontSize: 12, color: '#5a4e3a' }}>学员：{latestFeedback.studentName}</Text>
                )}
                <div style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 13, lineHeight: 1.7 }}>{latestFeedback.content}</Text>
                </div>
                {latestFeedback.mood && (
                  <Tag color={MOOD_COLORS[latestFeedback.mood]?.color} style={{ marginTop: 8, borderRadius: 9999 }}>
                    {MOOD_COLORS[latestFeedback.mood]?.label || latestFeedback.mood}
                  </Tag>
                )}
                <div style={{ marginTop: 10 }}>
                  <a onClick={() => router.push(`/parent/growth?feedbackId=${latestFeedback.id}`)} style={{ fontSize: 12, color: '#E8784A' }}>
                    查看详情 →
                  </a>
                </div>
              </div>
            ) : (
              <Text type="secondary" style={{ display: 'block', padding: '24px 0', textAlign: 'center' }}>
                暂无反馈，老师会在课后更新学习情况。
              </Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
