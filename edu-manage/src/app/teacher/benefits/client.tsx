'use client'

import { Card, Collapse, Tag, Typography } from 'antd'
import {
  CheckCircleFilled,
  CrownOutlined,
  GiftOutlined,
  RiseOutlined,
  StarFilled,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveTier, TEACHER_TIERS, TIER_QUICK_PERKS, TIER_THEME } from '@/constants/teacher-tier'

const { Title, Text } = Typography

export function TeacherBenefitsClient({
  content,
  teacherName,
  tierLevel,
}: {
  content: string
  teacherName: string
  tierLevel: string
}) {
  const tier = resolveTier(tierLevel)
  const theme = TIER_THEME[tier]

  return (
    <div className="teacher-benefits-container" style={{ display: 'grid', gap: 16, paddingBottom: 64 }}>
      {/* 沉浸式尊荣教职荣誉卡：深邃梯队专属渐变、金字高反差排版 */}
      <div
        className="benefits-hero-card"
        style={{
          background: theme.heroBg,
          color: '#ffffff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
          border: `1.5px solid ${theme.accent}33`,
        }}
      >
        <div className="hero-top-row">
          <div className="hero-main-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="hero-badge" style={{ background: theme.accent, color: '#1a1201' }}>
                {theme.roleTag || theme.name}
              </span>
              <span className="hero-subtag">
                <CrownOutlined /> 教学成长激励通道
              </span>
            </div>
            <h2 className="hero-title">{teacherName || '任课'} 老师专属权益</h2>
            <p className="hero-desc">
              深耕课堂，学堂陪伴成长。基于教学贡献与梯队荣誉，为您提供全方位的关怀保障与专项支持。
            </p>
          </div>
          <div className="tier-tag-pill" style={{ borderColor: `${theme.accent}55` }}>
            <StarFilled style={{ color: theme.accent, fontSize: 15 }} />
            <span style={{ color: '#ffffff', fontWeight: 750 }}>{theme.name}</span>
          </div>
        </div>
      </div>

      {/* 当前等级核心特权卡片 */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,.07)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `${theme.primary}15`,
              color: theme.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <GiftOutlined />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 750, color: '#1a1201', display: 'block' }}>
              当前等级享有的专属福利
            </span>
            <span style={{ fontSize: 12, color: '#8c8070' }}>
              由学堂行政教研统一发放与提供优先通道保障
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {TIER_QUICK_PERKS[tier].map((perk) => (
            <div
              key={perk}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 12,
                background: `${theme.primary}08`,
                border: `1px solid ${theme.primary}18`,
                color: '#3a3020',
                lineHeight: 1.6,
                fontSize: 13.5,
              }}
            >
              <CheckCircleFilled style={{ color: theme.primary, marginTop: 3, fontSize: 16 }} />
              <span style={{ fontWeight: 650 }}>{perk}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 梯队等级对照与进阶全览 */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
          <RiseOutlined style={{ color: theme.primary, fontSize: 16 }} />
          <span style={{ fontSize: 15, fontWeight: 750, color: '#1a1201' }}>梯队成长与等级对照</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {TEACHER_TIERS.map((level) => {
            const itemTheme = TIER_THEME[level]
            const isCurrent = level === tier
            return (
              <div
                key={level}
                style={{
                  borderRadius: 14,
                  padding: 16,
                  background: isCurrent ? `linear-gradient(135deg, ${itemTheme.secondary}14, #ffffff)` : '#ffffff',
                  border: isCurrent ? `2px solid ${itemTheme.primary}` : '1px solid rgba(0,0,0,.08)',
                  boxShadow: isCurrent ? `0 6px 20px ${itemTheme.primary}20` : '0 2px 6px rgba(0,0,0,0.02)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 750, color: itemTheme.primary }}>
                    {itemTheme.name}
                  </span>
                  {isCurrent && (
                    <Tag
                      style={{
                        margin: 0,
                        background: itemTheme.primary,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 999,
                        fontSize: 11,
                        padding: '1px 8px',
                        fontWeight: 650,
                      }}
                    >
                      当前等级
                    </Tag>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {TIER_QUICK_PERKS[level].map((perk) => (
                    <div key={perk} style={{ fontSize: 12, color: '#685e50', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                      <span style={{ color: itemTheme.primary, fontWeight: 700 }}>·</span>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 完整规章说明 */}
      <Collapse
        style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,.07)', borderRadius: 14 }}
        items={[
          {
            key: 'full',
            label: <span style={{ fontWeight: 650, fontSize: 13.5 }}>查看学堂教职权益与福利制度完整说明</span>,
            children: (
              <div className="membership-markdown teacher-benefits-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                <Text className="teacher-benefits-mobile-table-note" type="secondary">
                  完整等级对照已整理在上方卡片中。
                </Text>
              </div>
            ),
          },
        ]}
      />

      <style jsx>{`
        .benefits-hero-card {
          padding: 18px 20px;
          border-radius: 16px;
          color: #ffffff;
        }

        .hero-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .hero-main-col {
          flex: 1;
        }

        .hero-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 750;
          padding: 2px 9px;
          border-radius: 999px;
          letter-spacing: 0.2px;
        }

        .hero-subtag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          padding: 2px 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(4px);
        }

        .hero-title {
          margin: 8px 0 4px;
          color: #ffffff;
          font-size: clamp(18px, 3.5vw, 22px);
          font-weight: 800;
          line-height: 1.3;
        }

        .hero-desc {
          margin: 0;
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          line-height: 1.55;
          max-width: 780px;
        }

        .tier-tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.22);
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .benefits-hero-card {
            padding: 16px 14px;
            border-radius: 14px;
          }

          .hero-top-row {
            flex-direction: column;
            gap: 12px;
          }

          .tier-tag-pill {
            align-self: flex-start;
          }
        }
      `}</style>
      <style jsx global>{`
        .teacher-benefits-mobile-table-note {
          display: none;
        }
        @media (max-width: 1024px) {
          .teacher-benefits-markdown table {
            display: none;
          }
          .teacher-benefits-mobile-table-note {
            display: block;
            margin-top: 12px;
          }
        }
      `}</style>
    </div>
  )
}
