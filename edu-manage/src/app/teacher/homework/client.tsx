'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Alert,
  Button,
  Card,
  Empty,
  Image,
  Input,
  InputNumber,
  Progress,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileDoneOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { PageLayout } from '@/components/Layout/PageLayout'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import styles from './homework.module.css'

const { Paragraph } = Typography

type Submission = {
  id: string
  studentId?: string
  student: { id: string; name: string }
  parent: { name: string | null }
  content: string | null
  attachmentUrls: string[]
  status: string
  score: number | null
  teacherComment: string | null
  submittedAt?: string
}

type Assignment = {
  id: string
  title: string
  instructions: string | null
  dueAt: string | null
  createdAt?: string
  studentIds?: string[]
  group: {
    id: string
    name: string
    course?: { name: string; subject?: string }
  }
  submissions: Submission[]
}

type Data = {
  groups: Array<{
    id: string
    name: string
    course: { name: string; subject?: string }
    studentCount: number
  }>
  assignments: Assignment[]
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || '加载失败')
  return d
}

// 常用快捷作业类型模板库
const HOMEWORK_TEMPLATES = [
  {
    key: 'vocab',
    label: '📖 背单词打卡',
    title: '【英语核心词汇】Unit 3 核心词汇 20 个默写与背诵',
    instructions:
      '1. 熟练背诵并默写 Unit 3 核心词汇（共 20 个）；\n2. 请家长协助报听写，听写完成后用红笔订正并拍照上传；\n3. 建议大声朗读 3 遍，注意重音与发音。',
  },
  {
    key: 'exercise',
    label: '📝 课后习题精练',
    title: '【课后巩固精练】练习册 P28-29 核心题精做',
    instructions:
      '1. 独立完成练习册第 28-29 页第 1~8 题；\n2. 大题请务必写出清晰规范的解题步骤；\n3. 完成后拍照整页上传，字迹保持工整。',
  },
  {
    key: 'correction',
    label: '🔍 错题订正复盘',
    title: '【随堂测验复盘】错题红笔订正与思路剖析',
    instructions:
      '1. 整理本节随堂测验中的错题，用红笔在错题本上完整重做；\n2. 在每题旁边用文字注明错因（如审题粗心、公式遗忘、计算马虎）；\n3. 拍照订正页上传。',
  },
  {
    key: 'preview',
    label: '🗣️ 课文朗读预习',
    title: '【课前预习打卡】新课文朗读与重点生词勾划',
    instructions:
      '1. 大声流利朗读下节课文 2 遍；\n2. 圈画文中的重点生字词并尝试查阅释义；\n3. 由家长在书页上方签字确认后拍照打卡。',
  },
]

// 快捷快捷评语库
const QUICK_COMMENTS = [
  '解题思路严谨，步骤规范，非常棒！',
  '字迹工整美观，卷面整洁，继续保持！',
  '核心概念理解透彻，做题准确率很高！',
  '整体完成度不错，个别细节注意审题！',
  '有几处小马虎已标出，请及时用红笔订正！',
]

