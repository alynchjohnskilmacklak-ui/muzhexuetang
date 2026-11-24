'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Input, Select, Button, Empty, Skeleton, Tooltip, Tag } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  TeamOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  AuditOutlined,
  CrownFilled,
  FireOutlined,
  UserOutlined,
  ExperimentOutlined,
  BookOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { ALL_SUBJECTS } from '@/constants/subjects'
import { useDivision } from '@/contexts/DivisionContext'
import styles from './teacher-interactions.module.css'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('加载失败')
    return res.json()
  })

type DateRangeOption = 'today' | '7d' | '30d' | 'all'

type StudentAgg = {
  studentId: string
  studentName: string
  grade: string | null
  gender: string | null
  pickCount: number
  correctCount: number
  partialCount: number
  needsWorkCount: number
  noAnswerCount: number
  lastPickedAt: string
  lastResult: string | null
  lastComment: string | null
}

type TeacherPickDetail = {
  id: string
  lessonId: string
  groupName: string
  courseName: string
  subject: string
  lessonDate: string
  timeRange: string
  studentId: string
  studentName: string
  grade: string | null
  round: number
  source: 'RANDOM' | 'MANUAL'
  questionLabel: string | null
  result: string | null
  comment: string | null
  createdAt: string
}

type TeacherInteractionItem = {
  teacher: {
    id: string
    name: string
    avatar: string | null
    gender: string | null
    tierLevel: string
    subjects: string
    phone: string
  }
  hasClasses?: boolean
  activeGroupsCount?: number
  activeLessonsCount?: number
  stats: {
    totalPicks: number
    uniqueStudentsCount: number
    totalLessons: number
    avgPicksPerLesson: number
    correctCount: number
    partialCount: number
    needsWorkCount: number
    noAnswerCount: number
    randomRatio: number
    correctRate: number
    lastInteractionAt: string | null
  }
  topStudentsPreview: Array<{
    studentId: string
    studentName: string
    grade: string | null
    pickCount: number
  }>
  studentRanking: StudentAgg[]
  recentPicks: TeacherPickDetail[]
}

type ApiResponse = {
  summary: {
    totalPicks: number
    totalStudentsCovered: number
    activeTeachersCount: number
    totalTeachersCount: number
    teachersWithClassesCount?: number
    idleTeachersCount?: number
    totalLessons: number
    avgPicksPerLesson: number
    overallCorrectRate: number
    needsWorkCount: number
    randomRatio: number
  }
  teachers: TeacherInteractionItem[]
  timeRange: {
    range: string
    startDate: string | null
    endDate: string | null
  }
}

type ClassFilterTab = 'HAS_CLASSES' | 'NO_CLASSES' | 'ALL'

