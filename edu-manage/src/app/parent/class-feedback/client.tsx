'use client'

import { Card, Empty, Tag, Typography } from 'antd'
import { BookOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'

const { Title, Text, Paragraph } = Typography

export function ClassFeedbackClient({ feedbacks }: { feedbacks: any[] }) {
  const router = useRouter()

  return (
    <div>
      <ChildSwitcher />
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 4 }}>课堂反馈</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          老师记录的课堂表现与学习建议
        </Text>
      </div>

      {feedbacks.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="暂无课堂反馈，老师会在课后持续更新孩子的学习情况。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedbacks.map((f: any) => (
            <Card
              key={f.id}
              bordered={false}
              hoverable
              style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}
              onClick={() => router.push(`/parent/class-feedback/${f.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <BookOutlined style={{ color: '#534AB7', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>{f.teacher?.name || '老师'}</Text>
                {(() => {
                  const lessonSubject = f.classLesson?.subject as string | undefined
                  const assignedSubject = (f.classLesson?.group?.teacherAssignments as any[])
                    ?.find((a: any) => a.teacherId === f.teacher?.id)?.subject
                  const subject = lessonSubject || assignedSubject || f.classLesson?.group?.course?.subject
                  return subject ? (
                    <Tag style={{ borderRadius: 9999, fontSize: 10, background: '#F0EEFF', color: '#534AB7', border: 'none' }}>
                      {subject}
                    </Tag>
                  ) : null
                })()}
                <Tag color="purple" style={{ borderRadius: 9999, fontSize: 10 }}>课堂反馈</Tag>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  {format(new Date(f.createdAt), 'yyyy-MM-dd HH:mm')}
                </Text>
              </div>

              {/* Lesson info if available */}
              {f.classLesson?.group?.course && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12, color: '#7A869A' }}>
                  <span><BookOutlined style={{ marginRight: 4 }} />{f.classLesson.group.course.name}</span>
                  {f.classLesson.startTime && (
                    <span><ClockCircleOutlined style={{ marginRight: 4 }} />{f.classLesson.startTime}-{f.classLesson.endTime}</span>
                  )}
                </div>
              )}

              {/* Knowledge points */}
              {f.knowledgePoints?.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {f.knowledgePoints.map((kp: string, i: number) => (
                    <Tag key={i} style={{ borderRadius: 9999, fontSize: 10 }}>{kp}</Tag>
                  ))}
                </div>
              )}

              {/* Summary */}
              {f.summary && (
                <Paragraph
                  ellipsis={{ rows: 3 }}
                  style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 0, color: '#4B5563' }}
                >
                  {f.summary}
                </Paragraph>
              )}

              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: '#E8784A' }}>查看详情 →</Text>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
