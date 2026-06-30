'use client'

import { useState } from 'react'
import { Card, Empty, Image, Tag, Typography } from 'antd'
import { normalizeUploadUrl } from '@/lib/upload-url'

const { Title, Text, Paragraph } = Typography

const SUBJECT_STYLES: Record<string, { bg: string; color: string }> = {
  '数学': { bg: '#FAEEDA', color: '#854F0B' },
  '物理': { bg: '#E1F5EE', color: '#085041' },
  '化学': { bg: '#EEEDFE', color: '#3C3489' },
  '英语': { bg: '#E6F1FB', color: '#185FA5' },
  '语文': { bg: '#FBEAF0', color: '#72243E' },
  '历史': { bg: '#FAF0E6', color: '#633806' },
  '生物': { bg: '#EAF3DE', color: '#27500A' },
  '政治': { bg: '#F5E8F5', color: '#6B2B6B' },
}
const DEFAULT_STYLE = { bg: '#FCFBF9', color: '#5a4e3a' }

interface TeacherInfo {
  id: string; name: string; gender: string | null; avatar: string | null
  education: string | null; university: string | null; major: string | null
  graduationYear: number | null; currentUnit: string | null; subjects: string | null
  bio: string | null; employmentType: string; rating: number; ratingCount: number
  studentCount: number; classGroupCount: number
  studyMaterials?: Array<{ id: string; title: string; grade: string; subject: string; fileType: string; createdAt: string }>
}

const PHOTO_W = 112
const PHOTO_H = 140

function TeacherRow({ teacher }: { teacher: TeacherInfo }) {
  const [imgFailed, setImgFailed] = useState(false)
  const subjects = teacher.subjects ? teacher.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
  const firstSubject = subjects[0] || ''
  const style = SUBJECT_STYLES[firstSubject] || DEFAULT_STYLE
  const titleParts = [teacher.education, teacher.university, teacher.major].filter(Boolean)
  const showAvatar = teacher.avatar && !imgFailed

  return (
    <div style={{
      display: 'flex', gap: 20, padding: '20px 0',
      borderBottom: '1px solid #F3EDE7',
      alignItems: 'flex-start',
    }}>
      {/* Photo area */}
      <div style={{ width: PHOTO_W, height: PHOTO_H, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: '#f8f8f8', border: '1px solid #F0DDD2' }}>
        {showAvatar ? (
          <Image
            src={normalizeUploadUrl(teacher.avatar)}
            alt={teacher.name}
            width={PHOTO_W}
            height={PHOTO_H}
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
            preview={{ mask: '预览' }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 700, color: style.color, background: style.bg,
          }}>
            {teacher.name[0]}
          </div>
        )}
      </div>

      {/* Info area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <Text strong style={{ fontSize: 18, color: '#1F2329' }}>{teacher.name}</Text>
          <Tag color={teacher.employmentType === 'FULL_TIME' ? 'blue' : 'orange'} style={{ borderRadius: 9999, fontSize: 11 }}>
            {teacher.employmentType === 'FULL_TIME' ? '全职' : '兼职'}
          </Tag>
          {teacher.currentUnit && (
            <Text type="secondary" style={{ fontSize: 12 }}>{teacher.currentUnit}</Text>
          )}
        </div>

        {/* Education line */}
        {titleParts.length > 0 && (
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 6 }}>
            {titleParts.join(' · ')}
            {teacher.graduationYear && <span>（{teacher.graduationYear}届）</span>}
          </div>
        )}

        {/* Subject tags */}
        {subjects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {subjects.map(s => {
              const ss = SUBJECT_STYLES[s] || DEFAULT_STYLE
              return <span key={s} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 999, background: ss.bg, color: ss.color, fontWeight: 600 }}>{s}</span>
            })}
          </div>
        )}

        {/* Bio */}
        {teacher.bio && (
          <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 0, color: '#6B7280' }}>
            {teacher.bio}
          </Paragraph>
        )}

        {teacher.studyMaterials?.length ? (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#FCFBF9', border: '1px solid #F3EDE7' }}>
            <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>公开学习资料</Text>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {teacher.studyMaterials.map((material) => (
                <Tag key={material.id} color="blue" style={{ margin: 0, maxWidth: '100%' }}>
                  {material.grade} · {material.subject} · {material.title}
                </Tag>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ParentTeachersClient({ teachers }: { teachers: TeacherInfo[] }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 4 }}>教师信息</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          牧哲学堂教师团队，共 {teachers.length} 位在岗教师
        </Text>
      </div>

      {teachers.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12, minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #F0DDD2' }}>
          <Empty description="暂无在岗教师信息" />
        </Card>
      ) : (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }} styles={{ body: { padding: '0 24px' } }}>
          {teachers.map(t => <TeacherRow key={t.id} teacher={t} />)}
        </Card>
      )}
    </div>
  )
}
