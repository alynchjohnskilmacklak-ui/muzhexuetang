'use client'

import { useEffect, useState } from 'react'
import aiLogo from '@/assets/ai-logo.png'
import { useSession } from 'next-auth/react'
import { CloseOutlined } from '@ant-design/icons'
import { AIChatPanel } from './AIChatPanel'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { AIRole } from '@/data/ai-prompts'

const ROLE_QUESTIONS: Record<string, string[]> = {
  admin: [
    '2025年石家庄中考一统线和二统线有什么区别',
    '新乐市高中分配生政策是怎么运作的',
    '寒暑假辅导班如何制定科学的课程计划',
    '家长投诉如何妥善处理，有哪些沟通技巧',
    '河北省2025年中考政策有哪些重要新变化',
  ],
  teacher: [
    '如何写好一份高质量的课堂反馈',
    '课堂上如何提高孩子的专注度',
    '怎样设计分层作业满足不同水平的学生',
    '与家长沟通有哪些实用技巧',
    '如何制定新学期教学计划',
  ],
  parent: [
    '牧哲学堂是什么样的机构？简单介绍一下',
    '牧哲学堂的校区都在哪里？怎么联系',
    '牧哲学堂有什么课程？怎么收费',
    '牧哲学堂的老师怎么样？资质如何',
    '牧哲学堂和家长怎么沟通？能实时了解孩子情况吗',
    '牧哲学堂和普通补习班有什么不同',
  ],
}

function roleToAIRole(role: string | undefined): AIRole {
  if (role === 'admin' || role === 'teacher') return role
  return 'parent'
}

export function AIFloatingLauncher() {
  const { data: session } = useSession()
  const isMobile = useIsMobile() ?? false
  const [open, setOpen] = useState(false)
  const [peeked, setPeeked] = useState(true)

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'parent'
  const questions = ROLE_QUESTIONS[role] ?? ROLE_QUESTIONS.parent
  const aiRole = roleToAIRole(role)

  // 打开时锁定背景滚动
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const ballSize = isMobile ? 52 : 56
  const panelWidth = isMobile ? 'calc(100vw - 20px)' : 420
  const panelHeight = isMobile ? 'min(78vh, 680px)' : 640

  return (
    <>
      {open && (
        <div
          onClick={() => { setOpen(false); setPeeked(true) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,18,1,.35)',
            zIndex: 1090,
            backdropFilter: 'blur(1px)',
          }}
        />
      )}

      {/* 弹窗面板 */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: isMobile ? 10 : 24,
            bottom: isMobile ? 10 : 24,
            width: panelWidth,
            height: panelHeight,
            maxWidth: 'calc(100vw - 20px)',
            background: '#f7f4f0',
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0,0,0,.25)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px 10px 16px',
              background: '#fff',
              borderBottom: '1px solid rgba(0,0,0,.06)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src={aiLogo.src}
                alt=""
                width={26}
                height={26}
                style={{ objectFit: 'cover', borderRadius: 6 }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1201' }}>
                小牧 AI 助手
              </span>
            </div>
            <button
              type="button"
              aria-label="关闭AI助手"
              onClick={() => { setOpen(false); setPeeked(true) }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8a7c66',
                fontSize: 14,
                borderRadius: 8,
              }}
            >
              <CloseOutlined />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChatPanel aiRole={aiRole} suggestedQuestions={questions} />
          </div>
        </div>
      )}

      {/* 悬浮球：贴边收起态露出一点，点击滑出；再点开弹窗 */}
      <button
        type="button"
        aria-label="打开AI助手"
        onClick={() => {
          if (peeked) { setPeeked(false); return }
          setOpen((v) => !v)
        }}
        style={{
          position: 'fixed',
          right: peeked ? (isMobile ? -(ballSize - 30) : -(ballSize - 36)) : (isMobile ? 12 : 24),
          bottom: isMobile ? 88 : 28,
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: '#fff',
          boxShadow: '0 6px 22px rgba(26,18,1,.28), 0 0 0 1px rgba(232,117,69,.25)',
          zIndex: 1080,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          transition: 'right .28s cubic-bezier(.2, 0, 0, 1)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
          }}
        >
          <img
            src={aiLogo.src}
            alt="AI助手"
            width={ballSize}
            height={ballSize}
            style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }}
          />
        </span>
        {peeked && (
          <span
            style={{
              position: 'absolute',
              left: 3,
              top: '50%',
              width: 10,
              height: 10,
              marginTop: -5,
              borderRadius: '50%',
              background: '#E8784A',
              boxShadow: '0 0 0 2px #fff',
            }}
          />
        )}
        {peeked && (
          <span
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              marginTop: -2,
              fontSize: 10,
              color: '#E8784A',
              lineHeight: 1,
              pointerEvents: 'none',
            }}
          >
            ›
          </span>
        )}
      </button>
    </>
  )
}
