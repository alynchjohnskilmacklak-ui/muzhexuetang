'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Alert, Button, Card, Empty, Image, Input, Progress, Space, Tag, Typography } from 'antd'
import { HeartOutlined, HeartFilled, MessageOutlined, EyeOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { toast } from 'sonner'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

type Paper = {
  id: string; title: string; subject: string; paperDate: string; imageUrls: string[];
  tags: string[]; overallComment?: string | null; isReadByParent: boolean;
  student: { id: string; name: string; grade?: string | null };
  teacher: { id: string; name: string };
  questions: { order: number; topic: string; mastery: string; teacherNote?: string | null; pageNum?: number | null }[];
  reactions: { id: string; type: string; userId: string }[];
  comments: { id: string; content: string; isRead: boolean; createdAt: string; author: { id: string; name: string; role: string } }[];
}

const MASTERY_BADGE: Record<string, { color: string; label: string }> = {
  MASTERED: { color: '#1D9E75', label: '已掌握' },
  NEEDS_REVIEW: { color: '#f5a623', label: '需巩固' },
  NEEDS_PRACTICE: { color: '#E24B4A', label: '需重点练习' },
}

const SUBJECT_COLORS: Record<string, string> = {
  数学: '#E8784A', 英语: '#185FA5', 物理: '#7c5cff', 化学: '#1D9E75', 语文: '#D4537E',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ExamClient({ papers: initialPapers, feedbacks = [], parentId }: { papers: Paper[]; feedbacks?: any[]; parentId: string }) {
  const isMobile = useIsMobile() ?? false
  const { data } = useSWR('/api/exam-papers?mine=true', fetcher, {
    fallbackData: { papers: initialPapers },
    refreshInterval: 30_000,
  })
  const papers: Paper[] = Array.isArray(data?.papers) ? data.papers : initialPapers
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentingId, setCommentingId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const allQ = papers.flatMap((p) => p.questions)
    const mastered = allQ.filter((q) => q.mastery === 'MASTERED').length
    const needsPractice = allQ.filter((q) => q.mastery === 'NEEDS_PRACTICE').length
    return {
      totalPapers: papers.length,
      totalQuestions: allQ.length,
      masteredRate: allQ.length ? Math.round((mastered / allQ.length) * 100) : 0,
      needsPractice,
    }
  }, [papers])

  const weakTopics = useMemo(() => {
    const counts = new Map<string, number>()
    papers.forEach((p) => {
      p.questions.filter((q) => q.mastery === 'NEEDS_PRACTICE').forEach((q) => {
        counts.set(q.topic, (counts.get(q.topic) || 0) + 1)
      })
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [papers])

  const react = async (paperId: string) => {
    const res = await fetch(`/api/exam-papers/${paperId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'HEART' }),
    })
    if (res.ok) {
      // Optimistic update handled by SWR revalidation
      const data = await res.json()
      toast.success(data.reacted ? '已感谢老师' : '已取消感谢')
    }
  }

  const submitComment = async (paperId: string) => {
    if (!commentText.trim()) return toast.error('请输入留言')
    const res = await fetch(`/api/exam-papers/${paperId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText }),
    })
    if (res.ok) {
      toast.success('留言已发送')
      setCommentText('')
      setCommentingId(null)
    } else {
      toast.error('留言失败')
    }
  }

  const markRead = async (paperId: string) => {
    await fetch(`/api/exam-papers/${paperId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isReadByParent: true }),
    })
  }

  // Mark first unread paper as read when expanded
  const handleExpand = (paperId: string) => {
    const wasExpanded = expandedId === paperId
    setExpandedId(wasExpanded ? null : paperId)
    if (!wasExpanded) {
      const paper = papers.find((p) => p.id === paperId)
      if (paper && !paper.isReadByParent) {
        markRead(paperId)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero stats */}
      <Card style={{
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(232,120,74,.12), rgba(232,120,74,.04))',
        border: '1px solid rgba(232,120,74,.2)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: '已收试卷', value: stats.totalPapers, unit: '份' },
            { label: '总题目数', value: stats.totalQuestions, unit: '题' },
            { label: '已掌握率', value: `${stats.masteredRate}%`, unit: null },
            { label: '需加强', value: stats.needsPractice, unit: '题' },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? 18 : 28, fontWeight: 700, color: '#E8784A' }}>{item.value}</div>
              <div style={{ fontSize: 13, color: '#1a1201', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <Card title="待加强知识点 TOP 5" size="small" style={{ borderRadius: 12, background: '#fff', border: '0.5px solid rgba(0,0,0,.08)' }}>
          <Progress
            percent={100}
            success={{ percent: stats.masteredRate, strokeColor: '#1D9E75' }}
            strokeColor="#E24B4A"
            format={() => null}
          />
          <Space wrap style={{ marginTop: 8 }}>
            {weakTopics.map(([topic, count]) => (
              <Tag key={topic} color="red" style={{ borderRadius: 99 }}>
                {topic} ×{count}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Paper cards */}
      {feedbacks.length > 0 && (
        <Card title="课堂反馈" style={{ borderRadius: 12, background: '#fff', border: '0.5px solid rgba(0,0,0,.08)' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {feedbacks.map((item) => (
              <div key={item.id} style={{ padding: 12, borderRadius: 10, background: '#faf8f5' }}>
                <Space wrap style={{ marginBottom: 8 }}>
                  <Tag color="orange">{item.status === 'PUBLISHED' ? '已发布' : '草稿'}</Tag>
                  {item.knowledgePoints?.map((point: string) => <Tag key={point}>{point}</Tag>)}
                </Space>
                <div style={{ color: '#1a1201', whiteSpace: 'pre-wrap' }}>{item.summary || '老师上传了课堂资料'}</div>
                {Array.isArray(item.homework) && item.homework.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>课后作业：</Text>
                    {item.homework.map((hw: any) => <div key={hw.order} style={{ fontSize: 13 }}>{hw.order}. {hw.content}</div>)}
                  </div>
                )}
                {item.imageUrls?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {item.imageUrls.slice(0, 6).map((url: string) => <Image key={url} src={normalizeUploadUrl(url)} alt="课堂资料" width={96} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />)}
                  </div>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>{item.teacher?.name} · {new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {papers.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 60, background: '#fff', border: '0.5px solid rgba(0,0,0,.08)' }}>
          <Empty description="老师还没有推送试卷" />
        </Card>
      ) : (
        papers.map((paper) => {
          const isExpanded = expandedId === paper.id
          const hasReacted = paper.reactions.some((r) => r.userId === parentId)
          const subjectColor = SUBJECT_COLORS[paper.subject] || '#E8784A'

          return (
            <Card
              key={paper.id}
              style={{ borderRadius: 12, background: '#fff', border: '0.5px solid rgba(0,0,0,.08)' }}
              title={
                <Space>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${subjectColor}22`, color: subjectColor,
                    display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16,
                  }}>
                    {paper.subject[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1a1201' }}>{paper.title}</div>
                    <div style={{ fontSize: 12, color: '#9a8e7a' }}>
                      {paper.teacher.name} · {format(new Date(paper.paperDate), 'yyyy年M月d日', { locale: zhCN })}
                    </div>
                  </div>
                  {!paper.isReadByParent && <Tag color="red" style={{ borderRadius: 99 }}>新试卷</Tag>}
                </Space>
              }
            >
              {/* Tags */}
              {paper.tags.length > 0 && (
                <Space wrap size={[4, 4]} style={{ marginBottom: 12 }}>
                  {paper.tags.map((tag) => <Tag key={tag} style={{ borderRadius: 99 }}>{tag}</Tag>)}
                </Space>
              )}

              {/* Image preview */}
              {paper.imageUrls.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {paper.imageUrls.slice(0, 3).map((url, i) => (
                    <Image key={i} src={normalizeUploadUrl(url)} alt={`${paper.title} page ${i + 1}`} width={120} height={90} style={{ objectFit: 'cover', borderRadius: 8, background: '#f5f5f5' }} />
                  ))}
                  <Button icon={<EyeOutlined />} size="small" onClick={() => handleExpand(paper.id)}>
                    {isExpanded ? '收起详情' : `查看全部 (${paper.imageUrls.length}张)`}
                  </Button>
                </div>
              )}

              {/* Expanded: all images + questions */}
              {isExpanded && (
                <div style={{ marginTop: 12, padding: 16, borderRadius: 10, background: '#faf8f5' }}>
                  {paper.imageUrls.length > 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
                      {paper.imageUrls.slice(3).map((url, i) => (
                        <Image key={i} src={normalizeUploadUrl(url)} alt={`page ${i + 4}`} style={{ borderRadius: 8, objectFit: 'cover', aspectRatio: '4/3', background: '#e8e4de' }} />
                      ))}
                    </div>
                  )}

                  {/* Questions */}
                  {paper.questions.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <Text strong style={{ color: '#1a1201' }}>题目标注</Text>
                      <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 8 }}>
                        {paper.questions.map((q) => {
                          const badge = MASTERY_BADGE[q.mastery] || MASTERY_BADGE.NEEDS_REVIEW
                          return (
                            <div key={q.order} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#fff', border: '0.5px solid rgba(0,0,0,.06)' }}>
                              <span style={{ color: '#9a8e7a', fontSize: 12, minWidth: 30 }}>#{q.order}</span>
                              <span style={{ color: '#1a1201', fontWeight: 500, minWidth: 100 }}>{q.topic}</span>
                              <span style={{ color: '#5a4e3a', fontSize: 13, flex: 1 }}>{q.teacherNote}</span>
                              <Tag color={badge.color} style={{ borderRadius: 99, fontSize: 11 }}>{badge.label}</Tag>
                            </div>
                          )
                        })}
                      </Space>
                    </div>
                  )}

                  {/* Teacher comment */}
                  {paper.overallComment && (
                    <Alert
                      type="warning"
                      message="老师评语"
                      description={paper.overallComment}
                      style={{ marginBottom: 12, borderRadius: 8 }}
                    />
                  )}
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: 12 }}>
                <Button
                  icon={hasReacted ? <HeartFilled style={{ color: '#E24B4A' }} /> : <HeartOutlined />}
                  onClick={() => react(paper.id)}
                  size="small"
                  type={hasReacted ? 'primary' : 'default'}
                  style={hasReacted ? { background: 'rgba(226,75,74,.1)', borderColor: 'rgba(226,75,74,.3)', color: '#E24B4A' } : {}}
                >
                  感谢老师
                </Button>
                <Button
                  icon={<MessageOutlined />}
                  size="small"
                  onClick={() => setCommentingId(commentingId === paper.id ? null : paper.id)}
                >
                  回复老师
                </Button>
                <Button icon={<EyeOutlined />} size="small" onClick={() => handleExpand(paper.id)}>
                  查看详情
                </Button>
              </div>

              {/* Comments */}
              {paper.comments.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {paper.comments.map((c) => (
                    <div key={c.id} style={{ padding: '6px 10px', borderRadius: 6, background: '#faf8f5', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 12, color: c.author.role === 'parent' ? '#E8784A' : '#5a4e3a' }}>
                        {c.author.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#1a1201', marginLeft: 8 }}>{c.content}</Text>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {commentingId === paper.id && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <Input.TextArea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="给老师留言..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    maxLength={300}
                    showCount
                    style={{ flex: 1 }}
                  />
                  <Button type="primary" onClick={() => submitComment(paper.id)} style={{ background: '#E8784A' }}>
                    发送
                  </Button>
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
