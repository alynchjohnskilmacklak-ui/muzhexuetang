'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Input,
  Pagination,
  Radio,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  EditOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'

const { Title, Text, Paragraph } = Typography

type ReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'
type ReviewItem = {
  id: string
  feedbackId: string
  satisfied: boolean
  reason: string | null
  createdAt: string
  reviewStatus: ReviewStatus
  reviewNote: string | null
  reviewedAt: string | null
  reviewedBy: { id: string; name: string } | null
  parent: { id: string; name: string }
  teacher: { id: string; name: string }
  studentNames: string[]
  courseName: string | null
  className: string | null
  subject: string
  lessonDate: string
  lessonStartTime: string | null
}
type ReviewList = {
  items: ReviewItem[]
  total: number
  page: number
  pageSize: number
  statusCounts: Record<ReviewStatus, number>
}

const fetcher = async (url: string): Promise<ReviewList> => {
  const response = await fetch(url, { cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '家长评价加载失败')
  return payload
}

function statusLabel(status: ReviewStatus, satisfied: boolean) {
  if (status === 'PENDING') return satisfied ? '待记录奖励' : '待跟进'
  if (status === 'IN_PROGRESS') return satisfied ? '奖励评估中' : '跟进中'
  return satisfied ? '奖励已记录' : '已跟进'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ParentFeedbackReviewsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const requestedEvaluationId = searchParams.get('evaluationId') || ''
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ReviewItem | null>(null)
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('PENDING')
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const params = new URLSearchParams({
    division,
    status: requestedEvaluationId ? 'ALL' : statusFilter,
    rating: ratingFilter,
    page: String(page),
  })
  if (requestedEvaluationId) params.set('evaluationId', requestedEvaluationId)

  const { data, error, isLoading, mutate } = useSWR<ReviewList>(
    `/api/admin/parent-feedback-reviews?${params.toString()}`,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )

  useEffect(() => {
    if (!requestedEvaluationId || !data?.items) return
    const requested = data.items.find((item) => item.id === requestedEvaluationId)
    if (requested) setSelected(requested)
  }, [data, requestedEvaluationId])

  useEffect(() => {
    if (!selected) return
    setReviewStatus(selected.reviewStatus)
    setReviewNote(selected.reviewNote || '')
  }, [selected])

  const closeDetail = () => {
    setSelected(null)
    if (requestedEvaluationId) router.replace('/parent-feedback-reviews', { scroll: false })
  }

  const saveFollowup = async () => {
    if (!selected) return
    if (reviewStatus === 'RESOLVED' && reviewNote.trim().length < 5) {
      message.error('标记已完成前，请至少记录 5 个字的处理结果')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(
        `/api/admin/parent-feedback-reviews/${encodeURIComponent(selected.id)}?division=${encodeURIComponent(division)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewStatus, reviewNote }),
        },
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '保存跟进记录失败')
      const updated = payload.item as Pick<
        ReviewItem,
        'id' | 'reviewStatus' | 'reviewNote' | 'reviewedAt' | 'reviewedBy'
      >
      setSelected((current) => (current ? { ...current, ...updated } : current))
      await mutate()
      message.success('跟进状态已保存')
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : '保存跟进记录失败')
    } finally {
      setSaving(false)
    }
  }

  const statusCounts = data?.statusCounts || { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 }
  const selectedRating = selected?.satisfied ? '满意' : '不满意'

  return (
    <PageLayout
      title="家长教学评价"
      subtitle="家长提交的教学评价与跟进台账，支持记录跟进沟通与奖励评估"
      actions={
        <Button icon={<ReloadOutlined />} onClick={() => void mutate()} loading={isLoading}>
          刷新
        </Button>
      }
    >
      <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', paddingBottom: 24 }}>
        {/* 3 KPI Overview Cards: Equal 3 Columns on both Mobile and Desktop */}
        <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
          <Col xs={8} sm={8}>
            <Card
              className="pressable"
              bordered={false}
              style={{
                borderRadius: 12,
                border: statusFilter === 'PENDING' ? '2px solid #E8784A' : '1px solid #EEE7E1',
                background: '#FFF9F5',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px' } }}
              onClick={() => {
                setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')
                setPage(1)
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#8D806F',
                }}
              >
                <AlertOutlined style={{ color: '#E8784A', fontSize: 13 }} />
                <span>待跟进</span>
              </div>
              <div
                style={{
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: 800,
                  color: '#E8784A',
                  marginTop: 2,
                }}
              >
                {statusCounts.PENDING}
              </div>
            </Card>
          </Col>

          <Col xs={8} sm={8}>
            <Card
              className="pressable"
              bordered={false}
              style={{
                borderRadius: 12,
                border: statusFilter === 'IN_PROGRESS' ? '2px solid #2563EB' : '1px solid #EEE7E1',
                background: '#EFF6FF',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px' } }}
              onClick={() => {
                setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')
                setPage(1)
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#8D806F',
                }}
              >
                <ClockCircleOutlined style={{ color: '#2563EB', fontSize: 13 }} />
                <span>处理中</span>
              </div>
              <div
                style={{
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: 800,
                  color: '#2563EB',
                  marginTop: 2,
                }}
              >
                {statusCounts.IN_PROGRESS}
              </div>
            </Card>
          </Col>

          <Col xs={8} sm={8}>
            <Card
              className="pressable"
              bordered={false}
              style={{
                borderRadius: 12,
                border: statusFilter === 'RESOLVED' ? '2px solid #27A644' : '1px solid #EEE7E1',
                background: '#F0FDF4',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px' } }}
              onClick={() => {
                setStatusFilter(statusFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED')
                setPage(1)
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#8D806F',
                }}
              >
                <CheckCircleOutlined style={{ color: '#27A644', fontSize: 13 }} />
                <span>已完成</span>
              </div>
              <div
                style={{
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: 800,
                  color: '#27A644',
                  marginTop: 2,
                }}
              >
                {statusCounts.RESOLVED}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Filter Controls: Non-truncating concise Segmented */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: '1px solid #EEE7E1', marginBottom: 14 }}
          styles={{ body: { padding: isMobile ? '10px 10px' : '12px 14px' } }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 10,
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between',
            }}
          >
            <Segmented
              aria-label="跟进状态筛选"
              size="middle"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(String(value))
                setPage(1)
              }}
              block={isMobile}
              options={[
                { value: 'PENDING', label: '待跟进' },
                { value: 'IN_PROGRESS', label: '处理中' },
                { value: 'RESOLVED', label: '已完成' },
                { value: 'ALL', label: '全部状态' },
              ]}
            />

            <Segmented
              aria-label="评价结果筛选"
              size="middle"
              value={ratingFilter}
              onChange={(value) => {
                setRatingFilter(String(value))
                setPage(1)
              }}
              block={isMobile}
              options={[
                { value: 'ALL', label: '全部' },
                { value: 'UNSATISFIED', label: '不满意' },
                { value: 'SATISFIED', label: '满意' },
              ]}
            />
          </div>
        </Card>

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 36,
              marginBottom: 12,
            }}
          >
            <Text type="secondary">
              {data ? '刷新失败，当前显示上次结果' : '评价暂时无法加载'}
            </Text>
            <Button
              type="link"
              size="small"
              onClick={() => void mutate()}
              loading={isLoading}
              style={{ paddingInline: 4 }}
            >
              重试
            </Button>
          </div>
        )}

        {isLoading && !data && !error ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : null}

        {!isLoading && !error && data?.items.length === 0 && (
          <Card style={{ borderRadius: 14, border: '1px solid #EEE7E1' }}>
            <Empty
              description={
                statusFilter === 'PENDING' && ratingFilter !== 'SATISFIED'
                  ? '目前没有待跟进评价'
                  : '暂无符合条件的家长评价'
              }
            />
          </Card>
        )}

        {/* Evaluation Card List */}
        <div style={{ display: 'grid', gap: 12 }}>
          {data?.items.map((item) => {
            // Deduplicate course and class names if identical
            const courseDetails = [
              item.courseName && item.className && item.courseName === item.className
                ? item.courseName
                : [item.courseName, item.className].filter(Boolean).join(' · '),
              item.subject,
              item.parent.name ? `家长：${item.parent.name}` : null,
            ]
              .filter(Boolean)
              .join(' · ')

            return (
              <Card
                key={item.id}
                style={{
                  borderRadius: 14,
                  border: '1px solid #EEE7E1',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
                styles={{ body: { padding: isMobile ? 12 : 16 } }}
              >
                {/* Header row: tags, teacher, student, time */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Space size={8}>
                    <Avatar
                      icon={<UserOutlined />}
                      size={isMobile ? 36 : 40}
                      style={{
                        backgroundColor: item.satisfied ? '#E8F5E9' : '#FFF3E0',
                        color: item.satisfied ? '#2E7D32' : '#E65100',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1F2329' }}>
                        {item.teacher.name} · {item.studentNames.join('、') || '学员'}
                      </div>
                      <div style={{ fontSize: 12, color: '#8D806F', marginTop: 1 }}>
                        {formatDate(item.createdAt)}
                      </div>
                    </div>
                  </Space>

                  <Space size={4}>
                    <Tag
                      color={item.satisfied ? 'success' : 'error'}
                      style={{ borderRadius: 6, margin: 0, fontWeight: 600 }}
                    >
                      {item.satisfied ? '满意' : '不满意'}
                    </Tag>
                    <Tag
                      color={
                        item.reviewStatus === 'RESOLVED'
                          ? 'success'
                          : item.reviewStatus === 'IN_PROGRESS'
                            ? 'processing'
                            : 'warning'
                      }
                      style={{ borderRadius: 6, margin: 0 }}
                    >
                      {statusLabel(item.reviewStatus, item.satisfied)}
                    </Tag>
                  </Space>
                </div>

                {/* Course & parent context */}
                {courseDetails && (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#8D806F',
                      marginBottom: 10,
                      paddingLeft: isMobile ? 0 : 48,
                    }}
                  >
                    {courseDetails}
                  </div>
                )}

                {/* Parent's written feedback reason box */}
                <div
                  style={{
                    marginLeft: isMobile ? 0 : 48,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: item.satisfied ? '#F6FAF7' : '#FFF9F5',
                    border: item.satisfied ? '1px solid #D1E7DD' : '1px solid #FFE4D6',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: item.satisfied ? '#2E7D32' : '#C2410C',
                      fontWeight: 600,
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CommentOutlined />
                    <span>{item.satisfied ? '家长评价反馈' : '家长具体说明'}</span>
                  </div>
                  <Paragraph
                    style={{
                      margin: 0,
                      color: '#1F2329',
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {item.reason || (item.satisfied ? '家长认可本节课教学效果。' : '未填写具体原因。')}
                  </Paragraph>
                </div>

                {/* Admin/Staff follow-up record if exists */}
                {item.reviewNote && (
                  <div
                    style={{
                      marginLeft: isMobile ? 0 : 48,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      marginBottom: 10,
                      fontSize: 13,
                      color: '#0369A1',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>跟进记录：</span>
                    {item.reviewNote}
                  </div>
                )}

                {/* Action button */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 6,
                  }}
                >
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => setSelected(item)}
                    style={{
                      borderRadius: 8,
                      background: 'var(--color-primary, #14574D)',
                      borderColor: 'var(--color-primary, #14574D)',
                      height: 36,
                      fontSize: 14,
                    }}
                  >
                    查看并跟进
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        {!!data?.total && !requestedEvaluationId && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <Pagination
              current={page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Follow-up Drawer */}
      <Drawer
        open={Boolean(selected)}
        onClose={closeDetail}
        title={selected ? `${selectedRating}评价 · ${selected.teacher.name}` : '家长教学评价'}
        width={isMobile ? '100%' : 540}
        destroyOnClose
      >
        {selected && (
          <div style={{ display: 'grid', gap: 16 }}>
            <Space wrap>
              <Tag color={selected.satisfied ? 'success' : 'error'}>{selectedRating}</Tag>
              <Text type="secondary">
                {formatDate(selected.lessonDate)}
                {selected.lessonStartTime ? ` · ${selected.lessonStartTime}` : ''}
              </Text>
            </Space>

            <Card size="small" style={{ borderRadius: 10, background: '#FAF8F5' }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                课堂基本信息
              </Text>
              <Paragraph style={{ margin: '0 0 4px', fontSize: 13 }}>
                {[
                  selected.teacher.name,
                  selected.studentNames.join('、') || '学员信息不可用',
                  selected.courseName,
                  selected.className,
                  selected.subject,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                家长姓名：{selected.parent.name}
              </Text>
            </Card>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                {selected.satisfied ? '家长认可' : '家长具体说明'}
              </Text>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: selected.satisfied ? '#F6FAF7' : '#FFF9F5',
                  border: selected.satisfied ? '1px solid #D1E7DD' : '1px solid #FFE4D6',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {selected.reason || '家长认可本节课的教学内容。'}
              </div>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                管理跟进处理
              </Text>
              <Radio.Group
                aria-label="管理跟进状态"
                size="middle"
                value={reviewStatus}
                onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}
                optionType="button"
                buttonStyle="solid"
                style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 10 }}
                options={[
                  { value: 'PENDING', label: selected.satisfied ? '待记录奖励' : '待跟进' },
                  { value: 'IN_PROGRESS', label: selected.satisfied ? '奖励评估中' : '跟进中' },
                  { value: 'RESOLVED', label: selected.satisfied ? '奖励已记录' : '已跟进' },
                ]}
              />
              <Input.TextArea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder={
                  selected.satisfied
                    ? '记录奖励评估或表扬处理情况...'
                    : '记录与家长沟通结果、教学改进方案或后续复查情况...'
                }
                maxLength={1000}
                showCount
                rows={4}
                style={{ borderRadius: 8 }}
              />
              {selected.reviewedBy && selected.reviewedAt && (
                <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                  最近更新：{selected.reviewedBy.name} · {formatDate(selected.reviewedAt)}
                </Text>
              )}
            </div>

            <Button
              type="primary"
              loading={saving}
              onClick={() => void saveFollowup()}
              style={{
                height: 42,
                borderRadius: 8,
                background: 'var(--color-primary, #14574D)',
                borderColor: 'var(--color-primary, #14574D)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              保存跟进记录
            </Button>
          </div>
        )}
      </Drawer>
    </PageLayout>
  )
}
