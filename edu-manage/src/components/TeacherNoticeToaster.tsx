'use client'

import { useEffect } from 'react'
import { Button, notification } from 'antd'
import { useSWRConfig } from 'swr'
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

type TeacherMessageItem = {
  id: string
  type: 'remind' | 'praise'
  title: string
  content: string
  createdAt: string
}

type QueuedPrompt =
  | { kind: 'message'; item: TeacherMessageItem }
  | { kind: 'read-error'; id: string }
  | { kind: 'load-error' }

/** 教师端提醒逐条显示；当前提示退场后才让下一条进入。 */
export function TeacherNoticeToaster() {
  const { mutate: mutateSWR } = useSWRConfig()

  useEffect(() => {
    let cancelled = false
    let activeKey: string | null = null
    let queue: QueuedPrompt[] = []
    const openKeys = new Set<string>()
    const queuedReadErrors = new Set<string>()

    const finish = (key: string) => {
      if (activeKey !== key) return
      activeKey = null
      openKeys.delete(key)
      window.setTimeout(showNext, 80)
    }

    const markRead = async (id: string) => {
      try {
        const response = await fetch(`/api/teacher/messages/${id}/read`, { method: 'POST' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        await mutateSWR('/api/messages/unread-count')
        return true
      } catch {
        return false
      }
    }

    const showLoadError = (key: string, retrying = false) => {
      notification.open({
        key,
        message: '教师提醒暂时无法加载',
        description: (
          <Button
            type="primary"
            size="small"
            loading={retrying}
            style={{ minHeight: 44, paddingInline: 12 }}
            onClick={(event) => {
              event.stopPropagation()
              void load(key, true)
            }}
          >
            重新加载提醒
          </Button>
        ),
        placement: 'topRight',
        duration: 0,
        onClose: () => finish(key),
      })
    }

    const load = async (activeLoadKey?: string, retrying = false) => {
      try {
        const response = await fetch('/api/teacher/messages')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (cancelled) return

        const messages = (data.messages || []) as TeacherMessageItem[]
        if (activeLoadKey) {
          notification.destroy(activeLoadKey)
          finish(activeLoadKey)
        }
        if (!messages.length) return
        queue.push(...messages.map((item): QueuedPrompt => ({ kind: 'message', item })))
        showNext()
      } catch {
        if (cancelled) return
        if (activeLoadKey && activeKey === activeLoadKey) showLoadError(activeLoadKey, false)
        else {
          const key = `teacher-message-load-error-${Date.now()}`
          queue.push({ kind: 'load-error' })
          loadErrorKey = key
          showNext()
        }
        if (retrying) return
      }
    }

    let loadErrorKey = 'teacher-message-load-error'

    const showNext = () => {
      if (cancelled || activeKey || queue.length === 0) return
      const prompt = queue.shift()
      if (!prompt) return

      if (prompt.kind === 'message') {
        const { item } = prompt
        const key = item.id
        const isPraise = item.type === 'praise'
        activeKey = key
        openKeys.add(key)
        notification.open({
          key,
          message: item.title,
          description: item.content,
          placement: 'topRight',
          duration: isPraise ? 6 : 8,
          icon: isPraise ? <CheckCircleOutlined style={{ color: 'var(--color-success)', fontSize: 20 }} /> : <ExclamationCircleOutlined style={{ color: 'var(--color-warning)', fontSize: 20 }} />,
          onClick: () => {
            notification.destroy(key)
            finish(key)
          },
          onClose: () => finish(key),
        })
        // 只在提醒真正进入可见提示位后标记已读；排队项仍保留未读状态。
        void markRead(item.id).then((ok) => {
          if (!ok && !cancelled && !queuedReadErrors.has(item.id)) {
            queuedReadErrors.add(item.id)
            queue.push({ kind: 'read-error', id: item.id })
          }
        })
        return
      }

      if (prompt.kind === 'read-error') {
        const key = `teacher-message-read-error-${prompt.id}`
        activeKey = key
        openKeys.add(key)
        const showError = (retrying = false) => notification.open({
          key,
          message: '提醒已显示，但已读状态暂未同步',
          description: (
            <Button
              type="primary"
              size="small"
              loading={retrying}
              style={{ minHeight: 44, paddingInline: 12 }}
              onClick={async (event) => {
                event.stopPropagation()
                showError(true)
                if (await markRead(prompt.id)) {
                  notification.destroy(key)
                  queuedReadErrors.delete(prompt.id)
                  finish(key)
                } else {
                  showError(false)
                }
              }}
            >
              重试同步已读状态
            </Button>
          ),
          placement: 'topRight',
          duration: 0,
          onClose: () => finish(key),
        })
        showError()
        return
      }

      const key = loadErrorKey
      activeKey = key
      openKeys.add(key)
      showLoadError(key)
    }

    const timer = window.setTimeout(() => { void load() }, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      openKeys.forEach((key) => notification.destroy(key))
      openKeys.clear()
      notification.destroy('teacher-message-load-error')
    }
  }, [mutateSWR])

  return null
}
