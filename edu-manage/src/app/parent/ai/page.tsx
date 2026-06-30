'use client'

import { useState } from 'react'
import { AIChatPanel } from '@/components/AI/AIChatPanel'
import { Typography } from 'antd'

const { Text } = Typography

const SUGGESTED = [
  '请帮我解这道题：一元一次方程 3(x-2) = 2x+1',
  '初三物理：欧姆定律 I=U/R 怎么理解，有例题吗',
  '帮我分析：铁和稀盐酸反应的化学方程式',
  '初一生物：光合作用和呼吸作用的区别',
  '英语：被动语态怎么构成，举三个例子',
  '河北中考语文作文高分技巧有哪些',
]

const ABOUT_SUGGESTED = [
  '牧哲学堂是什么样的机构？简单介绍一下',
  '牧哲学堂的校区都在哪里？怎么联系',
  '牧哲学堂有什么课程？怎么收费',
  '牧哲学堂的老师怎么样？资质如何',
  '牧哲学堂和家长怎么沟通？能实时了解孩子情况吗',
  '牧哲学堂和普通补习班有什么不同',
]

export default function ParentAIPage() {
  const [quickAsk, setQuickAsk] = useState<string | null>(null)
  const [showMoreAbout, setShowMoreAbout] = useState(false)

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{
        borderRadius: 14,
        marginBottom: 12,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #FFF6F1 0%, #FFFBF7 100%)',
        border: '1px solid rgba(232,120,74,.2)',
      }}>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #E87545, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#fff',
              fontWeight: 800,
            }}>
              AI
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1201', letterSpacing: 0 }}>
                牧哲学堂 · AI 智学中心
              </div>
              <div style={{ fontSize: 11, color: '#9a8e7a', marginTop: 2 }}>
                MUZHE AI LEARNING CENTER
              </div>
            </div>
          </div>

          <Text style={{ fontSize: 13, color: '#5a4e3a', lineHeight: 1.75, display: 'block' }}>
            汇聚 DeepSeek、MiMo、Kimi 多个大模型，为孩子提供 7×24 小时智能辅导：题目解析、知识梳理、拍照解题。
          </Text>
        </div>
      </div>

      {/* 了解牧哲学堂 — 快捷提问 */}
      <div style={{
        borderRadius: 12,
        marginBottom: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #FFF6F1 0%, #FFFBF7 100%)',
        border: '1px solid rgba(232,120,74,.2)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 20 }}>🏫</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#E8784A' }}>了解牧哲学堂</span>
          <span style={{ fontSize: 11, color: '#9a8e7a' }}>点击问题，AI 为你详细介绍</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ABOUT_SUGGESTED.slice(0, showMoreAbout ? ABOUT_SUGGESTED.length : 3).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuickAsk(q)}
              style={{
                padding: '7px 12px',
                borderRadius: 14,
                cursor: 'pointer',
                backgroundColor: '#fff',
                border: '1px solid rgba(232,120,74,.25)',
                fontSize: 13,
                color: '#5a4e3a',
                fontWeight: 500,
                transition: 'all 0.15s',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(232,120,74,.08)'
                e.currentTarget.style.borderColor = '#E8784A'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff'
                e.currentTarget.style.borderColor = 'rgba(232,120,74,.25)'
              }}
            >
              {q}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMoreAbout(value => !value)}
            aria-expanded={showMoreAbout}
            style={{
              padding: '7px 12px',
              borderRadius: 14,
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: '1px solid rgba(232,120,74,.18)',
              fontSize: 12,
              color: '#E8784A',
              fontWeight: 600,
            }}
          >
            {showMoreAbout ? '收起问题 ⌃' : '更多问题 ⌄'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <AIChatPanel
          aiRole="parent"
          suggestedQuestions={SUGGESTED}
          quickAsk={quickAsk}
          onQuickAskHandled={() => setQuickAsk(null)}
        />
      </div>
    </div>
  )
}
