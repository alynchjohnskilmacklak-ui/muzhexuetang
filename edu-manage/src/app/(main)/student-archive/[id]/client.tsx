'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Button, Card, Empty, Progress, Select, Space, Spin, Tag, Timeline, Typography } from 'antd'
import {
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FlagOutlined,
  MessageOutlined,
  RiseOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { PageLayout } from '@/components/Layout/PageLayout'
import type { StudentProfile } from '@/lib/student-profile'

const { Text, Paragraph } = Typography

type StageSummaryItem = {
  id: string
  status: string
  periodStart: string
  periodEnd: string
  summary: string
  suggestions?: string | null
  publishedAt?: string | null
  updatedAt: string
  teacher?: { name: string } | null
}

type Payload = {
  profile: StudentProfile
  summaries: StageSummaryItem[]
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
})

export function StudentArchiveDetailClient({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [months, setMonths] = useState(6)
  const { data, isLoading, error } = useSWR<Payload>(
    `/api/admin/student-profile?studentId=${studentId}&months=${months}`,
    fetcher,
  )
  const profile = data?.profile

  return (
    <PageLayout
      title={profile ? `${profile.identity.name} · 学情档案` : '学情档案'}
      subtitle="管理端只读聚合视图，可查看本部别任意学员档案"
      actions={(
        <Space wrap>
          <Select
            value={months}
            onChange={setMonths}
            style={{ width: 128 }}
            options={[
              { label: '近 1 个月', value: 1 },
              { label: '近 3 个月', value: 3 },
              { label: '近 6 个月', value: 6 },
              { label: '近 12 个月', value: 12 },
            ]}
          />
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/student-archive')}>返回看板</Button>
        </Space>
      )}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : error || !profile ? (
        <Card bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1' }}>
          <Empty description={error?.message || '档案不存在'} />
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <ProfileHeader profile={profile} />
          <OverviewGrid profile={profile} />
          <StudySection profile={profile} />
          <HabitSection profile={profile} />
          <RecordSection profile={profile} />
          <CaseSection profile={profile} summaries={data?.summaries || []} />
        </Space>
      )}
    </PageLayout>
  )
}

function ProfileHeader({ profile }: { profile: StudentProfile }) {
  return (
    <Card bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1' }}>
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <Space wrap size={8}>
          <Text strong style={{ fontSize: 20 }}>{profile.identity.name}</Text>
          {profile.identity.grade && <Tag>{profile.identity.grade}</Tag>}
          {profile.identity.school && <Tag color="purple">{profile.identity.school}</Tag>}
          {profile.identity.mainTeacher && <Tag color="orange">{profile.identity.mainTeacher} 老师</Tag>}
        </Space>
        <Text type="secondary">累计课时 {profile.identity.totalHours}h</Text>
      </Space>
    </Card>
  )
}

