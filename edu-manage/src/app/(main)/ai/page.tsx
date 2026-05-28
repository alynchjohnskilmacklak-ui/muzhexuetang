'use client'

import { AIChatPanel } from '@/components/AI/AIChatPanel'
import { MODEL_CONFIG } from '@/data/ai-prompts'
import { Tag } from 'antd'

const SUGGESTED = [
  '2025年石家庄中考一统线和二统线有什么区别',
  '新乐市高中分配生政策是怎么运作的',
  '寒暑假辅导班如何制定科学的课程计划',
  '家长投诉如何妥善处理，有哪些沟通技巧',
  '河北省2025年中考政策有哪些重要新变化',
]

export default function AdminAIPage() {
  return (
    <div>
      <div style={{
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a0a00 0%, #2d1200 50%, #3d1a00 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,.2)',
        position: 'relative',
      }}>
        <div style={{ position: 'relative', padding: '24px 28px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
            AI 管理助手
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.75)', lineHeight: 1.9, marginBottom: 16 }}>
            整合<span style={{ color: '#E87545', fontWeight: 600 }}> DeepSeek · MiMo · Kimi </span>
            三大顶尖模型，为牧哲学堂管理者提供教育政策咨询、机构运营建议和学科知识支持，
            让管理决策更智慧、更高效。
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {MODEL_CONFIG.map((model) => (
              <div key={model.id} style={{
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,.06)',
                border: `1px solid ${model.color}40`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ color: model.color, fontWeight: 800 }}>{model.icon}</span>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{model.label}</span>
                <Tag style={{ backgroundColor: model.badgeColor, color: '#fff', border: 'none', fontSize: 10, padding: '0 4px' }}>
                  {model.badge}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      </div>
      <AIChatPanel aiRole="admin" suggestedQuestions={SUGGESTED} />
    </div>
  )
}
