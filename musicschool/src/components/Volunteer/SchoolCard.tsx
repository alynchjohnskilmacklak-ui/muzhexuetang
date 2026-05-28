'use client'

import { Card, Tag, Typography } from 'antd'
import {
  CarOutlined, DollarOutlined, HomeOutlined, PhoneOutlined,
} from '@ant-design/icons'

const { Text, Paragraph } = Typography

interface SchoolInfo {
  id: string; schoolId: string; name: string; type: string; location: string
  address: string | null; distanceFromXinle: string | null
  yiTong: number | null; tongZhao: number; enrollment: number | null
  boardingAvail: boolean; boardingFee: string | null; tuitionFee: string | null
  keyFeature: string | null; gaokaoRate: string | null
  intro: string | null; tips: string | null
  website: string | null; phone: string | null
}

const TYPE_COLORS: Record<string, string> = {
  '省示范': '#ff4d4f', '市重点': '#fa8c16', '县中': '#1890ff', '民办': '#722ed1',
}

interface SchoolCardProps {
  school: SchoolInfo
  compact?: boolean
}

export function SchoolCard({ school, compact = false }: SchoolCardProps) {
  if (compact) {
    return (
      <Card
        style={{ borderRadius: 12, height: '100%' }}
        styles={{ body: { padding: '14px 16px' } }}
        hoverable
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <Tag style={{
            backgroundColor: `${TYPE_COLORS[school.type]}18`,
            color: TYPE_COLORS[school.type],
            border: `1px solid ${TYPE_COLORS[school.type]}30`,
            margin: 0, fontSize: 11,
          }}>
            {school.type}
          </Tag>
          <Tag style={{ margin: 0, fontSize: 11 }}>{school.location}</Tag>
          {school.boardingAvail && (
            <Tag color="success" style={{ margin: 0, fontSize: 11 }}>可住宿</Tag>
          )}
        </div>

        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>
          {school.name}
        </Text>

        {school.keyFeature && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, lineHeight: 1.5 }}>
            {school.keyFeature}
          </Text>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {school.yiTong && (
            <Text style={{ fontSize: 12 }}>
              一统线：<Text strong style={{ color: '#ff4d4f' }}>{school.yiTong}</Text>
            </Text>
          )}
          <Text style={{ fontSize: 12 }}>
            统招线：<Text strong style={{ color: '#1890ff' }}>{school.tongZhao}</Text>
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Tag style={{
          backgroundColor: `${TYPE_COLORS[school.type]}18`,
          color: TYPE_COLORS[school.type],
          border: `1px solid ${TYPE_COLORS[school.type]}30`,
          fontSize: 12,
        }}>
          {school.type}
        </Tag>
        <Tag style={{ fontSize: 12 }}>{school.location}</Tag>
        {school.boardingAvail && (
          <Tag color="success" style={{ fontSize: 12 }}>可住宿</Tag>
        )}
      </div>

      {school.keyFeature && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 14,
          backgroundColor: 'rgba(232,117,69,.06)',
          border: '1px solid rgba(232,117,69,.15)',
        }}>
          <Text style={{ fontSize: 13, color: '#5a4e3a', fontWeight: 500 }}>
            {school.keyFeature}
          </Text>
        </div>
      )}

      {/* Key data grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: '统招线', value: `${school.tongZhao}分`, color: '#1890ff' },
          { label: '一统线', value: school.yiTong ? `${school.yiTong}分` : '无（非省示范）', color: '#ff4d4f' },
          { label: '年招生', value: school.enrollment ? `约${school.enrollment}人` : '待更新', color: '#27a644' },
          { label: '高考表现', value: school.gaokaoRate || '待更新', color: '#722ed1' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 8,
            backgroundColor: `${item.color}0d`,
            border: `1px solid ${item.color}20`,
          }}>
            <Text style={{ fontSize: 11, color: '#9a8e7a', display: 'block' }}>{item.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}</Text>
          </div>
        ))}
      </div>

      {/* Practical info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {school.distanceFromXinle && (
          <Text style={{ fontSize: 13 }}>
            <CarOutlined style={{ marginRight: 6, color: '#9a8e7a' }} />
            {school.distanceFromXinle}
          </Text>
        )}
        {school.tuitionFee && (
          <Text style={{ fontSize: 13 }}>
            <DollarOutlined style={{ marginRight: 6, color: '#9a8e7a' }} />
            {school.tuitionFee}
          </Text>
        )}
        {school.boardingAvail && school.boardingFee && (
          <Text style={{ fontSize: 13 }}>
            <HomeOutlined style={{ marginRight: 6, color: '#9a8e7a' }} />
            住宿：{school.boardingFee}
          </Text>
        )}
        {school.phone && (
          <Text style={{ fontSize: 13 }}>
            <PhoneOutlined style={{ marginRight: 6, color: '#9a8e7a' }} />
            招生电话：{school.phone}
          </Text>
        )}
      </div>

      {/* Intro */}
      {school.intro && (
        <div style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#5a4e3a', display: 'block', marginBottom: 4 }}>
            学校简介
          </Text>
          <Paragraph style={{ fontSize: 13, color: '#7a6e60', marginBottom: 0, lineHeight: 1.8 }}>
            {school.intro}
          </Paragraph>
        </div>
      )}

      {/* Tips */}
      {school.tips && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          backgroundColor: 'rgba(24,144,255,.05)',
          border: '1px solid rgba(24,144,255,.15)',
        }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#1890ff', display: 'block', marginBottom: 4 }}>
            新乐学生报考建议
          </Text>
          <Text style={{ fontSize: 13, color: '#3a5a7a', lineHeight: 1.8 }}>{school.tips}</Text>
        </div>
      )}
    </div>
  )
}
