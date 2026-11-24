'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Progress,
  Input,
  Select,
  Segmented,
  Button,
  Space,
  Drawer,
  Tabs,
  Image,
  Empty,
  Popconfirm,
  Badge,
  Spin,
} from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  TrophyOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
  PhoneOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { toast } from 'sonner'
import styles from './homework.module.css'
import { useDivision } from '@/contexts/DivisionContext'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'

const { Text, Title, Paragraph } = Typography

export type HomeworkSubmissionItem = {
  id: string
  studentId: string
  studentName: string
  grade: string
  parentName: string
  parentPhone: string
  content: string
  attachmentUrls: string[]
  status: 'SUBMITTED' | 'REVIEWED'
  score: number | null
  teacherComment: string | null
  submittedAt: string
  reviewedAt: string | null
}

export type HomeworkMissingStudent = {
  id: string
  name: string
  grade: string
}

export type HomeworkAssignmentItem = {
  id: string
  title: string
  instructions: string | null
  attachments: string[]
  dueAt: string
  createdAt: string
  group: {
    id: string
    name: string
    division: string
    subject: string
  }
  teacher: {
    id: string
    name: string
    user?: { id: string; avatarUrl: string | null }
  }
  term: {
    id: string
    name: string
  } | null
  stats: {
    totalStudents: number
    submittedCount: number
    submissionRate: number
    reviewedCount: number
    reviewRate: number
    pendingReviewCount: number
    avgScore: number | null
    isOverdue: boolean
  }
  submissions: HomeworkSubmissionItem[]
  missingStudents: HomeworkMissingStudent[]
}

export type HomeworkApiResponse = {
  kpi: {
    totalAssignments: number
    totalSubmissionsCount: number
    totalAssignedStudents: number
    overallSubmissionRate: number
    pendingReviewsCount: number
    reviewedSubmissionsCount: number
    overallReviewRate: number
    averageScore: number | null
  }
  filterOptions: {
    academicTerms: Array<{ id: string; name: string; status: string }>
    classGroups: Array<{ id: string; name: string; course: { name: string; subject: string } }>
    teachers: Array<{ id: string; name: string }>
  }
  assignments: HomeworkAssignmentItem[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String(payload.error)
      : `加载失败（${res.status}）`
    throw new Error(message)
  }
  return payload
}