function OverviewGrid({ profile }: { profile: StudentProfile }) {
  const items = [
    { label: '出勤率', value: profile.overview.attendanceRate !== null ? `${profile.overview.attendanceRate}%` : '-', icon: <CheckCircleOutlined />, color: '#1D9E75' },
    { label: '累计课时', value: `${profile.overview.totalHours}h`, icon: <BookOutlined />, color: '#E8784A' },
    { label: '本期试卷', value: `${profile.overview.paperCount} 份`, icon: <FileTextOutlined />, color: '#534AB7' },
    { label: '获得徽章', value: `${profile.overview.badgeCount} 枚`, icon: <TrophyOutlined />, color: '#EF9F27' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {items.map((item) => (
        <Card key={item.label} bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1' }}>
          <Space direction="vertical" size={4}>
            <span style={{ color: item.color, fontSize: 20 }}>{item.icon}</span>
            <Text type="secondary">{item.label}</Text>
            <Text strong style={{ color: item.color, fontSize: 22 }}>{item.value}</Text>
          </Space>
        </Card>
      ))}
    </div>
  )
}

function StudySection({ profile }: { profile: StudentProfile }) {
  const mastery = profile.study.mastery
  return (
    <ArchiveCard title="学" subtitle="知识掌握" icon={<BookOutlined />} color="#1D9E75">
      {mastery.total > 0 ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Progress percent={mastery.masteredPct} strokeColor="#1D9E75" trailColor="#F1E8DD" />
          <Space wrap>
            <Tag color="green">已掌握 {mastery.masteredPct}%</Tag>
            <Tag color="orange">需复习 {mastery.reviewPct}%</Tag>
            <Tag color="red">薄弱 {mastery.weakPct}%</Tag>
          </Space>
        </Space>
      ) : (
        <Text type="secondary">暂无知识掌握数据</Text>
      )}
      {profile.study.weaknesses.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong>薄弱知识点</Text>
          <div style={{ marginTop: 8 }}>
            {profile.study.weaknesses.map((item) => (
              <Tag key={item.topic} color={item.mistakeCount >= 3 ? 'red' : 'orange'} style={{ marginBottom: 6 }}>
                {item.topic} ×{item.mistakeCount}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </ArchiveCard>
  )
}

function HabitSection({ profile }: { profile: StudentProfile }) {
  return (
    <ArchiveCard title="习" subtitle="学习习惯与课堂状态" icon={<MessageOutlined />} color="#E8784A">
      <Space direction="vertical" size={10}>
        <Text>出勤率：{profile.habits.attendanceRate !== null ? `${profile.habits.attendanceRate}%` : '暂无记录'}</Text>
        {profile.habits.moodTimeline.length > 0 ? (
          <Space wrap>
            {profile.habits.moodTimeline.map((item, index) => (
              <Tag key={`${item.date}-${index}`} color="orange">{format(new Date(item.date), 'M月d日')} · {item.mood}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">暂无课堂情绪记录</Text>
        )}
      </Space>
    </ArchiveCard>
  )
}

function RecordSection({ profile }: { profile: StudentProfile }) {
  return (
    <ArchiveCard title="档" subtitle="成绩趋势与成长时间线" icon={<RiseOutlined />} color="#534AB7">
      {profile.record.trendBySubject.length > 0 && (
        <Space wrap style={{ marginBottom: 16 }}>
          {profile.record.trendBySubject.map((subject) => {
            const last = subject.points.at(-1)
            return <Tag key={subject.subject} color="purple">{subject.subject}：{last ? `${last.name} ${last.pct}%` : '暂无'}</Tag>
          })}
        </Space>
      )}
      {profile.record.timeline.length > 0 ? (
        <Timeline
          items={profile.record.timeline.slice(0, 16).map((item) => ({
            color: item.type === 'badge' ? 'gold' : item.type === 'feedback' ? 'green' : 'blue',
            children: (
              <div>
                <Space wrap size={6}>
                  <Text strong>{item.title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{format(new Date(item.date), 'yyyy-MM-dd')}</Text>
                  {item.teacher && <Tag>{item.teacher} 老师</Tag>}
                </Space>
                {item.sub && <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>{item.sub}</Paragraph>}
              </div>
            ),
          }))}
        />
      ) : (
        <Text type="secondary">暂无成长记录</Text>
      )}
    </ArchiveCard>
  )
}

function CaseSection({ profile, summaries }: { profile: StudentProfile; summaries: StageSummaryItem[] }) {
  return (
    <ArchiveCard title="案" subtitle="目标、教师寄语与阶段小结" icon={<FlagOutlined />} color="#EF9F27">
      {profile.profileCase.goals.length > 0 ? (
        <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
          {profile.profileCase.goals.map((goal) => (
            <div key={`${goal.subject}-${goal.goalDesc}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Text>{goal.goalDesc}</Text>
              <Tag color={goal.isAchieved ? 'green' : 'blue'}>{goal.isAchieved ? '已达成' : '进行中'}</Tag>
            </div>
          ))}
        </Space>
      ) : (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>暂无学习目标</Text>
      )}

      <Text strong>阶段小结列表</Text>
      <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 10 }}>
        {summaries.length > 0 ? summaries.map((summary) => (
          <Card key={summary.id} size="small" bordered style={{ borderRadius: 8 }}>
            <Space wrap style={{ marginBottom: 6 }}>
              <Tag color={summary.status === 'PUBLISHED' ? 'green' : 'orange'}>{summary.status === 'PUBLISHED' ? '已发布' : '草稿'}</Tag>
              <Text type="secondary">{summary.teacher?.name || '老师'}</Text>
              <Text type="secondary">
                {format(new Date(summary.periodStart), 'yyyy-MM-dd')} 至 {format(new Date(summary.periodEnd), 'yyyy-MM-dd')}
              </Text>
            </Space>
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 6 }}>{summary.summary}</Paragraph>
            {summary.suggestions && <Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>建议：{summary.suggestions}</Paragraph>}
          </Card>
        )) : (
          <Text type="secondary">暂无阶段小结</Text>
        )}
      </Space>
      <div style={{ marginTop: 14 }}>
        <Link href={`/teacher/student-profile/${profile.identity.id}`}>去教师端编辑入口</Link>
      </div>
    </ArchiveCard>
  )
}

function ArchiveCard({ title, subtitle, icon, color, children }: {
  title: string
  subtitle: string
  icon: ReactNode
  color: string
  children: ReactNode
}) {
  return (
    <Card bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1' }}>
      <Space align="center" size={8} style={{ marginBottom: 14 }}>
        <span style={{ color, fontSize: 18 }}>{icon}</span>
        <span style={{ color, fontSize: 20, fontWeight: 800 }}>{title}</span>
        <Text type="secondary">{subtitle}</Text>
      </Space>
      {children}
    </Card>
  )
}
