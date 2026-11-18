'use client'

import { Alert, Button, Card, Input, Radio, Space } from 'antd'
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { MobileSelect } from '@/components/MobileSelect'
import { BadgePicker } from './BadgePicker'
import { ImageUploader } from './ImageUploader'
import { MoodPicker, MoodValue } from './MoodPicker'
import { RatingMap, RatingStars } from './RatingStars'
import { TagPicker } from './TagPicker'
import {
  readSensitiveSessionValue,
  removeLegacySensitiveStorage,
  removeSensitiveSessionValue,
  writeSensitiveSessionValue,
} from '@/lib/client-sensitive-storage'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('加载失败')
  return res.json()
})

const defaultRatings: RatingMap = { focus: 4, mastery: 4, interaction: 4, homework: 4 }
export function PostComposer({ onPublished }: { onPublished?: (studentId?: string) => void }) {
  const { data: session, status: sessionStatus } = useSession()
  const draftKey = session?.user?.id ? `performance:draft:${session.user.id}` : ''
  const { data: studentsData } = useSWR('/api/students?status=ACTIVE&limit=200', fetcher)
  const students = Array.isArray(studentsData?.students) ? studentsData.students : []

  const [studentId, setStudentId] = useState('')
  const [visibility, setVisibility] = useState('PARENT_ONLY')
  const [type, setType] = useState('DAILY')
  const [mood, setMood] = useState<MoodValue>('GOOD')
  const [tags, setTags] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [ratings, setRatings] = useState<RatingMap>(defaultRatings)
  const [images, setImages] = useState<string[]>([])
  const [badges, setBadges] = useState<string[]>([])
  const [hasDraft, setHasDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !draftKey) return
    removeLegacySensitiveStorage()
    setHasDraft(Boolean(readSensitiveSessionValue(draftKey, 8 * 60 * 60 * 1000)))
  }, [draftKey, sessionStatus])

  const loadDraft = () => {
    if (!draftKey) return
    const parsed = readSensitiveSessionValue<Record<string, unknown>>(draftKey, 8 * 60 * 60 * 1000)
    if (!parsed) return
    try {
      setStudentId(typeof parsed.studentId === 'string' ? parsed.studentId : '')
      setVisibility(typeof parsed.visibility === 'string' ? parsed.visibility : 'PARENT_ONLY')
      setType(typeof parsed.type === 'string' ? parsed.type : 'DAILY')
      setMood((typeof parsed.mood === 'string' ? parsed.mood : 'GOOD') as MoodValue)
      setTags(Array.isArray(parsed.tags) ? parsed.tags : [])
      setContent(typeof parsed.content === 'string' ? parsed.content : '')
      setRatings((parsed.ratings as RatingMap) || defaultRatings)
      setImages(Array.isArray(parsed.images) ? parsed.images : [])
      setBadges(Array.isArray(parsed.badges) ? parsed.badges : [])
      toast.success('已恢复草稿')
    } catch {
      toast.error('草稿读取失败')
    }
  }

  const reset = () => {
    setStudentId('')
    setVisibility('PARENT_ONLY')
    setType('DAILY')
    setMood('GOOD')
    setTags([])
    setContent('')
    setRatings(defaultRatings)
    setImages([])
    setBadges([])
    if (draftKey) removeSensitiveSessionValue(draftKey)
    setHasDraft(false)
  }

  const saveDraft = () => {
    if (!draftKey) return toast.error('登录状态未就绪，请刷新后重试')
    writeSensitiveSessionValue(draftKey, { studentId, visibility, type, mood, tags, content, ratings, images, badges })
    setHasDraft(true)
    toast.success('草稿已保存，可在发布框顶部恢复')
  }

  const publish = async () => {
    if (!studentId) return toast.error('请选择学员')
    if (!content.trim()) return toast.error('请填写表现内容')

    setSubmitting(true)
    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, visibility, type, mood, tags, content, ratings, images, badges }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '发布失败')
      toast.success('表现动态已发布')
      const publishedStudentId = studentId
      reset()
      onPublished?.(publishedStudentId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="发布在校表现" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {hasDraft && (
          <Alert
            type="info"
            showIcon
            message="检测到本机草稿"
            description="草稿保存在当前浏览器里，点击恢复后可继续编辑。"
            action={<Space><Button size="small" onClick={loadDraft}>恢复</Button><Button size="small" onClick={reset}>清除</Button></Space>}
          />
        )}
        <MobileSelect
          placeholder="选择学员"
          value={studentId || undefined}
          onChange={setStudentId}
          options={students.map((student: Record<string, unknown>) => ({
            label: `${student.name}${student.grade ? ` / ${student.grade}` : ''}`,
            value: student.id as string,
          }))}
          style={{ width: '100%' }}
        />
        <Radio.Group value={visibility} onChange={(event) => setVisibility(event.target.value)}>
          <Radio.Button value="PARENT_ONLY">仅家长可见</Radio.Button>
          <Radio.Button value="CLASS_PUBLIC">全班可见</Radio.Button>
        </Radio.Group>
        <Radio.Group value={type} onChange={(event) => setType(event.target.value)}>
          <Radio.Button value="DAILY">日常记录</Radio.Button>
          <Radio.Button value="HIGHLIGHT">高光时刻</Radio.Button>
          <Radio.Button value="WEEKLY_SUMMARY">周总结</Radio.Button>
          <Radio.Button value="ACHIEVEMENT">成就</Radio.Button>
        </Radio.Group>
        <MoodPicker value={mood} onChange={setMood} />
        <TagPicker value={tags} onChange={setTags} />
        <Input.TextArea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="用家长能感受到孩子成长的语言，记录这节课的具体表现..."
          maxLength={300}
          showCount
          autoSize={{ minRows: 4, maxRows: 8 }}
        />
        <RatingStars value={ratings} onChange={setRatings} />
        <ImageUploader value={images} onChange={setImages} />
        <BadgePicker value={badges} onChange={setBadges} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={saveDraft}>存草稿</Button>
          <Button type="primary" loading={submitting} onClick={publish}>发布</Button>
        </div>
      </Space>
    </Card>
  )
}
