'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button, Image, Input, Spin, Typography } from 'antd'
import { CheckCircleOutlined, MessageOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { normalizePracticeCheckin, PRACTICE_CHECKIN_OPTIONS, type PracticeCheckinStatus } from '@/lib/classroom-feedback/feedback-followup'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import styles from './feedback-practice-checkin.module.css'

type ManagementPracticeReply = {
  id: string
  content: string
  imageUrls: string[]
  createdAt: string
}

const replyFetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error || '管理批示加载失败')
  return data as { replies: ManagementPracticeReply[] }
}

export function FeedbackPracticeCheckin({
  feedbackId,
  studentId,
  initialValue,
}: {
  feedbackId: string
  studentId: string | null
  initialValue: unknown
}) {
  const saved = normalizePracticeCheckin(initialValue)
  const [status, setStatus] = useState<PracticeCheckinStatus | null>(saved?.status ?? null)
  const [note, setNote] = useState(saved?.note ?? '')
  const [savedNote, setSavedNote] = useState(saved?.note ?? '')
  const [savedAt, setSavedAt] = useState(saved?.updatedAt ?? null)
  const [saving, setSaving] = useState(false)
  const { data: replyData, isLoading: repliesLoading } = useSWR(
    studentId ? `/api/parent/classroom-feedback/${encodeURIComponent(feedbackId)}/practice-replies?studentId=${encodeURIComponent(studentId)}` : null,
    replyFetcher,
    { revalidateOnFocus: true },
  )
  const replies = replyData?.replies || []
  const replyImageKeys = replies.flatMap((reply) => reply.imageUrls)
  const { urls: signedReplyImages } = useSignedUrls(replyImageKeys)

  if (!studentId) return null

  const save = async (nextStatus: PracticeCheckinStatus, nextNote: string) => {
    if (saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: feedbackId,
          practiceCheckin: { studentId, status: nextStatus, note: nextNote.slice(0, 240) },
        }),
      })
      const data = await response.json().catch(() => null) as { error?: string; practiceCheckin?: { updatedAt?: string } } | null
      if (!response.ok) throw new Error(data?.error || '练习情况暂时没有保存')
      setStatus(nextStatus)
      setSavedNote(nextNote.slice(0, 240))
      setSavedAt(data?.practiceCheckin?.updatedAt || new Date().toISOString())
      toast.success('练习情况已同步给老师和管理端')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '练习情况暂时没有保存')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.card} aria-label="家庭练习回传">
      <div className={styles.heading}>
        <span className={styles.icon}><CheckCircleOutlined /></span>
        <div className={styles.headingCopy}>
          <strong>家庭练习回传</strong>
          <small>点选孩子目前的情况，任课老师和管理团队会一起跟进</small>
        </div>
      </div>
      <div className={styles.options} role="group" aria-label="选择练习情况">
        {PRACTICE_CHECKIN_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={status === option.value}
            disabled={saving}
            className={`${styles.option} ${status === option.value ? styles.selected : ''}`}
            onClick={() => void save(option.value, note)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className={styles.noteLabel}>
        <span><MessageOutlined /> 补充给老师 <em>选填</em></span>
        <Input.TextArea
          value={note}
          maxLength={240}
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="例如：第 2 题还需要提醒先画辅助线"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className={styles.footer}>
        <span>{savedAt ? '已记录，任课老师和管理团队可查看' : '仅当前学员的家长、任课老师和管理端可见'}</span>
        <Button
          size="small"
          disabled={!status || saving || note === savedNote}
          loading={saving}
          onClick={() => status && void save(status, note)}
        >
          保存补充
        </Button>
      </div>

      {(repliesLoading || replies.length > 0) && (
        <section className={styles.managementReplies} aria-label="管理团队对家庭练习回传的回复">
          <div className={styles.managementHeading}>
            <strong>牧哲学堂管理团队回复</strong>
            <span>仅您与管理端可见</span>
          </div>
          {repliesLoading ? <Spin size="small" /> : replies.map((reply) => {
            const imageStart = replies.slice(0, replies.indexOf(reply)).reduce((count, item) => count + item.imageUrls.length, 0)
            return (
              <article key={reply.id} className={styles.managementReply}>
                <time>{new Date(reply.createdAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                {reply.content && <Typography.Paragraph className={styles.managementContent}>{reply.content}</Typography.Paragraph>}
                {reply.imageUrls.length > 0 && (
                  <div className={styles.replyImages}>
                    {reply.imageUrls.map((url, index) => (
                      <Image
                        key={`${reply.id}-${url}`}
                        src={signedReplyImages[imageStart + index] || url}
                        alt={`管理团队回复图片 ${index + 1}`}
                        width={88}
                        height={88}
                        style={{ objectFit: 'cover', borderRadius: 9 }}
                      />
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}
    </section>
  )
}