export function TeacherHomeworkClient() {
  const { data, error, mutate, isLoading } = useSWR<Data>('/api/teacher/homework', fetcher)

  // 教师等级专属心智
  const { data: teacherData } = useSWR<{ teacher?: { name?: string; tierLevel?: string } }>(
    '/api/teacher/dashboard',
    fetcher,
    { dedupingInterval: 60_000, revalidateOnFocus: false }
  )
  const tier = resolveTier(teacherData?.teacher?.tierLevel)
  const tierTheme = TIER_THEME[tier]

  // 表单状态
  const [groupId, setGroupId] = useState('')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // 批改状态与表单缓存
  const [review, setReview] = useState<Record<string, { score: number | null; comment: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  // 当前选中班级信息
  const selectedGroup = useMemo(() => {
    return data?.groups?.find((g) => g.id === groupId)
  }, [data?.groups, groupId])

  // 统计指标计算
  const stats = useMemo(() => {
    const assignments = data?.assignments || []
    let totalSubmissions = 0
    let reviewedSubmissions = 0

    assignments.forEach((a) => {
      a.submissions?.forEach((s) => {
        totalSubmissions++
        if (s.status === 'REVIEWED') reviewedSubmissions++
      })
    })

    const pendingReviewCount = totalSubmissions - reviewedSubmissions
    const isAllReviewed = totalSubmissions > 0 && reviewedSubmissions === totalSubmissions

    return {
      totalAssignments: assignments.length,
      totalSubmissions,
      reviewedSubmissions,
      pendingReviewCount,
      isAllReviewed,
    }
  }, [data?.assignments])

  // 应用模板
  const handleApplyTemplate = (tpl: typeof HOMEWORK_TEMPLATES[number]) => {
    setActiveTemplate(tpl.key)
    setTitle(tpl.title)
    setInstructions(tpl.instructions)
    toast.success(`已应用模板：“${tpl.label}”，支持根据实际课时调整`)
  }

  // 快捷设置截止日期
  const handleQuickDue = (daysFromNow: number) => {
    const target = dayjs().add(daysFromNow, 'day').format('YYYY-MM-DD')
    setDueAt(target)
    toast.info(`已设定截止日期为 ${target} 23:59`)
  }

  // 布置作业
  const handleCreate = async () => {
    if (!groupId) {
      toast.warning('请先选择要布置作业的班级')
      return
    }
    if (title.trim().length < 2) {
      toast.warning('作业名称至少填写 2 个字符')
      return
    }

    setCreating(true)
    try {
      const r = await fetch('/api/teacher/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          title: title.trim(),
          instructions: instructions.trim() || null,
          dueAt: dueAt ? `${dueAt}T23:59:00+08:00` : null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || '布置失败')

      setTitle('')
      setInstructions('')
      setDueAt('')
      setActiveTemplate(null)
      await mutate()
      toast.success(`作业已成功布置，并自动通知 ${selectedGroup?.name || '全班'} 所有学员家长！`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '布置失败')
    } finally {
      setCreating(false)
    }
  }

  // 提交批改
  const handleSubmitReview = async (submission: Submission) => {
    const currentVal = review[submission.id] || {
      score: submission.score,
      comment: submission.teacherComment || '',
    }
    if (currentVal.score === null && !currentVal.comment.trim()) {
      toast.warning('请填写得分或批改评语后再保存')
      return
    }

    setSaving(submission.id)
    try {
      const r = await fetch(`/api/teacher/homework/${submission.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: currentVal.score,
          teacherComment: currentVal.comment.trim() || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || '保存批改失败')

      await mutate()
      toast.success(`${submission.student.name} 的作业批改已保存，家长端已收到成绩与评语通知！`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存批改失败')
    } finally {
      setSaving(null)
    }
  }

  return (
    <PageLayout
      title="普通课作业"
      subtitle="一键全员布置课后作业，实时查看家长提交，极速完成作业批阅与成长闭环"
    >
      <div className={styles.container}>
        {error && <Alert type="error" message={error.message} showIcon style={{ borderRadius: 10 }} />}

        {/* 1. 教师等级专属心智横幅 */}
        <div className={styles.tierBanner}>
          <div className={styles.tierBannerLeft}>
            <span
              className={styles.tierBadge}
              style={{
                background: tierTheme.badgeBg,
                color: tierTheme.badgeColor,
                border: tierTheme.badgeBorder,
              }}
            >
              {tierTheme.name}课后作业台
            </span>
            <span className={styles.tierTagline}>{tierTheme.roleTag}</span>
          </div>
          <Tooltip
            title={`${tierTheme.name}专属特权：支持一键向全班所有在读学员布置结构化课后作业，家长提交后即时推送提醒，批改档案自动归档计入随堂服务闭环。`}
          >
            <span className={styles.tierPrivilegeHint}>
              专属教学特权 <InfoCircleOutlined style={{ fontSize: 12 }} />
            </span>
          </Tooltip>
        </div>

        {/* 2. 核心数据指标罗盘（具备富文本 Tooltip 与 100% 达成成就微章） */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statCardHead}>
              <span>已发布作业</span>
              <Tooltip title="本人名下已向班级全员发布的课后作业总数">
                <InfoCircleOutlined className={styles.statTipIcon} />
              </Tooltip>
            </div>
            <div className={styles.statValueWrap}>
              <span className={styles.statValue}>{stats.totalAssignments}</span>
              <span className={styles.statUnit}>份</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statCardHead}>
              <span>待批改提交</span>
              <Tooltip title="家长已提交拍照作答或文字心得、等待老师审阅点评的作业数量">
                <InfoCircleOutlined className={styles.statTipIcon} />
              </Tooltip>
            </div>
            <div className={styles.statValueWrap}>
              <span className={`${styles.statValue} ${stats.pendingReviewCount > 0 ? styles.statValueOrange : ''}`}>
                {stats.pendingReviewCount}
              </span>
              <span className={styles.statUnit}>份</span>
            </div>
          </div>

          <div className={`${styles.statCard} ${stats.isAllReviewed ? styles.statCardAllDone : ''}`}>
            <div className={styles.statCardHead}>
              <span style={stats.isAllReviewed ? { color: '#15803d', fontWeight: 700 } : undefined}>
                批改达成率
              </span>
              <Tooltip title="已批阅提交 / 家长总提交数量；全员批改完成后自动形成教学质量闭环">
                <InfoCircleOutlined className={styles.statTipIcon} />
              </Tooltip>
            </div>
            <div className={styles.statValueWrap}>
              <span className={`${styles.statValue} ${styles.statValueSuccess}`}>
                {stats.reviewedSubmissions}
                <span style={{ fontSize: 13, color: '#94a3b8', margin: '0 2px' }}>/</span>
                <span style={{ fontSize: 14, color: '#64748b' }}>{stats.totalSubmissions}</span>
              </span>
              {stats.isAllReviewed && (
                <span className={styles.allDoneBadge}>
                  <CheckCircleOutlined /> 100% 达成
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. 布置新作业卡片（高质感表单 + 快捷模板 + 一键全员布置） */}
        <div className={styles.composerCard}>
          <div className={styles.composerHeader}>
            <div className={styles.composerTitle}>
              <PlusOutlined style={{ color: 'var(--color-primary, #14574d)' }} />
              <span>布置新作业</span>
            </div>
            <span className={styles.composerBadge}>
              <TeamOutlined style={{ marginRight: 4 }} />
              支持一键全班覆盖
            </span>
          </div>

          {/* 快捷推荐模板组 */}
          <div className={styles.templateSection}>
            <div className={styles.templateLabel}>
              <span>高频作业类型一键选用：</span>
              <Tooltip title="点击即可快速填充高频作业模版内容，包含背单词、课后习题、错题订正和预习等">
                <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
              </Tooltip>
            </div>
            <div className={styles.templateChipsRow}>
              {HOMEWORK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  className={`${styles.templateChip} ${activeTemplate === tpl.key ? styles.templateChipActive : ''}`}
                  onClick={() => handleApplyTemplate(tpl)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 班级选择 */}
          <div className={styles.formRow}>
            <div className={styles.formLabel}>
              <span>目标班级 *</span>
              {selectedGroup && (
                <span className={styles.classSelectExtra}>
                  ⚡ 已锁定全班 {selectedGroup.studentCount} 名在读学员全员接收
                </span>
              )}
            </div>
            <Select
              placeholder="请选择授课班级（一键全员布置）"
              value={groupId || undefined}
              onChange={(val) => {
                setGroupId(val)
              }}
              options={(data?.groups || []).map((g) => ({
                value: g.id,
                label: `${g.name} · ${g.course.name} · ${g.studentCount}人全员在读`,
              }))}
              style={{ width: '100%' }}
              size="large"
            />
          </div>

          {/* 作业名称 */}
          <div className={styles.formRow}>
            <div className={styles.formLabel}>
              <span>作业名称 *</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>支持自定义，2~120 字</span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="例如：【英语单词打卡】Unit 3 核心词汇背诵或数学错题订正"
              size="middle"
              style={{ borderRadius: 8 }}
            />
          </div>

          {/* 说明与要求 */}
          <div className={styles.formRow}>
            <div className={styles.formLabel}>
              <span>详细作业要求与提交规范（选填）</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>建议标明是否需要拍照、字数或录音</span>
            </div>
            <Input.TextArea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={4000}
              rows={4}
              showCount
              placeholder="写清要求，例如：\n1. 练习册 P20-21 拍照上传；\n2. 错题请用红笔重做并附分析；\n3. 家长签字确认。"
              style={{ borderRadius: 8, lineHeight: 1.6 }}
            />
          </div>

          {/* 截止时间与快捷胶囊 */}
          <div className={styles.formRow}>
            <div className={styles.formLabel}>
              <span>截止日期（选填）</span>
              <div className={styles.quickDateRow}>
                <button type="button" className={styles.quickDateBtn} onClick={() => handleQuickDue(1)}>
                  明天 23:59
                </button>
                <button type="button" className={styles.quickDateBtn} onClick={() => handleQuickDue(2)}>
                  后天 23:59
                </button>
                <button type="button" className={styles.quickDateBtn} onClick={() => handleQuickDue(7)}>
                  一周后
                </button>
              </div>
            </div>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              aria-label="作业截止日期"
              style={{ maxWidth: 260, borderRadius: 8 }}
            />
          </div>

          {/* 布置主按钮 */}
          <Button
            type="primary"
            loading={creating}
            disabled={!groupId || title.trim().length < 2}
            onClick={() => void handleCreate()}
            className={styles.publishBtn}
          >
            <SendOutlined />
            <span>
              {selectedGroup
                ? `一键给「${selectedGroup.name}」所有学生（${selectedGroup.studentCount}人）布置作业并通知家长`
                : '布置作业并通知班级全员家长'}
            </span>
          </Button>
        </div>

        {/* 4. 作业与批改列表（家长提交查看与极速点评） */}
        <div className={styles.assignmentListSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <FileDoneOutlined style={{ color: 'var(--color-primary, #14574d)' }} />
              <span>历史作业与提交批阅看板</span>
            </div>
            <span style={{ fontSize: 12, color: '#78716c' }}>
              共 {(data?.assignments || []).length} 份作业
            </span>
          </div>

          {isLoading && !data ? (
            <CardSkeleton rows={3} />
          ) : (data?.assignments || []).length === 0 ? (
            <Card style={{ borderRadius: 14 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无普通课作业记录，上方可直接选用背单词、做题等模板一键布置"
              />
            </Card>
          ) : (
            data!.assignments.map((assignment) => {
              const submissions = assignment.submissions || []
              const reviewedCount = submissions.filter((s) => s.status === 'REVIEWED').length
              const isAllReviewed = submissions.length > 0 && reviewedCount === submissions.length
              const totalStudentCount =
                assignment.studentIds?.length ||
                data?.groups.find((g) => g.id === assignment.group.id)?.studentCount ||
                submissions.length

              const percent = totalStudentCount > 0 ? Math.round((submissions.length / totalStudentCount) * 100) : 0

              return (
                <article
                  key={assignment.id}
                  className={`${styles.assignmentCard} ${isAllReviewed ? styles.assignmentCardAllReviewed : ''}`}
                >
                  {/* 头部信息 */}
                  <div className={cardTopRowStyle(assignment)}>
                    <div>
                      <h3 className={styles.cardTitle}>{assignment.title}</h3>
                    </div>
                    {isAllReviewed ? (
                      <span className={styles.reviewedBadge}>
                        <CheckCircleOutlined /> 批改全闭环
                      </span>
                    ) : (
                      <Tag color={submissions.length > 0 ? 'orange' : 'default'}>
                        {submissions.length > 0 ? `待批改 ${submissions.length - reviewedCount} 人` : '等待提交'}
                      </Tag>
                    )}
                  </div>

                  {/* 一体化温润通栏信息条 */}
                  <div className={styles.unifiedMetaBar}>
                    <span className={styles.groupPill}>
                      {assignment.group?.name || '班级'}
                    </span>
                    {assignment.group?.course?.name && (
                      <>
                        <div className={styles.metaDivider} />
                        <span className={styles.metaItem}>
                          <BookOutlined style={{ color: 'var(--color-primary)' }} />
                          {assignment.group.course.name}
                        </span>
                      </>
                    )}
                    <div className={styles.metaDivider} />
                    <span className={styles.metaItem}>
                      <ClockCircleOutlined />
                      {assignment.dueAt
                        ? `截止 ${dayjs(assignment.dueAt).format('M月D日')}`
                        : '无截止时限'}
                    </span>
                    <div className={styles.metaDivider} />
                    <span className={styles.metaItem}>
                      <TeamOutlined />
                      全班 <strong>{totalStudentCount}</strong> 人
                    </span>
                  </div>

                  {/* 详细说明 */}
                  {assignment.instructions && (
                    <div className={styles.instructionsBox}>
                      {assignment.instructions}
                    </div>
                  )}

                  {/* 进度追踪条 */}
                  <div className={styles.progressTrackCard}>
                    <div className={styles.progressLabelRow}>
                      <span>
                        家长提交进度：<strong>{submissions.length}</strong> / {totalStudentCount} 人已提交 ({percent}%)
                      </span>
                      <span style={{ color: '#059669', fontWeight: 600 }}>
                        已批改 {reviewedCount} / {submissions.length}
                      </span>
                    </div>
                    <Progress
                      percent={percent}
                      size="small"
                      strokeColor="var(--color-primary, #14574d)"
                      showInfo={false}
                    />
                  </div>

                  {/* 学员提交详情与极速批改台 */}
                  {submissions.length === 0 ? (
                    <div style={{ padding: '12px 14px', background: '#fafaf9', borderRadius: 8, fontSize: 12, color: '#78716c' }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      全班家长已收到作业通知，等待家长或学员拍照上传答卷…
                    </div>
                  ) : (
                    <div className={styles.submissionsGrid}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                        学员提交作答与批阅（{submissions.length} 人）：
                      </div>

                      {submissions.map((sub) => {
                        const isSubReviewed = sub.status === 'REVIEWED'
                        const reviewState = review[sub.id] || {
                          score: sub.score,
                          comment: sub.teacherComment || '',
                        }

                        return (
                          <div
                            key={sub.id}
                            className={`${styles.submissionItemCard} ${isSubReviewed ? styles.submissionItemCardReviewed : ''}`}
                          >
                            {/* 学生头与状态 */}
                            <div className={styles.subHeadRow}>
                              <div className={styles.studentMeta}>
                                <UserOutlined style={{ color: 'var(--color-primary)' }} />
                                <span className={styles.studentName}>{sub.student?.name}</span>
                                {sub.parent?.name && (
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                    ({sub.parent.name}家长提交)
                                  </span>
                                )}
                                {sub.submittedAt && (
                                  <span className={styles.submitTime}>
                                    · {dayjs(sub.submittedAt).format('M月D日 HH:mm')}
                                  </span>
                                )}
                              </div>
                              {isSubReviewed ? (
                                <Tag color="green">
                                  <CheckCircleOutlined /> 已批改 · {sub.score !== null ? `${sub.score}分` : '已阅'}
                                </Tag>
                              ) : (
                                <Tag color="gold">
                                  <EditOutlined /> 待批改
                                </Tag>
                              )}
                            </div>

                            {/* 家长/学员提交的文字心得或解答 */}
                            {sub.content && (
                              <div className={styles.submissionContent}>
                                <Paragraph style={{ margin: 0 }}>{sub.content}</Paragraph>
                              </div>
                            )}

                            {/* 提交的照片附件（支持点击大图预览与旋转缩放） */}
                            {Boolean(sub.attachmentUrls && sub.attachmentUrls.length > 0) && (
                              <div className={styles.attachmentPhotoGrid}>
                                <Image.PreviewGroup>
                                  {sub.attachmentUrls.map((url, imgIdx) => (
                                    <div key={url || imgIdx} className={styles.photoThumb}>
                                      <Image
                                        src={url}
                                        alt={`${sub.student?.name} 作业照片`}
                                        width={76}
                                        height={76}
                                        style={{ objectFit: 'cover' }}
                                      />
                                    </div>
                                  ))}
                                </Image.PreviewGroup>
                              </div>
                            )}

                            {/* 极速批改台 */}
                            <div className={styles.reviewDock}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#44403c' }}>
                                  {isSubReviewed ? '批改意见与评定（已闭环，支持修改）：' : '批改与点评：'}
                                </span>
                                {/* 快捷分值胶囊 */}
                                <div className={styles.quickScoreRow}>
                                  {[
                                    { label: '💯 满分', val: 100 },
                                    { label: '🌟 95分', val: 95 },
                                    { label: '✨ 85分', val: 85 },
                                    { label: '📝 75分', val: 75 },
                                  ].map((btn) => (
                                    <button
                                      key={btn.val}
                                      type="button"
                                      className={styles.quickScoreBtn}
                                      onClick={() =>
                                        setReview((x) => ({
                                          ...x,
                                          [sub.id]: { ...reviewState, score: btn.val },
                                        }))
                                      }
                                    >
                                      {btn.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 快捷评语推荐 */}
                              <div className={styles.quickCommentRow}>
                                {QUICK_COMMENTS.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    className={styles.quickCommentChip}
                                    onClick={() =>
                                      setReview((x) => ({
                                        ...x,
                                        [sub.id]: {
                                          ...reviewState,
                                          comment: reviewState.comment ? `${reviewState.comment} ${c}` : c,
                                        },
                                      }))
                                    }
                                  >
                                    + {c.slice(0, 8)}…
                                  </button>
                                ))}
                              </div>

                              {/* 成绩与评语输入 */}
                              <div className={styles.reviewActionRow}>
                                <Space size={8} style={{ flex: 1 }}>
                                  <InputNumber
                                    min={0}
                                    max={100}
                                    value={reviewState.score}
                                    onChange={(val) =>
                                      setReview((x) => ({
                                        ...x,
                                        [sub.id]: { ...reviewState, score: val },
                                      }))
                                    }
                                    addonAfter="分"
                                    placeholder="得分"
                                    style={{ width: 110 }}
                                  />
                                  <Input
                                    value={reviewState.comment}
                                    onChange={(e) =>
                                      setReview((x) => ({
                                        ...x,
                                        [sub.id]: { ...reviewState, comment: e.target.value },
                                      }))
                                    }
                                    placeholder="输入针对性批阅建议或鼓励评语…"
                                    maxLength={2000}
                                    style={{ flex: 1, minWidth: 160 }}
                                  />
                                </Space>
                                <Button
                                  type="primary"
                                  loading={saving === sub.id}
                                  onClick={() => void handleSubmitReview(sub)}
                                  className={styles.saveReviewBtn}
                                >
                                  {isSubReviewed ? '更新批改' : '✓ 保存批改通知家长'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      </div>
    </PageLayout>
  )
}

function cardTopRowStyle(_a: Assignment) {
  return styles.cardTopRow
}
