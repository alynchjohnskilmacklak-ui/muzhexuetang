'use client'

import { Card, Descriptions, Empty, Image, Tag, Typography, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { normalizeUploadUrl } from '@/lib/upload-url'

const { Title, Text, Paragraph } = Typography

const MASTERY_LABELS: Record<string, { text: string; color: string }> = {
  MASTERED: { text: '已掌握', color: 'green' },
  NEEDS_REVIEW: { text: '需复习', color: 'orange' },
  NEEDS_PRACTICE: { text: '需练习', color: 'red' },
}

export function PaperDetailClient({ paper }: { paper: any }) {
  const router = useRouter()

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/parent/archive')}
        style={{ marginBottom: 16, padding: 0, color: '#5a4e3a' }}
      >
        返回学习档案
      </Button>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}>
        <Title level={4} style={{ marginBottom: 16 }}>{paper.title}</Title>

        <Descriptions column={2} size="small" style={{ marginBottom: 20 }}>
          <Descriptions.Item label="学生">{paper.student?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="教师">{paper.teacher?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="科目"><Tag>{paper.subject}</Tag></Descriptions.Item>
          <Descriptions.Item label="日期">{paper.paperDate ? format(new Date(paper.paperDate), 'yyyy-MM-dd') : '-'}</Descriptions.Item>
        </Descriptions>

        {/* Questions / Knowledge points */}
        {paper.questions?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>知识点掌握情况</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {paper.questions.map((q: any, i: number) => (
                <Tag key={i} color={MASTERY_LABELS[q.mastery]?.color} style={{ borderRadius: 9999, fontSize: 11 }}>
                  {q.topic || `第${i + 1}题`}: {MASTERY_LABELS[q.mastery]?.text || q.mastery}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Overall comment */}
        {paper.overallComment && (
          <div style={{ background: '#FFFBF7', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>总体评价</Text>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563' }}>{paper.overallComment}</Paragraph>
          </div>
        )}

        {/* Paper images */}
        {paper.imageUrls?.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>试卷图片</Text>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {paper.imageUrls.map((url: string, i: number) => (
                  <Image
                    key={i}
                    src={normalizeUploadUrl(url)}
                    alt={`试卷 ${i + 1}`}
                    width={200}
                    height={260}
                    style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #F0DDD2' }}
                    fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjYwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjY2NjIiBmb250LXNpemU9IjE0Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+"
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        )}
      </Card>
    </div>
  )
}
