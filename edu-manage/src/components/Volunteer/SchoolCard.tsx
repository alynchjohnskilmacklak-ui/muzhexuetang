'use client'

import { Typography, Divider } from 'antd'
import {
  CarOutlined, DollarOutlined, HomeOutlined, PhoneOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { getAllocationLine } from '@/data/volunteer-2025'

const { Text, Paragraph } = Typography

interface SchoolInfo {
  id: string; schoolId: string; name: string; fullName?: string; type: string; location: string
  address: string | null; distanceFromXinle: string | null
  yiTong: number | null; tongZhao: number; allocationLine?: number | null; enrollment: number | null
  boardingAvail: boolean; boardingFee: string | null; tuitionFee: string | null
  keyFeature: string | null; gaokaoRate: string | null
  intro: string | null; tips: string | null
  website: string | null; phone: string | null
  xinleAccessible?: boolean
}

// Warm light tokens
const C = {
  surface1: '#ffffff',
  surface3: '#f5f2ee',
  hairline: 'rgba(0,0,0,.06)',
  ink: '#1a1201',
  inkMuted: '#5a4e3a',
  inkSubtle: '#9a8e7a',
  primary: '#E8784A',
  primaryBg: '#fff3ec',
  success: '#1D9E75',
  warning: '#C77F00',
  error: '#E24B4A',
}

const TYPE_TAG: Record<string, { color: string; bg: string }> = {
  '省示范': { color: '#E8784A', bg: '#fff3ec' },
  '市重点': { color: '#C77F00', bg: '#fdf4e3' },
  '县中': { color: '#185FA5', bg: '#eaf1f9' },
  '民办': { color: '#722ed1', bg: '#f9f0ff' },
}

interface SchoolCardProps {
  school: SchoolInfo
  compact?: boolean
  onClick?: () => void
}

export function SchoolCard({ school, compact = false, onClick }: SchoolCardProps) {
  const allocationLine = getAllocationLine(school)

  if (compact) {
    const typeMeta = TYPE_TAG[school.type] || { color: '#9a8e7a', bg: '#f5f2ee' }

    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 18px',
          background: C.surface1,
          border: `1px solid ${C.hairline}`,
          borderRadius: 12,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'border-color .15s, box-shadow .15s',
        }}
        onMouseEnter={onClick ? (e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,120,74,.3)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(26,18,1,.06)'
        } : undefined}
        onMouseLeave={onClick ? (e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = C.hairline
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        } : undefined}
      >
        {/* Left: info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {/* Type badge */}
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 6,
            background: typeMeta.bg,
            color: typeMeta.color,
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
            lineHeight: '20px',
          }}>
            {school.type}
          </span>

          {/* School name + location */}
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 14, color: C.ink, whiteSpace: 'nowrap' }}>
              {school.name}
            </Text>
            <Text style={{ fontSize: 11, color: C.inkSubtle, marginLeft: 6, whiteSpace: 'nowrap' }}>
              {school.location}
            </Text>
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {school.boardingAvail && (
              <span style={{
                padding: '1px 6px', borderRadius: 4,
                background: '#eaf7f1', color: C.success, fontSize: 10, fontWeight: 500,
                border: '1px solid #b6e2d2', flexShrink: 0,
              }}>
                住宿
              </span>
            )}
            {school.keyFeature && (
              <Text
                ellipsis={{ tooltip: school.keyFeature }}
                style={{ fontSize: 12, color: C.inkSubtle, maxWidth: 200 }}
              >
                {school.keyFeature}
              </Text>
            )}
          </div>
        </div>

        {/* Right: cutoff lines — aligned for comparison */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          flexShrink: 0, textAlign: 'right',
        }}>
          {school.yiTong && (
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 10, color: C.inkSubtle, display: 'block' }}>{school.type === '民办' ? '市区统招分' : '一统线'}</Text>
              <Text strong style={{ fontSize: 15, color: C.inkMuted, lineHeight: 1.2 }}>{school.yiTong}</Text>
              <Text style={{ fontSize: 10, color: C.inkSubtle }}>分</Text>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 10, color: C.inkSubtle, display: 'block' }}>统招线</Text>
            <Text strong style={{ fontSize: 16, color: C.ink, lineHeight: 1.2 }}>{school.tongZhao}</Text>
            <Text style={{ fontSize: 10, color: C.inkSubtle }}>分</Text>
          </div>
          {allocationLine !== null && (
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 10, color: C.inkSubtle, display: 'block' }}>分配线</Text>
              <Text strong style={{ fontSize: 15, color: C.primary, lineHeight: 1.2 }}>{allocationLine}</Text>
              <Text style={{ fontSize: 10, color: C.inkSubtle }}>分</Text>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full detail view (used in modal)
  return (
    <div>
      {/* Type + location row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {((): React.ReactNode => {
          const tm = TYPE_TAG[school.type] || { color: '#9a8e7a', bg: '#f5f2ee' }
          return (
            <span style={{
              padding: '3px 10px', borderRadius: 8,
              background: tm.bg, color: tm.color,
              fontSize: 12, fontWeight: 600,
              border: `1px solid ${tm.color}30`,
            }}>
              {school.type}
            </span>
          )
        })()}
        <span style={{ fontSize: 12, color: C.inkSubtle, display: 'flex', alignItems: 'center', gap: 4 }}>
          <EnvironmentOutlined /> {school.location}
        </span>
        {school.boardingAvail && (
          <span style={{
            padding: '1px 8px', borderRadius: 4,
            background: '#eaf7f1', color: C.success, fontSize: 11, fontWeight: 500,
          }}>
            可住宿
          </span>
        )}
      </div>

      {/* Key feature highlight */}
      {school.keyFeature && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 14,
          backgroundColor: C.primaryBg,
          border: `1px solid rgba(232,120,74,.15)`,
        }}>
          <Text style={{ fontSize: 13, color: C.inkMuted, fontWeight: 500, lineHeight: 1.7 }}>
            {school.keyFeature}
          </Text>
        </div>
      )}

      {/* Numeric metrics: mobile-friendly grid, text-heavy content stays out of it. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
        marginBottom: 14,
      }}>
        {school.yiTong && (
          <ScoreCell label={school.type === '民办' ? '市区统招分' : '一统线'} value={`${school.yiTong}分`} sub={school.type === '民办' ? '民办市区统招分数' : '一次统招线'} color={C.primary} />
        )}
        <ScoreCell label="统招线" value={`${school.tongZhao}分`} sub="二次统招/实录线" color="#185FA5" />
        <ScoreCell label="分配线" value={allocationLine !== null ? `${allocationLine}分` : '无'} sub={allocationLine !== null ? '数据库录入' : '未录入'} color={C.success} />
        <ScoreCell label="年招生" value={school.enrollment ? `约${school.enrollment}人` : '待更新'} sub="计划人数" color={C.inkSubtle} />
      </div>

      {school.gaokaoRate && (
        <div style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(232,120,74,.06)',
          border: '1px solid rgba(232,120,74,.16)',
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 12, color: C.inkSubtle, display: 'block', marginBottom: 4 }}>
            高考表现
          </Text>
          <Text style={{
            fontSize: 14,
            color: C.ink,
            lineHeight: 1.6,
            wordBreak: 'break-word',
            whiteSpace: 'normal',
          }}>
            {school.gaokaoRate}
          </Text>
        </div>
      )}

      <Text style={{ fontSize: 11, color: C.inkSubtle, display: 'block', lineHeight: 1.6, marginBottom: 14 }}>
        一统线为公办学校一次统招门槛，民办学校显示市区统招分；统招线为最终统招线，分配线为数据库录入的官方分配生录取控制线。
      </Text>

      <Divider style={{ margin: '12px 0', borderColor: C.hairline }} />

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {school.distanceFromXinle && (
          <Text style={{ fontSize: 13, color: C.inkMuted }}>
            <CarOutlined style={{ marginRight: 6, color: C.inkSubtle }} />
            {school.distanceFromXinle}
          </Text>
        )}
        {school.tuitionFee && (
          <Text style={{ fontSize: 13, color: C.inkMuted }}>
            <DollarOutlined style={{ marginRight: 6, color: C.inkSubtle }} />
            {school.tuitionFee}
          </Text>
        )}
        {school.boardingAvail && school.boardingFee && (
          <Text style={{ fontSize: 13, color: C.inkMuted }}>
            <HomeOutlined style={{ marginRight: 6, color: C.inkSubtle }} />
            住宿：{school.boardingFee}
          </Text>
        )}
        {school.phone && (
          <Text style={{ fontSize: 13, color: C.inkMuted }}>
            <PhoneOutlined style={{ marginRight: 6, color: C.inkSubtle }} />
            招生电话：{school.phone}
          </Text>
        )}
      </div>

      {school.intro && (
        <div style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: C.inkMuted, display: 'block', marginBottom: 4 }}>
            学校简介
          </Text>
          <Paragraph style={{ fontSize: 13, color: C.inkMuted, marginBottom: 0, lineHeight: 1.8 }}>
            {school.intro}
          </Paragraph>
        </div>
      )}

      {school.tips && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          backgroundColor: 'rgba(232,120,74,.05)',
          border: `1px solid rgba(232,120,74,.15)`,
        }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: C.primary, display: 'block', marginBottom: 4 }}>
            新乐学生报考建议
          </Text>
          <Text style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.8 }}>{school.tips}</Text>
        </div>
      )}
    </div>
  )
}

function ScoreCell({ label, value, sub, color = C.ink }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 12,
      background: `${color}0d`,
      border: `1px solid ${color}22`,
      minWidth: 0,
    }}>
      <Text style={{ fontSize: 12, color: C.inkSubtle, display: 'block', lineHeight: 1.3 }}>{label}</Text>
      <Text strong style={{
        fontSize: 22,
        color,
        lineHeight: 1.2,
        marginTop: 2,
        whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {value}
      </Text>
      {sub && <Text style={{ fontSize: 11, color: C.inkSubtle, display: 'block', lineHeight: 1.3, marginTop: 2 }}>{sub}</Text>}
    </div>
  )
}
