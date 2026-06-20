'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Image, Input, Space, Tag, Typography } from 'antd'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { toast } from 'sonner'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'
import { fmtDate, fmtDateTime } from '@/lib/format-date'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'

const { Text } = Typography

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
    refreshInterval: 300_000,
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
    <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <ChildSwitcher />
      {/* 统计摘要条 */}
      {stats.totalPapers > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #E8784A 0%, #D4693A 100%)',
          borderRadius: 16, padding: isMobile ? '16px 18px' : '18px 24px',
          marginBottom: 16, marginTop: 16, color: '#fff',
        }}>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>学习档案总览</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: '试卷数', value: stats.totalPapers },
              { label: '掌握率', value: `${stats.masteredRate}%` },
              { label: '待突破', value: stats.needsPractice },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '10px 6px' }}>
                <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {weakTopics.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.2)' }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>需重点练习：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {weakTopics.map(([topic, count]) => (
                  <span key={topic} style={{ fontSize: 11, background: 'rgba(255,255,255,.2)', padding: '2px 10px', borderRadius: 9999 }}>
                    {topic} ×{count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 课堂反馈 */}
      {feedbacks.length > 0 && (
        <Card title="课堂反馈" style={{ borderRadius: 12, background: '#fff', border: '0.5px solid rgba(0,0,0,.08)', marginBottom: 16 }}>
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
                    {item.homework.map((hw: any, i: number) => <div key={i} style={{ fontSize: 13 }}>{i + 1}. {hw.content || hw.title || ''}</div>)}
                  </div>
                )}
                {item.imageUrls?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {item.imageUrls.slice(0, 6).map((url: string) => <Image key={url} src={normalizeUploadUrl(url)} alt="课堂资料" width={96} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />)}
                  </div>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>{item.teacher?.name} · {fmtDateTime(item.createdAt)}</Text>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {papers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#98A2B3' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>暂无试卷记录</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>老师批改后会在这里显示</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {papers.map(paper => {
            const isExpanded = expandedId === paper.id
            const subjectColor = SUBJECT_COLORS[paper.subject] || '#8D806F'
            const mastered = paper.questions.filter(q => q.mastery === 'MASTERED').length
            const total = paper.questions.length
            const masteredPct = total ? Math.round((mastered / total) * 100) : 0
            const hasReacted = paper.reactions.some(r => r.type === 'HEART' && r.userId === parentId)

            return (
              <div key={paper.id} style={{
                background: '#fff',
                borderRadius: 14,
                border: `1px solid ${isExpanded ? subjectColor + '40' : '#EEE7E1'}`,
                overflow: 'hidden',
                boxShadow: isExpanded ? `0 4px 20px ${subjectColor}15` : 'none',
                transition: 'all 0.2s',
              }}>
                {/* 卡片头部 */}
                <div
                  onClick={() => handleExpand(paper.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1F2329', marginBottom: 4, lineHeight: 1.3 }}>
                        {paper.title}
                        {!paper.isReadByParent && <Tag color="red" style={{ borderRadius: 9999, marginLeft: 8, fontSize: 10 }}>新</Tag>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: subjectColor, background: `${subjectColor}15`, padding: '2px 10px', borderRadius: 9999 }}>
                          {paper.subject}
                        </span>
                        <span style={{ fontSize: 11, color: '#C4BAB0' }}>
                          {paper.teacher.name}
                        </span>
                        {paper.paperDate && (
                          <span style={{ fontSize: 11, color: '#C4BAB0' }}>
                            {format(new Date(paper.paperDate), 'M月d日', { locale: zhCN })}
                          </span>
                        )}
                      </div>
                    </div>
                    {total > 0 && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: masteredPct >= 70 ? '#1D9E75' : masteredPct >= 40 ? '#E87545' : '#E24B4A', lineHeight: 1 }}>
                          {masteredPct}%
                        </div>
                        <div style={{ fontSize: 11, color: '#98A2B3' }}>掌握率</div>
                      </div>
                    )}
                  </div>

                  {/* 进度条 */}
                  {total > 0 && (
                    <div style={{ height: 6, borderRadius: 9999, background: '#F5F2EE', overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{
                        height: '100%', borderRadius: 9999, width: `${masteredPct}%`,
                        background: `linear-gradient(90deg, #1D9E75, ${masteredPct >= 70 ? '#1D9E75' : '#E87545'})`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  )}

                  {/* 知识点预览 */}
                  {paper.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {paper.tags.slice(0, 5).map(tag => (
                        <span key={tag} style={{ fontSize: 11, padding: '1px 8px', borderRadius: 9999, background: '#F5F2EE', color: '#8D806F' }}>{tag}</span>
                      ))}
                      {paper.tags.length > 5 && <span style={{ fontSize: 11, color: '#98A2B3' }}>+{paper.tags.length - 5}</span>}
                    </div>
                  )}
                </div>

                {/* 展开内容 */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F5F2EE' }}>
                    {/* 总评语 */}
                    {paper.overallComment && (
                      <div style={{ padding: '12px 16px', background: '#FFFBF6', borderLeft: '4px solid #E8784A' }}>
                        <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 4 }}>老师评语</div>
                        <div style={{ fontSize: 14, color: '#1F2329', lineHeight: 1.6 }}>{paper.overallComment}</div>
                      </div>
                    )}

                    {/* 题目掌握情况 */}
                    {paper.questions.length > 0 && (
                      <div style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                          {[
                            { count: mastered, label: '已掌握', color: '#1D9E75' },
                            { count: paper.questions.filter(q => q.mastery === 'NEEDS_REVIEW').length, label: '需巩固', color: '#f5a623' },
                            { count: paper.questions.filter(q => q.mastery === 'NEEDS_PRACTICE').length, label: '需重点练习', color: '#E24B4A' },
                          ].map(item => item.count > 0 && (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                              <span style={{ fontSize: 12, color: item.color }}>{item.label} {item.count}题</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {paper.questions.map(q => {
                            const m = MASTERY_BADGE[q.mastery] || MASTERY_BADGE.NEEDS_REVIEW
                            return (
                              <div key={q.order} style={{
                                display: 'flex', gap: 10, alignItems: 'flex-start',
                                padding: '8px 10px', borderRadius: 8,
                                background: `${m.color}08`, border: `1px solid ${m.color}20`,
                              }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: m.color, minWidth: 32, flexShrink: 0 }}>#{q.order}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2329' }}>{q.topic}</div>
                                  {q.teacherNote && (
                                    <div style={{ fontSize: 12, color: '#8D806F', marginTop: 2 }}>{q.teacherNote}</div>
                                  )}
                                </div>
                                <span style={{ fontSize: 11, color: m.color, background: `${m.color}15`, padding: '2px 8px', borderRadius: 9999, flexShrink: 0 }}>
                                  {m.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 试卷图片 */}
                    {paper.imageUrls.length > 0 && (
                      <div style={{ padding: '0 16px 12px' }}>
                        <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 8 }}>试卷原图</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Image.PreviewGroup>
                            {paper.imageUrls.map((url, i) => (
                              <Image key={i} src={normalizeUploadUrl(url)} alt={`第${i + 1}页`}
                                width={isMobile ? 80 : 100} height={isMobile ? 100 : 130}
                                style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #EEE7E1' }} />
                            ))}
                          </Image.PreviewGroup>
                        </div>
                      </div>
                    )}

                    {/* 底部操作 */}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #F5F2EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <button onClick={() => react(paper.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 9999,
                        background: hasReacted ? '#FFF3EC' : '#F5F2EE',
                        border: `1px solid ${hasReacted ? '#E8784A' : 'transparent'}`,
                        cursor: 'pointer', color: hasReacted ? '#E8784A' : '#8D806F', fontSize: 13,
                      }}>
                        {hasReacted ? '❤️' : '🤍'} {hasReacted ? '已感谢' : '感谢老师'}
                      </button>
                      <button onClick={() => {
                        if (commentingId === paper.id) {
                          setCommentingId(null)
                          setCommentText('')
                        } else {
                          setCommentingId(paper.id)
                          setExpandedId(paper.id)
                          setCommentText('')
                        }
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 9999,
                        background: '#F5F2EE', border: 'none', cursor: 'pointer', color: '#8D806F', fontSize: 13,
                      }}>
                        留言{paper.comments.length > 0 ? `（${paper.comments.length}）` : ''}
                      </button>
                    </div>

                    {/* 留言区 */}
                    {commentingId === paper.id && (
                      <div style={{ padding: '0 16px 14px' }}>
                        {paper.comments.map(c => (
                          <div key={c.id} style={{
                            padding: '8px 12px', marginBottom: 6, borderRadius: 8,
                            background: c.author.role === 'parent' ? '#FFF3EC' : '#F0FDF4',
                            border: `1px solid ${c.author.role === 'parent' ? '#F5C9A3' : '#BBF7D0'}`,
                          }}>
                            <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 4 }}>
                              {c.author.name} · {fmtDate(c.createdAt)}
                            </div>
                            <div style={{ fontSize: 13, color: '#1F2329' }}>{c.content}</div>
                          </div>
                        ))}
                        <Space.Compact style={{ width: '100%' }}>
                          <Input value={commentText} onChange={e => setCommentText(e.target.value)}
                            placeholder="写下你的留言..." maxLength={200}
                            onPressEnter={() => { if (commentText.trim()) submitComment(paper.id) }} />
                          <Button type="primary" style={{ background: '#E8784A', borderColor: '#E8784A' }}
                            onClick={() => { if (commentText.trim()) submitComment(paper.id) }}>
                            发送
                          </Button>
                        </Space.Compact>
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
  )
}
