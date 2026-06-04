'use client'

import { AIChatPanel } from '@/components/AI/AIChatPanel'
import { MODEL_CONFIG } from '@/data/ai-prompts'
import { Tag } from 'antd'

const SUGGESTED = [
  '帮我出3道初三物理欧姆定律中等难度练习题，附答案',
  '分析这道题的考查点：二次函数f(x)=x²-4x+3的顶点坐标',
  '初二语文说明文阅读理解答题技巧，附范例',
  '河北中考2025年物理新考纲有哪些重点变化',
  '设计一节关于光的折射的探究实验教学环节',
  '帮我批改这篇作文并给出评分和修改建议',
]

export default function TeacherAIPage() {
  return (
    <div>
      <div style={{
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1117 0%, #1a2332 50%, #1e3a5f 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,.2)',
        position: 'relative',
      }}>
        <div style={{ position: 'relative', padding: '24px 28px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
            AI 教学助手
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.75)', lineHeight: 1.9, marginBottom: 16 }}>
            专为牧哲学堂教师设计，支持<span style={{ color: '#E8784A', fontWeight: 600 }}>出题组卷、题目分析、教学设计、作文批改</span>，
            熟悉河北省中考考纲（2025年新版），助力高效备课。
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
      <AIChatPanel aiRole="teacher" suggestedQuestions={SUGGESTED} />
    </div>
  )
}