export default function TeacherInteractionsPage() {
  const { division } = useDivision()
  const [range, setRange] = useState<DateRangeOption>('30d')
  const [subject, setSubject] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')
  const [classTab, setClassTab] = useState<ClassFilterTab>('HAS_CLASSES')
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<string>>(new Set())
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, 'students' | 'logs'>>({})

  // 构建 API URL
  const queryParams = new URLSearchParams()
  queryParams.set('range', range)
  if (division) queryParams.set('division', division)
  if (subject && subject !== 'ALL') queryParams.set('subject', subject)
  if (search.trim()) queryParams.set('search', search.trim())

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/admin/teacher-interactions?${queryParams.toString()}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 6000 }
  )

  const toggleExpand = (teacherId: string) => {
    setExpandedTeacherIds((prev) => {
      const next = new Set(prev)
      if (next.has(teacherId)) {
        next.delete(teacherId)
      } else {
        next.add(teacherId)
      }
      return next
    })
  }

  const setSubTab = (teacherId: string, tab: 'students' | 'logs') => {
    setActiveSubTabs((prev) => ({ ...prev, [teacherId]: tab }))
  }

  const summary = data?.summary || {
    totalPicks: 0,
    totalStudentsCovered: 0,
    activeTeachersCount: 0,
    totalTeachersCount: 0,
    teachersWithClassesCount: 0,
    idleTeachersCount: 0,
    totalLessons: 0,
    avgPicksPerLesson: 0,
    overallCorrectRate: 0,
    needsWorkCount: 0,
    randomRatio: 0,
  }

  const allTeachers = data?.teachers || []
  const teachersWithClasses = useMemo(
    () => allTeachers.filter((t) => t.hasClasses),
    [allTeachers]
  )
  const idleTeachers = useMemo(
    () => allTeachers.filter((t) => !t.hasClasses),
    [allTeachers]
  )

  const displayedTeachers = useMemo(() => {
    if (classTab === 'HAS_CLASSES') return teachersWithClasses
    if (classTab === 'NO_CLASSES') return idleTeachers
    return allTeachers
  }, [classTab, teachersWithClasses, idleTeachers, allTeachers])

  return (
    <PageLayout
      title="教师课堂提问与互动统计"
      subtitle="全景监控教师随堂点名提问频次、学员互动覆盖度与学情诊断闭环"
    >
      <div className={styles.pageContainer}>
        {/* 1. 顶部控制栏与筛选胶囊 */}
        <div className={styles.filterBar}>
          <div className={styles.filterGroupLeft}>
            <div className={styles.datePillsGroup}>
              <button
                type="button"
                className={`${styles.datePill} ${range === 'today' ? styles.datePillActive : ''}`}
                onClick={() => setRange('today')}
              >
                今日
              </button>
              <button
                type="button"
                className={`${styles.datePill} ${range === '7d' ? styles.datePillActive : ''}`}
                onClick={() => setRange('7d')}
              >
                近 7 天
              </button>
              <button
                type="button"
                className={`${styles.datePill} ${range === '30d' ? styles.datePillActive : ''}`}
                onClick={() => setRange('30d')}
              >
                近 30 天
              </button>
              <button
                type="button"
                className={`${styles.datePill} ${range === 'all' ? styles.datePillActive : ''}`}
                onClick={() => setRange('all')}
              >
                全部记录
              </button>
            </div>

            <Select
              value={subject}
              onChange={setSubject}
              style={{ width: 120 }}
              options={[
                { value: 'ALL', label: '全部学科' },
                ...ALL_SUBJECTS.map((s) => ({ value: s, label: s })),
              ]}
            />
          </div>

          <div className={styles.filterGroupRight}>
            <Input
              prefix={<SearchOutlined style={{ color: '#14574D' }} />}
              placeholder="搜索教师姓名或学员姓名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 220, borderRadius: 10 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void mutate()}
              loading={isLoading}
              style={{ borderRadius: 8 }}
            >
              刷新
            </Button>
          </div>
        </div>

        {/* 2. 全局 KPI 宏观罗盘 (精简紧凑版) */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiTitle}>课堂提问总量</span>
              <span className={`${styles.kpiIconWrap} ${styles.kpiIconGreen}`}>
                <QuestionCircleOutlined />
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{summary.totalPicks}</span>
              <span className={styles.kpiUnit}>次</span>
            </div>
            <div className={styles.kpiSub}>
              随机率 <strong>{summary.randomRatio}%</strong> · 点名{' '}
              <strong>{100 - summary.randomRatio}%</strong>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiTitle}>互动覆盖学员</span>
              <span className={`${styles.kpiIconWrap} ${styles.kpiIconGold}`}>
                <TeamOutlined />
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{summary.totalStudentsCovered}</span>
              <span className={styles.kpiUnit}>人</span>
            </div>
            <div className={styles.kpiSub}>
              人均被提问{' '}
              <strong>
                {summary.totalStudentsCovered > 0
                  ? (summary.totalPicks / summary.totalStudentsCovered).toFixed(1)
                  : 0}
              </strong>{' '}
              次
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiTitle}>参与提问名师</span>
              <span className={`${styles.kpiIconWrap} ${styles.kpiIconBlue}`}>
                <UserOutlined />
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{summary.activeTeachersCount}</span>
              <span className={styles.kpiUnit}>/ {summary.totalTeachersCount} 位</span>
            </div>
            <div className={styles.kpiSub}>
              单节均问 <strong>{summary.avgPicksPerLesson}</strong> 次 · <strong>{summary.totalLessons}</strong> 课次
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiTitle}>答对达标良好率</span>
              <span className={`${styles.kpiIconWrap} ${styles.kpiIconOrange}`}>
                <CheckCircleOutlined />
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{summary.overallCorrectRate}</span>
              <span className={styles.kpiUnit}>%</span>
            </div>
            <div className={styles.kpiSub}>
              需辅导订正 <strong>{summary.needsWorkCount}</strong> 次
            </div>
          </div>
        </div>

        {/* 3. 教师排课分类切换胶囊栏 */}
        <div className={styles.teacherClassFilterBar}>
          <div className={styles.classToggleGroup}>
            <button
              type="button"
              className={`${styles.classToggleBtn} ${classTab === 'HAS_CLASSES' ? styles.classToggleBtnActive : ''}`}
              onClick={() => setClassTab('HAS_CLASSES')}
            >
              <BookOutlined style={{ fontSize: 13 }} />
              <span>有课教师</span>
              <span className={styles.classCountBadge}>{teachersWithClasses.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.classToggleBtn} ${classTab === 'NO_CLASSES' ? styles.classToggleBtnActive : ''}`}
              onClick={() => setClassTab('NO_CLASSES')}
            >
              <UserOutlined style={{ fontSize: 13 }} />
              <span>暂无排课</span>
              <span className={styles.classCountBadge}>{idleTeachers.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.classToggleBtn} ${classTab === 'ALL' ? styles.classToggleBtnActive : ''}`}
              onClick={() => setClassTab('ALL')}
            >
              <span>全部名师</span>
              <span className={styles.classCountBadge}>{allTeachers.length}</span>
            </button>
          </div>
          <div className={styles.classFilterHint}>
            {classTab === 'HAS_CLASSES' && (
              <span>当前显示有在教班级或排课任务的任课教师（共 {teachersWithClasses.length} 位）</span>
            )}
            {classTab === 'NO_CLASSES' && (
              <span>显示目前暂未排课或尚无带课任务的在职教师（共 {idleTeachers.length} 位）</span>
            )}
            {classTab === 'ALL' && (
              <span>显示全部在职教师（共 {allTeachers.length} 位）</span>
            )}
          </div>
        </div>

        {/* 4. 教师统计列表与可展开精简卡片 */}
        {isLoading && !data ? (
          <div style={{ padding: '24px 0' }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#C0392B' }}>
            加载教师提问统计失败，请检查网络或点击刷新重试。
          </div>
        ) : displayedTeachers.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Empty
              description={
                classTab === 'HAS_CLASSES'
                  ? '当前所选筛选条件下暂无正在带课的教师'
                  : classTab === 'NO_CLASSES'
                  ? '目前所有教师均已安排带课任务'
                  : '所选条件与时间范围内暂无教师记录'
              }
            >
              {classTab === 'HAS_CLASSES' && allTeachers.length > 0 && (
                <Button onClick={() => setClassTab('ALL')} style={{ borderRadius: 8 }}>
                  查看全部在职教师
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <div className={styles.teacherList}>
            {displayedTeachers.map((item) => {
              const { teacher, stats, topStudentsPreview, studentRanking, recentPicks } = item
              const isExpanded = expandedTeacherIds.has(teacher.id)
              const activeSubTab = activeSubTabs[teacher.id] || 'students'
              const tier = resolveTier(teacher.tierLevel)
              const tierTheme = TIER_THEME[tier]
              const maxStudentPick = studentRanking[0]?.pickCount || 1

              return (
                <div
                  key={teacher.id}
                  className={`${styles.teacherCard} ${isExpanded ? styles.teacherCardExpanded : ''}`}
                >
                  {/* 折叠主栏 - 精简紧凑行 */}
                  <div
                    className={styles.cardSummaryRow}
                    onClick={() => toggleExpand(teacher.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                  >
                    {/* 左侧：教师头像与紧凑身份 */}
                    <div className={styles.teacherProfile}>
                      <div className={styles.avatarWrapper}>
                        <CachedAvatarImage
                          src={getTeacherAvatarUrl(teacher.avatar, teacher.gender)}
                          alt={teacher.name}
                          className={styles.teacherAvatar}
                          style={{
                            width: 38,
                            height: 38,
                            minWidth: 38,
                            minHeight: 38,
                            maxWidth: 38,
                            maxHeight: 38,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid rgba(201, 164, 92, 0.45)',
                            flexShrink: 0,
                          }}
                        />
                      </div>
                      <div className={styles.teacherInfo}>
                        <div className={styles.teacherNameRow}>
                          <span className={styles.teacherName}>{teacher.name}</span>
                          <span className={styles.subjectTag}>
                            {teacher.subjects || '通用'}
                          </span>
                          <span className={styles.tierTag}>
                            <CrownFilled style={{ fontSize: 9, color: '#C9A45C' }} />
                            {tierTheme.name}
                          </span>
                          {item.hasClasses ? (
                            <span className={styles.statusBadgeHasClass}>
                              {`在教 ${item.activeGroupsCount || 1} 班`}
                            </span>
                          ) : (
                            <span className={styles.statusBadgeIdle}>暂无课</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 中间：紧凑统计指标胶囊条 */}
                    <div className={styles.metricsCluster}>
                      <div className={styles.metricItem}>
                        <span className={styles.metricItemLabel}>提问</span>
                        <span className={styles.metricItemValue}>{stats.totalPicks}</span>
                        <span className={styles.metricItemUnit}>次</span>
                      </div>
                      <div className={styles.metricDivider} />
                      <div className={styles.metricItem}>
                        <span className={styles.metricItemLabel}>覆盖</span>
                        <span className={styles.metricItemValue}>{stats.uniqueStudentsCount}</span>
                        <span className={styles.metricItemUnit}>人</span>
                      </div>
                      <div className={styles.metricDivider} />
                      <div className={styles.metricItem}>
                        <span className={styles.metricItemLabel}>班次</span>
                        <span className={styles.metricItemValue}>{stats.totalLessons}</span>
                        <span className={styles.metricItemUnit}>节</span>
                      </div>
                      <div className={styles.metricDivider} />
                      <div className={styles.metricItem}>
                        <span className={styles.metricItemLabel}>良好率</span>
                        <span className={styles.metricItemValue}>{stats.correctRate}%</span>
                      </div>
                    </div>

                    {/* 右侧：常问学员轻量预览与展开按钮 */}
                    <div className={styles.actionSide}>
                      {topStudentsPreview.length > 0 && (
                        <div className={styles.topStudentsPills}>
                          <span className={styles.topStudentPrefix}>常问:</span>
                          {topStudentsPreview.slice(0, 2).map((s) => (
                            <span key={s.studentId} className={styles.topStudentChip}>
                              {s.studentName}
                              <span className={styles.topStudentCount}>{s.pickCount}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        className={styles.expandToggleBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpand(teacher.id)
                        }}
                      >
                        <span>{isExpanded ? '收起' : '学情细节'}</span>
                        <DownOutlined
                          className={`${styles.expandArrow} ${isExpanded ? styles.expandArrowRotated : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 展开深度下钻区域 */}
                  {isExpanded && (
                    <div className={styles.expandedContainer}>
                      {/* 内部双 Tab 切换 */}
                      <div className={styles.expandedTabNav}>
                        <div className={styles.subTabsPills}>
                          <button
                            type="button"
                            className={`${styles.subTabBtn} ${activeSubTab === 'students' ? styles.subTabBtnActive : ''}`}
                            onClick={() => setSubTab(teacher.id, 'students')}
                          >
                            学员提问频次分布榜 ({studentRanking.length} 人)
                          </button>
                          <button
                            type="button"
                            className={`${styles.subTabBtn} ${activeSubTab === 'logs' ? styles.subTabBtnActive : ''}`}
                            onClick={() => setSubTab(teacher.id, 'logs')}
                          >
                            随堂提问流水明细 ({recentPicks.length} 条)
                          </button>
                        </div>
                      </div>

                      {/* Tab 1: 学员频次分布榜 */}
                      {activeSubTab === 'students' && (
                        <div>
                          {studentRanking.length === 0 ? (
                            <div style={{ padding: '24px 0', textAlign: 'center', color: '#756A58' }}>
                              该教师在此时间段暂无提问学员记录
                            </div>
                          ) : (
                            <div className={styles.rankingTableWrap}>
                              <table className={styles.rankingTable}>
                                <thead>
                                  <tr>
                                    <th style={{ width: 60 }}>排名</th>
                                    <th style={{ width: 140 }}>学员姓名</th>
                                    <th style={{ width: 160 }}>被提问频次</th>
                                    <th>作答表现分布</th>
                                    <th style={{ width: 220 }}>最近点评与时间</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {studentRanking.map((s, idx) => {
                                    const rankClass =
                                      idx === 0
                                        ? styles.rankBadgeTop1
                                        : idx === 1
                                        ? styles.rankBadgeTop2
                                        : idx === 2
                                        ? styles.rankBadgeTop3
                                        : ''

                                    const percent = Math.min(
                                      100,
                                      Math.round((s.pickCount / maxStudentPick) * 100)
                                    )

                                    return (
                                      <tr key={s.studentId}>
                                        <td>
                                          <span className={`${styles.rankBadge} ${rankClass}`}>
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td>
                                          <div className={styles.studentCell}>
                                            <span className={styles.studentName}>
                                              {s.studentName}
                                            </span>
                                            {s.grade && (
                                              <span className={styles.gradeChip}>{s.grade}</span>
                                            )}
                                          </div>
                                        </td>
                                        <td>
                                          <div className={styles.pickCountBarWrap}>
                                            <span className={styles.pickCountPill}>
                                              {s.pickCount} 次
                                            </span>
                                            <div className={styles.pickProgressBar}>
                                              <div
                                                className={styles.pickProgressFill}
                                                style={{ width: `${percent}%` }}
                                              />
                                            </div>
                                          </div>
                                        </td>
                                        <td>
                                          <div className={styles.resultBreakdownRow}>
                                            {s.correctCount > 0 && (
                                              <span className={`${styles.resultTag} ${styles.tagCorrect}`}>
                                                🎯 答对 {s.correctCount}
                                              </span>
                                            )}
                                            {s.partialCount > 0 && (
                                              <span className={`${styles.resultTag} ${styles.tagPartial}`}>
                                                💡 部分对 {s.partialCount}
                                              </span>
                                            )}
                                            {s.needsWorkCount > 0 && (
                                              <span className={`${styles.resultTag} ${styles.tagNeedsWork}`}>
                                                ⚠️ 需订正 {s.needsWorkCount}
                                              </span>
                                            )}
                                            {s.noAnswerCount > 0 && (
                                              <span className={`${styles.resultTag} ${styles.tagNoAnswer}`}>
                                                ⚪ 未作答 {s.noAnswerCount}
                                              </span>
                                            )}
                                            {s.correctCount === 0 &&
                                              s.partialCount === 0 &&
                                              s.needsWorkCount === 0 &&
                                              s.noAnswerCount === 0 && (
                                                <span style={{ fontSize: 11, color: '#A09380' }}>
                                                  暂无作答表现记录
                                                </span>
                                              )}
                                          </div>
                                        </td>
                                        <td>
                                          <div style={{ fontSize: 11.5, color: '#5A4E3A' }}>
                                            {s.lastComment ? (
                                              <Tooltip title={s.lastComment}>
                                                <span
                                                  style={{
                                                    display: 'inline-block',
                                                    maxWidth: 200,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: '#1A1201',
                                                  }}
                                                >
                                                  “{s.lastComment}”
                                                </span>
                                              </Tooltip>
                                            ) : (
                                              <span style={{ color: '#A09380' }}>暂无随堂评语</span>
                                            )}
                                            <div
                                              style={{
                                                fontSize: 10.5,
                                                color: '#8A7D6B',
                                                marginTop: 2,
                                                fontVariantNumeric: 'tabular-nums',
                                              }}
                                            >
                                              {s.lastPickedAt ? s.lastPickedAt.slice(0, 10) : ''}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 2: 随堂流水明细 */}
                      {activeSubTab === 'logs' && (
                        <div>
                          {recentPicks.length === 0 ? (
                            <div style={{ padding: '24px 0', textAlign: 'center', color: '#756A58' }}>
                              该教师在此时间段暂无详细流水日志
                            </div>
                          ) : (
                            <div className={styles.logsList}>
                              {recentPicks.map((log) => {
                                const resultBadge =
                                  log.result === 'CORRECT' ? (
                                    <span className={`${styles.resultTag} ${styles.tagCorrect}`}>
                                      🎯 答对了
                                    </span>
                                  ) : log.result === 'PARTIAL' ? (
                                    <span className={`${styles.resultTag} ${styles.tagPartial}`}>
                                      💡 部分正确
                                    </span>
                                  ) : log.result === 'NEEDS_WORK' ? (
                                    <span className={`${styles.resultTag} ${styles.tagNeedsWork}`}>
                                      ⚠️ 需要订正
                                    </span>
                                  ) : log.result === 'NO_ANSWER' ? (
                                    <span className={`${styles.resultTag} ${styles.tagNoAnswer}`}>
                                      ⚪ 未作答
                                    </span>
                                  ) : null

                                return (
                                  <div key={log.id} className={styles.logItem}>
                                    <div className={styles.logLeft}>
                                      <div className={styles.logHeaderRow}>
                                        <span className={styles.logLessonInfo}>
                                          {log.lessonDate} {log.timeRange} · {log.groupName}
                                        </span>
                                        <span
                                          className={`${styles.logSourceTag} ${
                                            log.source === 'RANDOM'
                                              ? styles.sourceRandom
                                              : styles.sourceManual
                                          }`}
                                        >
                                          {log.source === 'RANDOM' ? '🎲 随机抽取' : '👆 点名叫人'}
                                        </span>
                                        {resultBadge}
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <span className={styles.logStudentName}>
                                          {log.studentName}
                                        </span>
                                        {log.grade && (
                                          <span className={styles.gradeChip}>{log.grade}</span>
                                        )}
                                        {log.questionLabel && (
                                          <span className={styles.logQuestionLabel}>
                                            {log.questionLabel}
                                          </span>
                                        )}
                                      </div>

                                      {log.comment && (
                                        <div className={styles.logCommentText}>
                                          现场点评：{log.comment}
                                        </div>
                                      )}
                                    </div>

                                    <div className={styles.logRight}>
                                      <span className={styles.logTimeText}>
                                        {log.createdAt ? log.createdAt.slice(11, 16) : ''}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