export function HomeworkClient() {
  const { division } = useDivision()

  // 状态筛选
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [termFilter, setTermFilter] = useState<string>('')
  const [groupFilter, setGroupFilter] = useState<string>('')
  const [teacherFilter, setTeacherFilter] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState<string>('')

  // 抽屉详情
  const [selectedAssignment, setSelectedAssignment] = useState<HomeworkAssignmentItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rosterTab, setRosterTab] = useState<'submissions' | 'missing'>('submissions')
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('ALL')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 构造查询参数
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (division) params.set('division', division)
    if (termFilter) params.set('termId', termFilter)
    if (groupFilter) params.set('groupId', groupFilter)
    if (teacherFilter) params.set('teacherId', teacherFilter)
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (searchKeyword.trim()) params.set('search', searchKeyword.trim())
    return params.toString()
  }, [division, termFilter, groupFilter, teacherFilter, statusFilter, searchKeyword])

  const { data, error, isLoading, mutate } = useSWR<HomeworkApiResponse>(
    `/api/admin/homework?${queryString}`,
    fetcher
  )

  const kpi = data?.kpi || {
    totalAssignments: 0,
    totalSubmissionsCount: 0,
    totalAssignedStudents: 0,
    overallSubmissionRate: 0,
    pendingReviewsCount: 0,
    reviewedSubmissionsCount: 0,
    overallReviewRate: 0,
    averageScore: null,
  }

  const assignments = data?.assignments || []
  const filterOptions = data?.filterOptions || {
    academicTerms: [],
    classGroups: [],
    teachers: [],
  }

  // 处理删除作业
  const handleDeleteAssignment = async (id: string) => {
    try {
      setDeletingId(id)
      const res = await fetch(`/api/admin/homework/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error || '删除作业失败')
      }
      toast.success('作业记录已成功删除')
      if (selectedAssignment?.id === id) {
        setDrawerOpen(false)
        setSelectedAssignment(null)
      }
      mutate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  // 抽屉内已提交名单过滤
  const filteredSubmissions = useMemo(() => {
    if (!selectedAssignment) return []
    const list = selectedAssignment.submissions || []
    if (submissionFilter === 'PENDING') {
      return list.filter((s) => s.status === 'SUBMITTED')
    }
    if (submissionFilter === 'REVIEWED') {
      return list.filter((s) => s.status === 'REVIEWED')
    }
    return list
  }, [selectedAssignment, submissionFilter])

  return (
    <div className={styles.container}>
      {/* 顶部 2x2 质检大盘 KPI */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: 累计布置作业 */}
        <div className={styles.kpiCard}>
          <div>
            <div className={styles.kpiLabel}>累计布置作业</div>
            <div className={styles.kpiValue} style={{ color: '#14574D' }}>
              {kpi.totalAssignments}
              <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 3 }}>份</span>
            </div>
            <div className={styles.kpiSub}>覆盖 {kpi.totalAssignedStudents} 名在读学员</div>
          </div>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(20, 87, 77, 0.08)', color: '#14574D' }}>
            <BookOutlined />
          </div>
        </div>

        {/* KPI 2: 学生作业提交率 */}
        <div className={styles.kpiCard}>
          <div>
            <div className={styles.kpiLabel}>学生提交总数</div>
            <div className={styles.kpiValue} style={{ color: '#2563EB' }}>
              {kpi.totalSubmissionsCount}
              <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 3 }}>份</span>
            </div>
            <div className={styles.kpiSub}>全校总体提交率 {kpi.overallSubmissionRate}%</div>
          </div>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB' }}>
            <FileTextOutlined />
          </div>
        </div>

        {/* KPI 3: 待教师批阅 */}
        <div className={styles.kpiCard}>
          <div>
            <div className={styles.kpiLabel}>待教师批阅</div>
            <div className={styles.kpiValue} style={{ color: kpi.pendingReviewsCount > 0 ? '#D97706' : '#14574D' }}>
              {kpi.pendingReviewsCount}
              <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 3 }}>份</span>
            </div>
            <div className={styles.kpiSub}>已评 {kpi.reviewedSubmissionsCount} 份 (批改率 {kpi.overallReviewRate}%)</div>
          </div>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(217, 119, 6, 0.08)', color: '#D97706' }}>
            <ClockCircleOutlined />
          </div>
        </div>

        {/* KPI 4: 平均批阅得分 */}
        <div className={styles.kpiCard}>
          <div>
            <div className={styles.kpiLabel}>平均批改得分</div>
            <div className={styles.kpiValue} style={{ color: '#D6B45B' }}>
              {kpi.averageScore !== null ? `${kpi.averageScore}` : '暂无'}
              {kpi.averageScore !== null && <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 3 }}>分</span>}
            </div>
            <div className={styles.kpiSub}>基于授课教师实评分数质检</div>
          </div>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(214, 180, 91, 0.12)', color: '#B45309' }}>
            <TrophyOutlined />
          </div>
        </div>
      </div>

      {/* 筛选与操作工具栏 */}
      <div className={styles.toolbarCard}>
        <div className={styles.toolbarRow}>
          {/* 状态分类切换 */}
          <Segmented
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as string)}
            options={[
              { label: '全部作业', value: 'ALL' },
              {
                label: (
                  <Space direction="horizontal" size={4}>
                    <span>待教师批阅</span>
                    {kpi.pendingReviewsCount > 0 && (
                      <Badge
                        count={kpi.pendingReviewsCount}
                        overflowCount={99}
                        style={{ backgroundColor: '#D97706', fontSize: 10 }}
                      />
                    )}
                  </Space>
                ),
                value: 'PENDING_REVIEW',
              },
              { label: '全部已评', value: 'REVIEWED' },
              { label: '已过截止日', value: 'OVERDUE' },
            ]}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => mutate()}
            loading={isLoading}
            size="middle"
          >
            刷新数据
          </Button>
        </div>

        {/* 多维下拉筛选 */}
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="按运营批次/学期筛选"
              value={termFilter || undefined}
              onChange={(val) => setTermFilter(val || '')}
              style={{ width: '100%' }}
              options={filterOptions.academicTerms.map((t) => ({
                label: t.name,
                value: t.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="按班级筛选"
              value={groupFilter || undefined}
              onChange={(val) => setGroupFilter(val || '')}
              style={{ width: '100%' }}
              options={filterOptions.classGroups.map((g) => ({
                label: `${g.name} (${g.course?.subject || '科目'})`,
                value: g.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="按授课教师筛选"
              value={teacherFilter || undefined}
              onChange={(val) => setTeacherFilter(val || '')}
              style={{ width: '100%' }}
              options={filterOptions.teachers.map((tc) => ({
                label: tc.name,
                value: tc.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
              placeholder="搜索作业、班级或教师"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {/* 作业列表展示 */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="正在加载作业监管数据..." />
        </div>
      ) : error ? (
        <Card style={{ textAlign: 'center', borderColor: '#FCA5A5' }}>
          <Text type="danger">加载作业数据出错：{error.message || '网络异常'}</Text>
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => mutate()} size="small">重试</Button>
          </div>
        </Card>
      ) : assignments.length === 0 ? (
        <Card style={{ borderRadius: 14 }}>
          <GuidedEmpty
            icon={<FileTextOutlined style={{ fontSize: 44, color: '#9CA3AF' }} />}
            title="暂无作业记录"
            description="教师端布置课后作业后，管理端将自动同步班级作业、提交与批改进度"
          />
        </Card>
      ) : (
        <div className={styles.assignmentGrid}>
          {assignments.map((assignment) => {
            const { stats } = assignment
            const isFinishedReview = stats.submittedCount > 0 && stats.pendingReviewCount === 0

            return (
              <div key={assignment.id} className={styles.assignmentCard}>
                <div>
                  {/* 卡片头部 */}
                  <div className={styles.assignmentHeader}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <Tag color="#14574D" style={{ margin: 0, fontWeight: 600 }}>
                          {assignment.group.subject || '全科'}
                        </Tag>
                        {assignment.term && (
                          <Tag style={{ margin: 0, background: '#FAF6EE', borderColor: '#D6B45B', color: '#8F6B12' }}>
                            {assignment.term.name}
                          </Tag>
                        )}
                      </div>
                      <div className={styles.assignmentTitle}>{assignment.title}</div>
                    </div>

                    {/* 状态徽标 */}
                    <div>
                      {stats.pendingReviewCount > 0 ? (
                        <Tag color="orange" style={{ margin: 0 }}>
                          <ClockCircleOutlined /> 待批阅 {stats.pendingReviewCount}
                        </Tag>
                      ) : isFinishedReview ? (
                        <Tag color="success" style={{ margin: 0 }}>
                          <CheckCircleOutlined /> 已全评
                        </Tag>
                      ) : stats.submittedCount === 0 ? (
                        <Tag color="default" style={{ margin: 0 }}>
                          未交
                        </Tag>
                      ) : null}
                    </div>
                  </div>

                  {/* 班级与教师元信息 */}
                  <div className={styles.assignmentMetaRow}>
                    <span>
                      <TeamOutlined style={{ marginRight: 4, color: '#14574D' }} />
                      {assignment.group.name}
                    </span>
                    <span>•</span>
                    <span>
                      <UserOutlined style={{ marginRight: 4, color: '#14574D' }} />
                      {assignment.teacher.name}
                    </span>
                    <span>•</span>
                    <span>
                      截止: {format(new Date(assignment.dueAt), 'MM-dd HH:mm', { locale: zhCN })}
                      {stats.isOverdue && <span style={{ color: '#EF4444', marginLeft: 4 }}>(已截止)</span>}
                    </span>
                  </div>

                  {/* 作业要求说明 */}
                  {assignment.instructions && (
                    <div className={styles.instructionsBox} title={assignment.instructions}>
                      {assignment.instructions}
                    </div>
                  )}

                  {/* 提交与批改进度条 */}
                  <div className={styles.progressSection}>
                    <div className={styles.progressItem}>
                      <span style={{ color: '#5A4E3A' }}>
                        学员提交进度：
                        <strong style={{ color: '#14574D' }}>
                          {stats.submittedCount} / {stats.totalStudents} 人
                        </strong>
                      </span>
                      <span style={{ fontWeight: 700, color: '#14574D' }}>{stats.submissionRate}%</span>
                    </div>
                    <Progress
                      percent={stats.submissionRate}
                      size="small"
                      strokeColor="#14574D"
                      trailColor="#EBE6DE"
                      showInfo={false}
                    />

                    <div className={styles.progressItem} style={{ marginTop: 4 }}>
                      <span style={{ color: '#5A4E3A' }}>
                        教师批阅履约：
                        <strong style={{ color: '#D97706' }}>
                          {stats.reviewedCount} / {stats.submittedCount} 份
                        </strong>
                      </span>
                      <span style={{ fontWeight: 700, color: '#D97706' }}>
                        {stats.submittedCount > 0 ? `${stats.reviewRate}%` : '0%'}
                      </span>
                    </div>
                    <Progress
                      percent={stats.reviewRate}
                      size="small"
                      strokeColor="#D6B45B"
                      trailColor="#EBE6DE"
                      showInfo={false}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#756A58', marginTop: 2 }}>
                      <span>未交学员：{assignment.missingStudents.length} 人</span>
                      <span>
                        批改均分：
                        <strong style={{ color: stats.avgScore !== null ? '#14574D' : '#9CA3AF' }}>
                          {stats.avgScore !== null ? `${stats.avgScore} 分` : '暂无'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 卡片底部操作按钮 */}
                <div className={styles.assignmentActions}>
                  <Popconfirm
                    title="确定删除此作业？"
                    description="删除后将一并清理学生已提交的作业记录及批改评分，不可恢复。"
                    onConfirm={() => handleDeleteAssignment(assignment.id)}
                    okText="确认删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true, loading: deletingId === assignment.id }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                    >
                      删除
                    </Button>
                  </Popconfirm>

                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    size="small"
                    style={{
                      backgroundColor: '#14574D',
                      borderColor: '#14574D',
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                    onClick={() => {
                      setSelectedAssignment(assignment)
                      setDrawerOpen(true)
                      setRosterTab('submissions')
                      setSubmissionFilter('ALL')
                    }}
                  >
                    查看提交名册 ({stats.submittedCount})
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 作业提交与批阅抽屉 */}
      <Drawer
        title={
          selectedAssignment ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Tag color="#14574D">{selectedAssignment.group.subject}</Tag>
                <span style={{ fontSize: 16, fontWeight: 750, color: '#1A1201' }}>
                  {selectedAssignment.title}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#756A58', fontWeight: 'normal', marginTop: 4 }}>
                班级：{selectedAssignment.group.name} ｜ 授课教师：{selectedAssignment.teacher.name} ｜ 截止：
                {format(new Date(selectedAssignment.dueAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </div>
            </div>
          ) : (
            '作业提交与批阅详情'
          )
        }
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        {selectedAssignment && (
          <div>
            {/* 抽屉顶部二级 Tab：已提交名单 VS 未交名单 */}
            <Tabs
              activeKey={rosterTab}
              onChange={(key) => setRosterTab(key as 'submissions' | 'missing')}
              items={[
                {
                  key: 'submissions',
                  label: (
                    <span>
                      已提交作业 ({selectedAssignment.submissions.length})
                    </span>
                  ),
                  children: (
                    <div>
                      {/* 筛选已评 / 待评 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Segmented
                          size="small"
                          value={submissionFilter}
                          onChange={(val) => setSubmissionFilter(val as 'ALL' | 'PENDING' | 'REVIEWED')}
                          options={[
                            { label: `全部 (${selectedAssignment.submissions.length})`, value: 'ALL' },
                            {
                              label: `待教师批阅 (${selectedAssignment.stats.pendingReviewCount})`,
                              value: 'PENDING',
                            },
                            {
                              label: `已批改评分 (${selectedAssignment.stats.reviewedCount})`,
                              value: 'REVIEWED',
                            },
                          ]}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          实评均分：
                          <strong style={{ color: '#14574D' }}>
                            {selectedAssignment.stats.avgScore !== null ? `${selectedAssignment.stats.avgScore}分` : '暂无'}
                          </strong>
                        </Text>
                      </div>

                      {filteredSubmissions.length === 0 ? (
                        <Empty
                          description="暂无符合条件的提交记录"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ) : (
                        filteredSubmissions.map((sub) => {
                          const isReviewed = sub.status === 'REVIEWED'

                          return (
                            <div
                              key={sub.id}
                              className={`${styles.submissionCard} ${isReviewed ? styles.submissionCardReviewed : ''}`}
                            >
                              {/* 提交头部 */}
                              <div className={styles.submissionHeader}>
                                <div className={styles.studentBadge}>
                                  <span className={styles.studentName}>{sub.studentName}</span>
                                  {sub.grade && <Tag style={{ margin: 0 }}>{sub.grade}</Tag>}
                                  {isReviewed ? (
                                    <Tag color="success" icon={<CheckCircleOutlined />}>已批阅</Tag>
                                  ) : (
                                    <Tag color="warning" icon={<ClockCircleOutlined />}>待批阅</Tag>
                                  )}
                                </div>

                                <div style={{ fontSize: 12, color: '#756A58' }}>
                                  提交时间：{format(new Date(sub.submittedAt), 'MM-dd HH:mm', { locale: zhCN })}
                                </div>
                              </div>

                              {/* 家长与联系方式 */}
                              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>提交人：{sub.parentName}</span>
                                {sub.parentPhone && (
                                  <span>
                                    <PhoneOutlined style={{ marginRight: 2 }} />
                                    {sub.parentPhone}
                                  </span>
                                )}
                              </div>

                              {/* 提交文字内容 */}
                              {sub.content && (
                                <div className={styles.submissionBody}>
                                  {sub.content}
                                </div>
                              )}

                              {/* 作业图片画廊 */}
                              {sub.attachmentUrls && sub.attachmentUrls.length > 0 && (
                                <div style={{ marginTop: 8, marginBottom: 8 }}>
                                  <div style={{ fontSize: 12, color: '#5A4E3A', marginBottom: 6, fontWeight: 600 }}>
                                    <PictureOutlined style={{ marginRight: 4 }} />
                                    作业图片附件 ({sub.attachmentUrls.length} 张)：
                                  </div>
                                  <Image.PreviewGroup>
                                    <Space direction="horizontal" size={8} wrap>
                                      {sub.attachmentUrls.map((url, idx) => (
                                        <Image
                                          key={idx}
                                          src={url}
                                          alt={`作业附件-${idx + 1}`}
                                          width={76}
                                          height={76}
                                          style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }}
                                        />
                                      ))}
                                    </Space>
                                  </Image.PreviewGroup>
                                </div>
                              )}

                              {/* 教师批阅卡片 */}
                              {isReviewed ? (
                                <div className={styles.reviewSection}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#14574D' }}>
                                      👨‍🏫 授课教师评阅意见
                                    </span>
                                    <span className={styles.reviewScore}>
                                      {sub.score !== null ? `${sub.score} 分` : '已阅未赋分'}
                                    </span>
                                  </div>
                                  <div className={styles.reviewComment}>
                                    {sub.teacherComment || '教师未留下评语'}
                                  </div>
                                  {sub.reviewedAt && (
                                    <div style={{ fontSize: 11, color: '#889B93', marginTop: 4 }}>
                                      批阅于 {format(new Date(sub.reviewedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{
                                  background: '#FFFBEB',
                                  border: '1px dashed #FCD34D',
                                  borderRadius: 8,
                                  padding: '8px 12px',
                                  fontSize: 12,
                                  color: '#92400E',
                                  marginTop: 8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}>
                                  <ExclamationCircleOutlined />
                                  <span>教师端尚未完成该份作业的批阅打分，请提醒授课教师及时批改。</span>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  ),
                },
                {
                  key: 'missing',
                  label: (
                    <span>
                      未交名单 ({selectedAssignment.missingStudents.length})
                    </span>
                  ),
                  children: (
                    <div>
                      {selectedAssignment.missingStudents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <CheckCircleOutlined style={{ fontSize: 36, color: '#10B981', marginBottom: 12 }} />
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#065F46' }}>
                            全员已提交作业！
                          </div>
                          <div style={{ fontSize: 12, color: '#6EE7B7', marginTop: 4 }}>
                            本班学员已全部完成作业上传，教学履约达标。
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            borderRadius: 10,
                            padding: '10px 14px',
                            marginBottom: 14,
                            fontSize: 12.5,
                            color: '#991B1B'
                          }}>
                            <strong>催交提示：</strong>
                            以下 {selectedAssignment.missingStudents.length} 位学员尚未在家长端提交作业。管理端教务人员可协同班主任或授课教师进行定向跟进。
                          </div>

                          <Row gutter={[10, 10]}>
                            {selectedAssignment.missingStudents.map((st) => (
                              <Col xs={24} sm={12} key={st.id}>
                                <div style={{
                                  background: '#ffffff',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: 10,
                                  padding: '12px 14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}>
                                  <div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
                                      {st.name}
                                    </span>
                                    {st.grade && (
                                      <Tag style={{ marginLeft: 6 }}>{st.grade}</Tag>
                                    )}
                                  </div>
                                  <Tag color="error">未提交</Tag>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}
