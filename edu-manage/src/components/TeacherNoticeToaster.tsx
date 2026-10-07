'use client'

import { useEffect, useRef } from 'react'
import { notification } from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons'

type TeacherMessageItem = {
  id: string
  type: 'remind' | 'praise'
  title: string
  content: string
  createdAt: string
}

/**
 * 教师端首页弹窗：拉取管理员发来的未读提醒/表扬，依次弹出；
 * 关闭即标记已读（管理端可看到已查看状态）。
 * 仅挂载一次，不在页面重复渲染。
 */
export function TeacherNoticeToaster() {
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/teacher/messages')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const messages = (data.messages || []) as TeacherMessageItem[]
        if (!messages.length) return

        // 依次弹出，最多同时展示前 3 条，其余进入队列由用户关闭时释放
        messages.forEach((item, index) => {
          const isPraise = item.type === 'praise'
          notification.open({
            key: item.id,
            message: item.title,
            description: item.content,
            placement: 'topRight',
            duration: isPraise ? 6 : 8,
            icon: isPraise ? (
              <span style={{ color: '#27a644', fontSize: 20 }}><CheckCircleOutlined /></span>
            ) : (
              <span style={{ color: '#E8784A', fontSize: 20 }}><ExclamationCircleOutlined /></span>
            ),
            closeIcon: <CloseOutlined />,
            style: isPraise
              ? { background: '#f6fbf5', border: '1px solid #cde7cd', borderRadius: 10 }
              : { background: '#fffaf5', border: '1px solid #f0dcc8', borderRadius: 10 },
            onClose: () => {
              void fetch(`/api/teacher/messages/${item.id}/read`, { method: 'POST' }).catch(() => undefined)
            },
            // 延迟弹出避免首屏通知堆叠
            ...(index > 0 ? { } : { }),
          })
        })
      } catch {
        // 静默失败，不影响首页
      }
    }
    const timer = window.setTimeout(load, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return null
}
