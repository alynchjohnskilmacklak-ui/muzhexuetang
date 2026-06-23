'use client'

import { useState, useEffect } from 'react'
import { Card, Tabs, Tag, Descriptions, Empty, Spin, Typography, Table, Progress, Image } from 'antd'
import {
  BookOutlined, CameraOutlined, TrophyOutlined,
  LineChartOutlined, FileTextOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { fmtDate, fmtDateTime } from '@/lib/format-date'

const { Title, Text } = Typography

interface ArchiveData {
  studentBasic: any; courses: any; attendance: any
  feedbacks: any[]; profile: any; files: any[]; timeline: any[]
}

export function ParentArchiveClient({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [data, setData] = useState<ArchiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    fetch(`/api/parent/students/${studentId}/archive`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  if (error) return <Empty description={error} />
  if (!data) return <Empty description="暂无数据" />

  const s = data.studentBasic
  const p = data.profile

  const tabs = [
    { key: 'overview', label: '概览', icon: <BookOutlined /> },
    { key: 'feedbacks', label: '课堂反馈', icon: <CameraOutlined /> },
    { key: 'growth', label: '成长记录', icon: <TrophyOutlined /> },
    { key: 'grades', label: '成绩分析', icon: <LineChartOutlined /> },
    { key: 'attendance', label: '出勤课时', icon: <ClockCircleOutlined /> },
    { key: 'files', label: '资料文件', icon: <FileTextOutlined /> },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '12px 0' }}>
      {/* Student header */}
      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(232,120,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#E8784A' }}>
            {studentName[0]}
          </div>
          <div>
            <Text strong style={{ fontSize: 17, color: '#1F2933' }}>{studentName}</Text>
            <div style={{ fontSize: 12, color: '#7A869A' }}>
              {[s.grade, s.school].filter(Boolean).join(' · ')}
              {s.mainTeacher && <span> · 主老师：{s.mainTeacher}</span>}
            </div>
            <div style={{ marginTop: 4 }}>
              <Tag color="orange">剩余 {s.remainHours} 课时</Tag>
              {p?.overview?.attendanceRate != null && (
                <Tag color={p.overview.attendanceRate >= 80 ? 'green' : 'orange'}>
                  出勤率 {p.overview.attendanceRate}%
                </Tag>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs activeKey={tab} onChange={setTab} items={tabs} style={{ background: '#fff', borderRadius: 12, padding: '0 16px' }} />

      {/* Tab content */}
      <div style={{ marginTop: 8 }}>
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'feedbacks' && <FeedbacksTab feedbacks={data.feedbacks} />}
        {tab === 'growth' && <TimelineTab timeline={data.timeline} profile={p} />}
        {tab === 'grades' && <GradesTab profile={p} />}
        {tab === 'attendance' && <AttendanceTab attendance={data.attendance} courses={data.courses} />}
        {tab === 'files' && <FilesTab files={data.files} />}
      </div>
    </div>
  )
}

function OverviewTab({ data }: { data: ArchiveData }) {
  const s = data.studentBasic
  const c = data.courses
  const a = data.attendance
  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
        <Title level={5}>基本信息</Title>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="主老师">{s.mainTeacher || '-'}</Descriptions.Item>
          <Descriptions.Item label="剩余课时">{s.remainHours} / {s.totalHours}</Descriptions.Item>
          <Descriptions.Item label="出勤率">{a.summary.rate != null ? `${a.summary.rate}%` : '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">{s.status === 'ACTIVE' ? '在读' : s.status}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
        <Title level={5}>当前课程</Title>
        {c.classGroups.length === 0 ? <Empty description="暂无课程" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
          c.classGroups.map((g: any) => (
            <Card key={g.id} size="small" bordered={false} style={{ background: '#FFFBF7', borderRadius: 8, marginBottom: 8 }}>
              <Text strong>{g.courseName}</Text>
              <div style={{ fontSize: 12, color: '#7A869A' }}>教师：{g.teacherNames.join('、')}</div>
            </Card>
          ))
        )}
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
        <Title level={5}>近期课程</Title>
        {c.recentLessons.length === 0 ? <Empty description="暂无近期课程" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
          c.recentLessons.slice(0, 5).map((l: any) => (
            <div key={l.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f0eb', fontSize: 13 }}>
              <Text>{fmtDate(l.lessonDate)} {l.startTime}-{l.endTime}</Text>
              <Text type="secondary" style={{ marginLeft: 12 }}>{l.courseName} · {l.teacherName}</Text>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

function FeedbacksTab({ feedbacks }: { feedbacks: any[] }) {
  if (!feedbacks?.length) return <Empty description="暂无课堂反馈" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  return feedbacks.map((f: any) => (
    <Card key={f.id} bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text strong>{f.teacher?.name || '老师'}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{fmtDateTime(f.createdAt)}</Text>
      </div>
      {f.tags?.length > 0 && <div style={{ marginBottom: 8 }}>{f.tags.map((t: string) => <Tag key={t} color="orange" style={{ borderRadius: 9999 }}>{t}</Tag>)}</div>}
      {f.knowledgePoints?.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>知识点：{f.knowledgePoints.join('、')}</Text>}
      {f.summary && <div style={{ marginTop: 8, fontSize: 13, color: '#4A5568' }}>{f.summary}</div>}
      {f.overallComment && <div style={{ marginTop: 4, fontSize: 13, fontStyle: 'italic', color: '#718096' }}>{f.overallComment}</div>}
      {f.imageUrls?.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {f.imageUrls.map((url: string, i: number) => (
            <Image key={i} src={url} width={80} height={80} style={{ borderRadius: 8, objectFit: 'cover' }}
              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRleHQgeD0iNDAiIHk9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg==" />
          ))}
        </div>
      )}
      {f.parentReply && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#FFF3E8', fontSize: 12 }}>
          <Text type="secondary">我的回复：</Text>{f.parentReply}
        </div>
      )}
      {f.adminReply && (
        <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#E8F4FD', fontSize: 12 }}>
          <Text type="secondary">老师回复：</Text>{f.adminReply}
        </div>
      )}
    </Card>
  ))
}

function TimelineTab({ timeline, profile }: { timeline: any[]; profile: any }) {
  const items = timeline || []
  if (!items.length && !profile?.record?.timeline?.length) {
    return <Empty description="暂无成长记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }
  const all = [...items, ...(profile?.record?.timeline || [])].sort((a: any, b: any) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  return all.slice(0, 40).map((item: any, i: number) => (
    <Card key={i} size="small" bordered={false} style={{ borderRadius: 10, background: '#FFFBF7', marginBottom: 6 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ fontSize: 20 }}>
          {item.type === 'badge' ? '🏅' : item.type === 'feedback' ? '📝' : item.type === 'paper' ? '📄' : item.type === 'post' ? '🌟' : '📌'}
        </div>
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
          {item.sub && <div style={{ fontSize: 12, color: '#7A869A' }}>{item.sub}</div>}
          {item.content && <div style={{ fontSize: 12, color: '#4A5568', marginTop: 2 }}>{item.content}</div>}
          <div style={{ fontSize: 11, color: '#B0B8C1', marginTop: 4 }}>
            {fmtDateTime(item.date)}
            {item.teacher ? ` · ${item.teacher}` : ''}
          </div>
        </div>
      </div>
    </Card>
  ))
}

function GradesTab({ profile }: { profile: any }) {
  if (!profile) return <Empty description="暂无成绩数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  const { study, record, profileCase } = profile

  return (
    <div>
      {study && (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
          <Title level={5}>知识掌握</Title>
          <Progress percent={study.mastery?.masteredPct || 0} format={() => `掌握 ${study.mastery?.masteredPct || 0}%`} strokeColor="#E8784A" />
          <div style={{ marginTop: 8 }}>
            {study.weaknesses?.map((w: any) => (
              <Tag key={w.topic} color="red" style={{ marginBottom: 4 }}>{w.topic} ×{w.mistakeCount}</Tag>
            ))}
          </div>
        </Card>
      )}

      {profileCase?.teacherSummary && (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
          <Title level={5}>阶段总结</Title>
          <Text>{profileCase.teacherSummary.summary}</Text>
          {profileCase.teacherSummary.suggestions && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">建议：{profileCase.teacherSummary.suggestions}</Text>
            </div>
          )}
          <div style={{ fontSize: 11, color: '#B0B8C1', marginTop: 4 }}>
            {profileCase.teacherSummary.teacherName} · {profileCase.teacherSummary.periodStart && fmtDate(profileCase.teacherSummary.periodStart)}-{profileCase.teacherSummary.periodEnd && fmtDate(profileCase.teacherSummary.periodEnd)}
          </div>
        </Card>
      )}

      {record?.trendBySubject?.length > 0 && (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}>
          <Title level={5}>成绩趋势</Title>
          {record.trendBySubject.map((s: any) => (
            <div key={s.subject} style={{ marginBottom: 8 }}>
              <Text strong>{s.subject}</Text>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {s.points?.map((p: any, i: number) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 11 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: p.pct >= 80 ? '#E8F5E9' : p.pct >= 60 ? '#FFF3E0' : '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                      {p.pct}
                    </div>
                    <div style={{ color: '#B0B8C1' }}>{p.name?.slice(0, 3)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function AttendanceTab({ attendance, courses }: { attendance: any; courses: any }) {
  const a = attendance
  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
        <Title level={5}>出勤统计</Title>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="总课次">{a.summary.total}</Descriptions.Item>
          <Descriptions.Item label="到课">{a.summary.present}</Descriptions.Item>
          <Descriptions.Item label="请假">{a.summary.leave}</Descriptions.Item>
          <Descriptions.Item label="缺勤">{a.summary.absent}</Descriptions.Item>
          <Descriptions.Item label="补课">{a.summary.makeup}</Descriptions.Item>
          <Descriptions.Item label="出勤率">{a.summary.rate != null ? `${a.summary.rate}%` : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 12 }}>
        <Title level={5}>近期考勤记录</Title>
        {a.records?.length === 0 ? <Empty description="暂无记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
          <Table
            size="small"
            pagination={false}
            dataSource={a.records.slice(0, 30)}
            rowKey="id"
            columns={[
              { title: '日期', dataIndex: 'lessonDate', render: (d: Date) => fmtDate(d) },
              { title: '时间', render: (_: any, r: any) => `${r.startTime}-${r.endTime}` },
              { title: '课程', dataIndex: 'courseName' },
              {
                title: '状态', dataIndex: 'status',
                render: (s: string) => <Tag color={s === 'PRESENT' ? 'green' : s === 'LEAVE' ? 'orange' : 'red'}>{s === 'PRESENT' ? '到课' : s === 'LEAVE' ? '请假' : s === 'ABSENT' ? '缺勤' : s}</Tag>,
              },
            ]}
          />
        )}
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}>
        <Title level={5}>当前课程</Title>
        {courses.teachers.map((t: any) => (
          <Tag key={t.id} color="orange" style={{ marginBottom: 4 }}>{t.name}</Tag>
        ))}
      </Card>
    </div>
  )
}

function FilesTab({ files }: { files: any[] }) {
  if (!files?.length) return <Empty description="暂无文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  return files.map((f: any) => (
    <Card key={f.id} size="small" bordered={false} style={{ borderRadius: 10, background: '#FFFBF7', marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text strong>{f.name}</Text>
          <div style={{ fontSize: 11, color: '#B0B8C1' }}>{f.mimeType} · {Math.round(f.size / 1024)}KB · {fmtDate(f.createdAt)}</div>
        </div>
        <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>查看</a>
      </div>
    </Card>
  ))
}
