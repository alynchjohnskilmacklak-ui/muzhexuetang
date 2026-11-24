'use client'

import { useMemo, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import {
  Alert, Button, Card, Drawer, Empty, Input, Progress, Select, Skeleton, Tag,
} from 'antd'
import {
  ArrowLeftOutlined, BookOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SearchOutlined, TeamOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'

type VocabularyStudentStat = {
  studentId: string
  name: string
  grade: string | null
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  accuracy: number
  progressWords: number
  masteredWords: number
  reviewWords: number
  lastStudyAt: string | null
}

type VocabularyOverviewResponse = {
  overview: {
    activeLearners: number
    totalSessions: number
    progressWords: number
    masteredWords: number
    totalQuestions: number
    totalCorrect: number
    accuracy: number
  }
  list: VocabularyStudentStat[]
  filters: { gradeOptions: string[]; volumeOptions: string[] }
}

type VocabularyDetailResponse = {
  student: { id: string; name: string; grade: string | null }
  overview: {
    totalSessions: number
    totalQuestions: number
    totalCorrect: number
    accuracy: number
    progressWords: number
    masteredWords: number
    lastSessionAt: string | null
  }
  units: Array<{
    grade: string
    volume: string
    unit: string
    totalWords: number
    studiedWords: number
    mastered: number
    learning: number
    wrong: number
    masteryRate: number
  }>
  sessions: Array<{
    id: string
    grade: string
    volume: string
    unit: string | null
    total: number
    correct: number
    wrong: number
    finishedAt: string
  }>
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('加载失败，请稍后重试')
  return response.json() as Promise<T>
}

function createQuery(grade: string, volume: string, search: string): string {
  const params = new URLSearchParams()
  if (grade) params.set('grade', grade)
  if (volume) params.set('volume', volume)
  if (search.trim()) params.set('q', search.trim())
  const query = params.toString()
  return query ? `?${query}` : ''
}

function SummaryMetric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <Card size="small" styles={{ body: { padding: 14 } }} style={{ borderRadius: 14, borderColor: 'var(--color-hairline)', boxShadow: '0 4px 14px rgba(26,18,1,.035)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span aria-hidden="true" style={{ width: 38, height: 38, flex: '0 0 38px', display: 'grid', placeItems: 'center', borderRadius: 12, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: 16 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--color-ink)', fontSize: 21, fontWeight: 750, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </Card>
  )
}

export default function VocabularyStatisticsPage() {
  const isMobile = useIsMobile() ?? false
  const [grade, setGrade] = useState('')
  const [volume, setVolume] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const query = useMemo(() => createQuery(grade, volume, search), [grade, volume, search])
  const { data, error, isLoading } = useSWR<VocabularyOverviewResponse>(`/api/admin/vocab-stats${query}`, fetcher)
  const detailQuery = useMemo(() => createQuery(grade, volume, ''), [grade, volume])
  const detailKey = selectedStudentId
    ? `/api/admin/vocab-stats/${encodeURIComponent(selectedStudentId)}${detailQuery}`
    : null
  const { data: detail, error: detailError, isLoading: detailLoading } = useSWR<VocabularyDetailResponse>(detailKey, fetcher)

  const summary = data?.overview
  const selectedStudent = data?.list.find((student) => student.studentId === selectedStudentId)
  const metricColumns = isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))'

  const clearDetail = () => setSelectedStudentId(null)
  const filterChanged = () => setSelectedStudentId(null)

  const headerAction = (
    <Button className="mobile-shell-back" href="/grades" icon={<ArrowLeftOutlined />} style={{ borderRadius: 10, color: 'var(--color-primary)' }}>
      统计中心
    </Button>
  )

  return (
    <PageLayout title="单词背诵情况" subtitle="查看家长端单词练习、教材单元进度和最近学习记录。" actions={headerAction}>
      <main style={{ width: '100%', maxWidth: 1440, margin: '0 auto', padding: isMobile ? '8px 12px 24px' : '8px 24px 32px' }}>
        <section aria-label="单词背诵筛选" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <Select
            value={grade || undefined}
            placeholder="全部年级"
            allowClear
            options={(data?.filters.gradeOptions || []).map((item) => ({ value: item, label: item }))}
            onChange={(value) => { setGrade(value || ''); setVolume(''); filterChanged() }}
            style={{ width: isMobile ? 'calc(50% - 5px)' : 150 }}
          />
          <Select
            value={volume || undefined}
            placeholder="全部册次"
            allowClear
            options={(data?.filters.volumeOptions || []).map((item) => ({ value: item, label: item }))}
            onChange={(value) => { setVolume(value || ''); filterChanged() }}
            style={{ width: isMobile ? 'calc(50% - 5px)' : 150 }}
          />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); filterChanged() }}
            placeholder="搜索学员姓名"
            prefix={<SearchOutlined style={{ color: 'var(--color-ink-subtle)' }} />}
            allowClear
            style={{ width: isMobile ? '100%' : 240, borderRadius: 10 }}
          />
        </section>

        <section aria-label="背词统计概览" style={{ display: 'grid', gridTemplateColumns: metricColumns, gap: 10, marginBottom: 16 }}>
          <SummaryMetric label="练习学员" value={error ? '—' : isLoading ? '…' : summary?.activeLearners ?? 0} icon={<TeamOutlined />} />
          <SummaryMetric label="练习次数" value={error ? '—' : isLoading ? '…' : summary?.totalSessions ?? 0} icon={<BookOutlined />} />
          <SummaryMetric label="已有单词进度" value={error ? '—' : isLoading ? '…' : summary?.progressWords ?? 0} icon={<BookOutlined />} />
          <SummaryMetric label="已掌握词数" value={error ? '—' : isLoading ? '…' : summary?.masteredWords ?? 0} icon={<CheckCircleOutlined />} />
          <SummaryMetric label="练习正确率" value={error ? '—' : isLoading ? '…' : `${summary?.accuracy ?? 0}%`} icon={<CheckCircleOutlined />} />
        </section>

        {error ? (
          <Alert type="error" showIcon message="背词统计暂时无法加载" description={error.message} />
        ) : isLoading ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : data?.list.length ? (
          <section aria-label="学员背词统计" style={{ display: 'grid', gap: 10 }}>
            {data.list.map((student) => {
              const masteryRate = student.progressWords > 0
                ? Math.round((student.masteredWords / student.progressWords) * 100)
                : 0
              return (
                <button
                  key={student.studentId}
                  type="button"
                  className="pressable"
                  onClick={() => setSelectedStudentId(student.studentId)}
                  aria-label={`查看${student.name}的单词背诵详情`}
                  style={{
                    width: '100%',
                    padding: isMobile ? 14 : '16px 18px',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 1.2fr) repeat(3, minmax(90px, .7fr)) minmax(150px, 1fr)',
                    alignItems: 'center',
                    gap: isMobile ? 12 : 18,
                    textAlign: 'left',
                    color: 'var(--color-ink)',
                    background: 'var(--color-surface-1)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 14,
                    boxShadow: '0 4px 14px rgba(26,18,1,.035)',
                    font: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 40, height: 40, flex: '0 0 40px', display: 'grid', placeItems: 'center', borderRadius: 12, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: 750 }}>
                      {student.name.slice(0, 1)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</div>
                      <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginTop: 2 }}>{student.grade || '年级未设置'}</div>
                    </div>
                  </div>
                  <div><strong>{student.totalSessions}</strong><span style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginLeft: 5 }}>次练习</span></div>
                  <div><strong>{student.progressWords}</strong><span style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginLeft: 5 }}>个有进度</span></div>
                  <div><strong>{student.accuracy}%</strong><span style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginLeft: 5 }}>正确率</span></div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                      <span style={{ color: 'var(--color-ink-subtle)' }}>已学词掌握率</span><strong>{masteryRate}%</strong>
                    </div>
                    <Progress percent={masteryRate} showInfo={false} size="small" strokeColor="var(--color-primary)" trailColor="var(--color-surface-3)" />
                    <div style={{ color: 'var(--color-ink-subtle)', fontSize: 11 }}>
                      {student.lastStudyAt ? `最近学习 ${dayjs(student.lastStudyAt).format('MM-DD HH:mm')}` : '暂无最近学习时间'}
                    </div>
                  </div>
                </button>
              )
            })}
          </section>
        ) : (
          <Card style={{ borderRadius: 14, borderColor: 'var(--color-hairline)' }}>
            <Empty description="当前筛选下还没有单词背诵记录">
              <span style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>学员在家长端完成单词练习后，记录会显示在这里。</span>
            </Empty>
          </Card>
        )}

        <Drawer
          title={selectedStudent ? `${selectedStudent.name} · 单词背诵` : '单词背诵详情'}
          open={Boolean(selectedStudentId)}
          onClose={clearDetail}
          placement={isMobile ? 'bottom' : 'right'}
          width={isMobile ? '100%' : 560}
          height={isMobile ? '82vh' : undefined}
          styles={{ body: { padding: isMobile ? 14 : 20, background: 'var(--color-canvas)' } }}
          destroyOnClose
        >
          {detailError ? (
            <Alert type="error" showIcon message="学员详情加载失败" description={detailError.message} />
          ) : detailLoading ? (
            <Skeleton active paragraph={{ rows: 7 }} />
          ) : detail ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <SummaryMetric label="练习次数" value={detail.overview.totalSessions} icon={<BookOutlined />} />
                <SummaryMetric label="正确率" value={`${detail.overview.accuracy}%`} icon={<CheckCircleOutlined />} />
                <SummaryMetric label="已有进度" value={detail.overview.progressWords} icon={<BookOutlined />} />
                <SummaryMetric label="已掌握" value={detail.overview.masteredWords} icon={<CheckCircleOutlined />} />
              </div>

              <Card title="教材单元进度" size="small" style={{ borderRadius: 14, borderColor: 'var(--color-hairline)' }}>
                {detail.units.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {detail.units.map((unit) => (
                      <div key={unit.unit} style={{ padding: 11, border: '1px solid var(--color-hairline)', borderRadius: 12, background: 'var(--color-surface-1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{unit.grade} · {unit.volume} · {unit.unit}</strong>
                          <span style={{ flex: '0 0 auto', color: 'var(--color-ink-subtle)', fontSize: 12 }}>{unit.studiedWords}/{unit.totalWords} 词</span>
                        </div>
                        <Progress percent={unit.masteryRate} showInfo={false} size="small" strokeColor="var(--color-primary)" trailColor="var(--color-surface-3)" />
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 5, fontSize: 12 }}>
                          <span style={{ color: 'var(--color-success-action)' }}>掌握 {unit.mastered}</span>
                          <span style={{ color: 'var(--color-warning-text)' }}>学习中 {unit.learning}</span>
                          <span style={{ color: 'var(--color-error)' }}>待复习 {unit.wrong}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无教材单元数据" />}
              </Card>

              <Card title="最近练习" size="small" style={{ borderRadius: 14, borderColor: 'var(--color-hairline)' }}>
                {detail.sessions.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {detail.sessions.map((session) => (
                      <div key={session.id} style={{ padding: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid var(--color-hairline)', borderRadius: 12, background: 'var(--color-surface-1)' }}>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{session.grade} · {session.volume} · {session.unit || '整册练习'}</strong>
                          <span style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}><ClockCircleOutlined /> {dayjs(session.finishedAt).format('YYYY-MM-DD HH:mm')}</span>
                        </div>
                        <Tag color={session.total > 0 && session.correct === session.total ? 'success' : 'processing'} style={{ marginInlineEnd: 0, flex: '0 0 auto' }}>
                          {session.correct}/{session.total} 正确
                        </Tag>
                      </div>
                    ))}
                  </div>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无练习记录" />}
              </Card>
            </div>
          ) : null}
        </Drawer>
      </main>
    </PageLayout>
  )
}
