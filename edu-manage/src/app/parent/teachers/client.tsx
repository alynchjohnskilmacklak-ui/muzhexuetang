'use client'

import { useMemo, useState } from 'react'
import NextImage from 'next/image'
import { Image as AntImage, Input, Tag, Typography } from 'antd'
import { SearchOutlined, StarFilled, TeamOutlined } from '@ant-design/icons'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { ResponsiveDialog } from '@/components/Common/ResponsiveDialog'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'

const { Title, Text, Paragraph } = Typography

const SUBJECT_STYLES: Record<string, { bg: string; color: string }> = {
  数学: { bg: '#FAEEDA', color: '#854F0B' },
  物理: { bg: '#E1F5EE', color: '#085041' },
  化学: { bg: '#EEEDFE', color: '#3C3489' },
  英语: { bg: '#E6F1FB', color: '#185FA5' },
  语文: { bg: '#FBEAF0', color: '#72243E' },
  历史: { bg: '#FAF0E6', color: '#633806' },
  生物: { bg: '#EAF3DE', color: '#27500A' },
  政治: { bg: '#F5E8F5', color: '#6B2B6B' },
}
const DEFAULT_STYLE = { bg: 'var(--color-surface-3)', color: 'var(--color-ink-muted)' }

interface TeacherInfo {
  id: string; name: string; gender: string | null; avatar: string | null
  education: string | null; university: string | null; major: string | null
  graduationYear: number | null; currentUnit: string | null; subjects: string | null
  bio: string | null; employmentType: string; rating: number; ratingCount: number
  tierLevel?: string | null
  studentCount: number; classGroupCount: number
  studyMaterials?: Array<{ id: string; title: string; grade: string; subject: string; fileType: string; createdAt: string }>
}

function teacherSubjects(teacher: TeacherInfo) {
  return teacher.subjects?.split(',').map(subject => subject.trim()).filter(Boolean) || []
}

function TeacherGridCard({ teacher, onSelect }: { teacher: TeacherInfo; onSelect: () => void }) {
  const [imageFailed, setImageFailed] = useState(false)
  const subjects = teacherSubjects(teacher)
  const firstStyle = SUBJECT_STYLES[subjects[0]] || DEFAULT_STYLE
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]

  return <button type="button" className="parent-teacher-card" onClick={onSelect}>
    <span className="parent-teacher-avatar" style={{ background: firstStyle.bg, color: firstStyle.color }}>
      {teacher.avatar && !imageFailed
        ? <NextImage fill src={normalizeUploadUrl(teacher.avatar)} alt={teacher.name} sizes="(max-width: 768px) 38vw, 180px" onError={() => setImageFailed(true)} />
        : teacher.name.slice(0, 1)}
    </span>
    <span className="parent-teacher-name">
      <strong>{teacher.name}</strong>
      {tier === 'SENIOR' && <StarFilled aria-label="资深教师" style={{ color: tierTheme.gold }} />}
    </span>
    <span className="parent-teacher-education">{[teacher.education, teacher.university].filter(Boolean).join(' · ') || (teacher.currentUnit || '牧哲学堂教师')}</span>
    <span className="parent-teacher-subjects">
      {subjects.slice(0, 3).map(subject => {
        const style = SUBJECT_STYLES[subject] || DEFAULT_STYLE
        return <span key={subject} style={{ background: style.bg, color: style.color }}>{subject}</span>
      })}
    </span>
  </button>
}

