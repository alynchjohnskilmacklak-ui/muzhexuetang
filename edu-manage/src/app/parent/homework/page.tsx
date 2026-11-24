'use client'

import { useState } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { Alert, Button, Input, message } from 'antd'
import {
  BookOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  EditOutlined,
  FileTextOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import styles from './homework.module.css'

type Assignment = {
  id: string
  title: string
  instructions: string | null
  dueAt: string | null
  studentIds: string[]
  group: { name: string; course: { name: string } }
  teacher: { name: string }
  submissions: Array<{
    id: string
    studentId: string
    content: string | null
    attachmentUrls: string[]
    status: string
    score: number | null
    teacherComment: string | null
  }>
}

type Data = {
  students: Array<{ id: string; name: string }>
  assignments: Assignment[]
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || '加载失败')
  return d
}

export default function ParentHomeworkPage() {
  const { data, error, mutate, isLoading } = useSWR<Data>('/api/parent/homework', fetcher)
  const [studentIds, setStudentIds] = useState<Record<string, string>>({})
  const [contents, setContents] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<Record<string, string[]>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const upload = async (workKey: string, studentId: string, file: File) => {
    setUploading(workKey)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('uploadType', 'parent-message')
      form.set('studentId', studentId)
      const r = await fetch('/api/upload', { method: 'POST', body: form })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || '照片上传失败')
      setPhotos((current) => ({
        ...current,
        [workKey]: [...(current[workKey] || []), d.url],
      }))
      message.success('照片已添加')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '照片上传失败')
    } finally {
      setUploading(null)
    }
  }

  const removePhoto = (workKey: string, indexToRemove: number) => {
    setPhotos((current) => ({
      ...current,
      [workKey]: (current[workKey] || []).filter((_, i) => i !== indexToRemove),
    }))
  }

  const submit = async (assignment: Assignment, studentId: string) => {
    const workKey = `${assignment.id}:${studentId}`
    setSubmitting(workKey)
    try {
      const r = await fetch('/api/parent/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          studentId,
          content: contents[workKey] || '',
          attachmentUrls: photos[workKey] || [],
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || '提交失败')
      await mutate()
      message.success('作业已提交，老师批改后会通知您')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '提交失败')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <PageLayout title="普通课作业" subtitle="查看老师布置的课后任务，提交文字或作业照片">
      <PullToRefresh onRefresh={async () => { await mutate() }}>
        {error && <Alert type="error" showIcon message={error.message} style={{ marginBottom: 14 }} />}
        {isLoading && !data && <CardSkeleton rows={3} />}

        {(data?.assignments || []).length ? (
          <div className={styles.container}>
            {data!.assignments.map((a, assignmentIndex) => {
              const eligibleStudents = data!.students.filter((s) => a.studentIds.includes(s.id))
              const studentId = studentIds[a.id] || eligibleStudents[0]?.id || ''
              const workKey = `${a.id}:${studentId}`
              const submitted = a.submissions.find((s) => s.studentId === studentId)
              const isReviewed = submitted?.status === 'REVIEWED'

              let statusNode = (
                <span className={`${styles.statusPill} ${styles.statusPending}`}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />待提交
                </span>
              )
              if (isReviewed) {
                statusNode = (
                  <span className={`${styles.statusPill} ${styles.statusReviewed}`}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />已批改
                  </span>
                )
              } else if (submitted) {
                statusNode = (
                  <span className={`${styles.statusPill} ${styles.statusSubmitted}`}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />已提交
                  </span>
                )
              }

              const currentPhotos = photos[workKey] || submitted?.attachmentUrls || []

              return (
                <article
                  key={a.id}
                  className={`${styles.assignmentCard} stagger-item`}
                  style={{ animationDelay: `${Math.min(assignmentIndex, 8) * 45}ms` }}
                >
                  <div className={styles.cardHead}>
                    <h2 className={styles.cardTitle}>{a.title}</h2>
                    {statusNode}
                  </div>

                  <div className={styles.metaRow}>
                    <span>{a.group.name}</span>
                    <span className={styles.metaDot}>·</span>
                    <span>{a.group.course.name}</span>
                    <span className={styles.metaDot}>·</span>
                    <span>{a.teacher.name}老师</span>
                    {a.dueAt && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span>截止 {new Date(a.dueAt).toLocaleDateString('zh-CN')}</span>
                      </>
                    )}
                  </div>

                  {a.instructions && (
                    <div className={styles.instructionsBox}>
                      {a.instructions}
                    </div>
                  )}

                  {submitted && (
                    <div className={styles.submissionWell}>
                      <span className={styles.submissionLabel}>
                        <BookOutlined /> 我的提交记录
                      </span>
                      {submitted.content && (
                        <div className={styles.submissionContent}>{submitted.content}</div>
                      )}
                      {!!submitted.attachmentUrls.length && (
                        <div className={styles.photoGrid}>
                          {submitted.attachmentUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className={styles.photoThumb}>
                              <Image
                                src={url}
                                alt="提交的作业照片"
                                fill
                                unoptimized
                                style={{ objectFit: 'cover' }}
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      {isReviewed && (
                        <div className={styles.teacherReviewAlert}>
                          <div className={styles.scoreBanner}>
                            <span className={styles.scoreText}>
                              {submitted.score === null ? '老师已完成批改' : `成绩：${submitted.score} 分`}
                            </span>
                          </div>
                          {submitted.teacherComment && (
                            <div className={styles.teacherComment}>
                              评语：{submitted.teacherComment}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!isReviewed && (
                    <div className={styles.formSection}>
                      {eligibleStudents.length > 1 && (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 6 }}>
                            选择提交作业的学员：
                          </div>
                          <div className={styles.studentSelector}>
                            {eligibleStudents.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                className={`${styles.studentChip} ${st.id === studentId ? styles.studentChipActive : ''}`}
                                onClick={() => setStudentIds((current) => ({ ...current, [a.id]: st.id }))}
                              >
                                <UserOutlined style={{ marginRight: 4 }} />
                                {st.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <Input.TextArea
                        value={contents[workKey] ?? submitted?.content ?? ''}
                        onChange={(e) => setContents((x) => ({ ...x, [workKey]: e.target.value }))}
                        rows={3}
                        maxLength={5000}
                        placeholder="输入作业文字解答或反思心得…"
                        style={{ borderRadius: 10 }}
                      />

                      <div className={styles.photoGrid}>
                        {currentPhotos.map((url, pIdx) => (
                          <div key={url} className={styles.photoThumb}>
                            <Image
                              src={url}
                              alt="待提交照片"
                              fill
                              unoptimized
                              style={{ objectFit: 'cover' }}
                            />
                            {!submitted && (
                              <button
                                type="button"
                                className={styles.deletePhotoBtn}
                                onClick={() => removePhoto(workKey, pIdx)}
                                aria-label="删除此照片"
                              >
                                <CloseOutlined />
                              </button>
                            )}
                          </div>
                        ))}

                        {currentPhotos.length < 8 && (
                          <label className={styles.uploadAction}>
                            <CameraOutlined />
                            <span>{uploading === workKey ? '上传中…' : '添加作业照片'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              disabled={!studentId || uploading === workKey || currentPhotos.length >= 8}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) void upload(workKey, studentId, file)
                                e.target.value = ''
                              }}
                            />
                          </label>
                        )}
                      </div>

                      <Button
                        type="primary"
                        icon={submitted ? <EditOutlined /> : <SendOutlined />}
                        loading={submitting === workKey}
                        disabled={!studentId}
                        className={styles.submitBtn}
                        onClick={() => void submit(a, studentId)}
                      >
                        {submitted ? '更新作业提交' : '确认提交作业'}
                      </Button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <BrandEmpty
            title="暂无待完成的普通课作业"
            hint="老师布置作业后会在此处提醒，可直接在线填写文字并拍照提交。"
            icon={<FileTextOutlined />}
          />
        )}
      </PullToRefresh>
    </PageLayout>
  )
}
