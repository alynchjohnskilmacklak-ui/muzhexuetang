'use client'

import { AIChatPanel } from '@/components/AI/AIChatPanel'
import { MODEL_CONFIG } from '@/data/ai-prompts'
import { Tag, Typography } from 'antd'

const { Text } = Typography

const SUGGESTED = [
  '请帮我解这道题：一元一次方程 3(x-2) = 2x+1',
  '初三物理：欧姆定律 I=U/R 怎么理解，有例题吗',
  '帮我分析：铁和稀盐酸反应的化学方程式',
  '初一生物：光合作用和呼吸作用的区别',
  '英语：被动语态怎么构成，举三个例子',
  '河北中考语文作文高分技巧有哪些',
]

export default function ParentAIPage() {
  return (
    <div>
      <div style={{
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,.2)',
        position: 'relative',
      }}>
        {[[-30, -30, 140], [80, -20, 80], [60, -10, 60]].map(([top, right, size], index) => (
          <div key={index} style={{
            position: 'absolute',
            top,
            right,
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: `rgba(232,117,69,${0.06 + index * 0.03})`,
          }} />
        ))}
        <div style={{ position: 'relative', padding: '24px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 0 }}>
                牧哲学堂 · AI 智学中心
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                MUZHE AI LEARNING CENTER
              </div>
            </div>
          </div>

          <Text style={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)', lineHeight: 1.9, display: 'block', marginBottom: 16 }}>
            汇聚当前最先进的大语言模型，为牧哲学堂每一位学生、家长与教师提供
            <span style={{ color: '#E87545', fontWeight: 600 }}>7×24小时智能辅导服务</span>。
            无论是题目解析、知识梳理，还是拍照解题，让AI成为你最贴心的学习伙伴。
          </Text>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {MODEL_CONFIG.map((model) => (
              <div key={model.id} style={{
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,.06)',
                border: `1px solid ${model.color}40`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backdropFilter: 'blur(10px)',
              }}>
                <span style={{ fontSize: 18, color: model.color, fontWeight: 800 }}>{model.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{model.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{model.desc}</div>
                </div>
                <Tag style={{
                  backgroundColor: model.badgeColor,
                  color: '#fff',
                  border: 'none',
                  fontSize: 10,
                  padding: '0 5px',
                }}>
                  {model.badge}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIChatPanel aiRole="parent" suggestedQuestions={SUGGESTED} />
    </div>
  )
}