export function ParentTeachersClient({ teachers }: { teachers: TeacherInfo[] }) {
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherInfo | null>(null)
  const allSubjects = useMemo(() => [...new Set(teachers.flatMap(teacherSubjects))], [teachers])
  const filteredTeachers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return teachers.filter(teacher => {
      const matchesName = !normalizedQuery || teacher.name.toLowerCase().includes(normalizedQuery)
      const matchesSubject = !subject || teacherSubjects(teacher).includes(subject)
      return matchesName && matchesSubject
    })
  }, [teachers, query, subject])

  const selectedSubjects = selectedTeacher ? teacherSubjects(selectedTeacher) : []
  const selectedTier = selectedTeacher ? resolveTier(selectedTeacher.tierLevel) : null
  const selectedTierTheme = selectedTier ? TIER_THEME[selectedTier] : null

  return <div className="parent-teachers-page">
    <header className="parent-page-heading">
      <Title level={4}>教师团队</Title>
      <Text type="secondary">牧哲学堂共 {teachers.length} 位在岗教师</Text>
    </header>

    {teachers.length === 0 ? <div className="parent-teachers-empty">
      <BrandEmpty title="暂无在岗教师信息" icon={<TeamOutlined />} />
    </div> : <>
      <Input allowClear value={query} onChange={event => setQuery(event.target.value)} prefix={<SearchOutlined />} placeholder="搜索老师姓名" className="parent-teacher-search" />
      <div className="parent-teacher-chips" role="group" aria-label="按学科筛选">
        <button type="button" aria-pressed={!subject} onClick={() => setSubject('')}>全部</button>
        {allSubjects.map(item => <button type="button" key={item} aria-pressed={subject === item} onClick={() => setSubject(item)}>{item}</button>)}
      </div>

      <div className="parent-teacher-results-head"><Text strong>全部教师</Text><Text type="secondary">{filteredTeachers.length} 位</Text></div>
      {filteredTeachers.length > 0 ? <div className="parent-teacher-grid">
        {filteredTeachers.map(teacher => <TeacherGridCard key={teacher.id} teacher={teacher} onSelect={() => setSelectedTeacher(teacher)} />)}
      </div> : <div className="parent-teachers-empty"><BrandEmpty title="没有找到符合条件的老师" hint="可以更换姓名或学科筛选条件。" /></div>}
    </>}

    <ResponsiveDialog open={Boolean(selectedTeacher)} onClose={() => setSelectedTeacher(null)} title={selectedTeacher?.name || '教师详情'} width={620} mobileHeight="88dvh" footer={null}>
      {selectedTeacher && <div className="parent-teacher-detail">
        <div className="parent-teacher-detail-head">
          {selectedTeacher.avatar
            ? <AntImage src={normalizeUploadUrl(selectedTeacher.avatar)} alt={selectedTeacher.name} width={96} height={120} style={{ objectFit: 'cover', borderRadius: 12 }} />
            : <span className="parent-teacher-detail-fallback">{selectedTeacher.name.slice(0, 1)}</span>}
          <div>
            <Title level={4}>{selectedTeacher.name}</Title>
            <div className="parent-teacher-detail-tags">
              <Tag>{selectedTeacher.employmentType === 'FULL_TIME' ? '全职' : '兼职'}</Tag>
              {selectedTierTheme && <Tag style={{ color: selectedTierTheme.accent, background: selectedTierTheme.bg, borderColor: selectedTierTheme.border }}>{selectedTierTheme.label}</Tag>}
            </div>
            <Text type="secondary">{[selectedTeacher.education, selectedTeacher.university, selectedTeacher.major].filter(Boolean).join(' · ') || '教师资料待完善'}</Text>
            {selectedTeacher.graduationYear && <Text type="secondary">（{selectedTeacher.graduationYear} 届）</Text>}
          </div>
        </div>
        {selectedSubjects.length > 0 && <div className="parent-teacher-detail-subjects">{selectedSubjects.map(item => {
          const style = SUBJECT_STYLES[item] || DEFAULT_STYLE
          return <span key={item} style={{ background: style.bg, color: style.color }}>{item}</span>
        })}</div>}
        <div className="parent-teacher-detail-metrics">
          <div><strong>{selectedTeacher.studentCount}</strong><span>服务学员</span></div>
          <div><strong>{selectedTeacher.classGroupCount}</strong><span>授课班级</span></div>
          <div><strong>{selectedTeacher.ratingCount ? selectedTeacher.rating.toFixed(1) : '暂无'}</strong><span>家长评分</span></div>
        </div>
        {selectedTeacher.currentUnit && <Paragraph><Text strong>当前单位：</Text>{selectedTeacher.currentUnit}</Paragraph>}
        {selectedTeacher.bio && <Paragraph className="parent-teacher-detail-bio">{selectedTeacher.bio}</Paragraph>}
        {!!selectedTeacher.studyMaterials?.length && <section className="parent-teacher-materials">
          <Text strong>公开学习资料</Text>
          {selectedTeacher.studyMaterials.map(material => <div key={material.id}><span>{material.title}</span><small>{material.grade} · {material.subject} · {material.fileType}</small></div>)}
        </section>}
      </div>}
    </ResponsiveDialog>
  </div>
}
