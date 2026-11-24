'use client'

import { useState } from 'react'
import { Tag, Typography, Image } from 'antd'
import {
  CrownOutlined, HeartOutlined, SafetyCertificateOutlined,
  CheckCircleOutlined, RightOutlined, DownOutlined, StarOutlined,
} from '@ant-design/icons'
import { DEFAULT_MEMBERSHIP_BENEFITS } from '@/data/membership-benefits-default'
import { type MembershipLevel, MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'

const { Title, Text } = Typography

type BenefitItem = { title: string; description: string }

const LEVEL_SUMMARY: Record<MembershipLevel, { title: string; subtitle: string; tags: string[]; footer: string }> = {
  NORMAL: {
    title: '当前等级：普通用户',
    subtitle: '感谢您选择牧哲学堂，当前可享完整的基础学习服务权益。',
    tags: ['课程查看', '考勤同步', '学习反馈', '资料通知', '基础沟通', '免费打印80张'],
    footer: '继续选择牧哲学堂，权益可逐步升级。',
  },
  VIP: {
    title: '当前等级：VIP 用户',
    subtitle: '感谢您再次选择牧哲学堂，您已成为我们的长期信任家庭。',
    tags: ['包含普通权益', '优先响应', '重点关注', '资料优先', '服务热线', '免费打印300张', '赠送一对一辅导1小时'],
    footer: 'VIP用户可享受更及时、更细致的服务支持。',
  },
  SVIP: {
    title: '当前等级：SVIP 用户',
    subtitle: '感谢您长期选择牧哲学堂，您已成为我们的核心陪伴家庭。',
    tags: ['包含VIP权益', '专人跟进', '深度试卷分析', '志愿填报跟进', '学习规划沟通', '免费打印500张', '赠送一对一辅导3小时', '老带新专属回馈'],
    footer: 'SVIP用户享受更深度、更优先、更系统的服务支持。',
  },
}

const LEVEL_DETAILS: Record<MembershipLevel, { heading: string; intro: string; items: BenefitItem[]; closing: string }> = {
  NORMAL: {
    heading: '普通用户｜基础学习服务家庭',
    intro: '感谢您选择牧哲学堂。孩子在课堂教学、班型安排、师资配置和学习反馈方面，均按照牧哲学堂统一标准执行。',
    items: [
      { title: '课程安排查看', description: '查看上课时间、课程科目、任课老师及课程变动提醒。' },
      { title: '考勤记录同步', description: '及时了解孩子的到课情况与学习参与状态。' },
      { title: '学习反馈查看', description: '课后查看课堂表现、知识掌握情况及老师建议。' },
      { title: '资料与课程通知', description: '接收课程资料、考试提醒、放假通知和机构重要安排。' },
      { title: '基础学习建议', description: '老师结合课堂表现，提供清晰、实用的学习建议。' },
      { title: '免费打印支持', description: '每名学生可免费打印暑假作业及基础教学资料80张。' },
      { title: '阶段学习报告', description: '每学期末汇总出勤、课堂表现与阶段反馈。' },
      { title: '家校沟通服务', description: '课程、考勤、资料或系统问题均可联系工作人员协助。' },
    ],
    closing: '一次选择，是信任的开始；每一次反馈，都是为了让孩子稳步向前。',
  },
  VIP: {
    heading: 'VIP用户｜长期信任家庭',
    intro: '感谢您再次选择牧哲学堂。VIP用户在普通用户权益基础上，享有更及时、更细致、更安心的增值服务支持。',
    items: [
      { title: '包含普通用户全部权益', description: '完整享受课程、考勤、反馈、资料和基础学习建议等服务。' },
      { title: '优先问题响应', description: '课程安排、学习反馈、资料领取和系统问题优先处理。' },
      { title: '优先服务热线', description: '拨打15930114500或18031264903时享有优先接听与处理。' },
      { title: '学习情况重点关注', description: '持续关注孩子阶段状态，及时同步进步与不足。' },
      { title: '阶段性学习提醒', description: '适时提醒薄弱科目、作业完成情况和复习方向。' },
      { title: '课程与名额优先提醒', description: '新班、课程调整和假期班报名等节点优先通知。' },
      { title: '学习资料优先获取', description: '优先查看或领取阶段复习与学习规划资料。' },
      { title: '免费打印权益升级', description: '每名学生可免费打印作业、复习卷等教学资料300张。' },
      { title: '赠送一对一辅导', description: '每名学生赠送1小时一对一辅导，集中处理薄弱环节。' },
      { title: '老带新专属回馈', description: '成功推荐新生报名，可享学费抵扣等专属回馈。' },
    ],
    closing: '选择一次，是认可；再次选择，是信任。我们会用更扎实的教学回应每一份长期托付。',
  },
  SVIP: {
    heading: 'SVIP用户｜核心陪伴家庭',
    intro: '感谢您长期选择牧哲学堂。SVIP用户在普通和VIP权益基础上，享有更深度、更优先、更系统的成长服务。',
    items: [
      { title: '包含普通与VIP全部权益', description: '完整享有基础服务、优先响应、重点关注和资料支持。' },
      { title: '学习问题优先跟进', description: '状态波动、作业问题、知识薄弱和考试失分优先沟通。' },
      { title: '深度试卷分析与建议', description: '深入分析失分原因、薄弱板块，并给出个性化提升方向。' },
      { title: '重点考试节点提醒', description: '期中期末、中高考、会考及体育考试等节点及时提醒。' },
      { title: '志愿填报一对一跟进', description: '结合成绩、目标学校、报考规则和家庭需求提供参考。' },
      { title: '学习规划沟通服务', description: '围绕升学衔接、冲刺、选科和高考规划提供建议。' },
      { title: '专属优先服务通道', description: '服务热线优先响应，并由专人持续跟进处理。' },
      { title: '重要资料优先领取', description: '优先获得复习、考试、志愿和政策解读等专项资料。' },
      { title: '打印与辅导全面升级', description: '免费打印500张，并赠送3小时一对一辅导。' },
      { title: '老带新专属回馈升级', description: '成功推荐新生报名，新客户可提升一个会员等级。' },
    ],
    closing: '三次及以上的选择，是一份长期托付。我们会用更专业、更真诚的服务陪孩子走好每个关键阶段。',
  },
}

const COMPARISONS = [
  ['课程 / 考勤 / 反馈查看', '支持', '支持', '支持'],
  ['资料与课程通知', '支持', '优先提醒', '优先提醒 + 专项资料支持'],
  ['问题响应', '正常响应', '优先响应', '优先响应 + 专人跟进'],
  ['学习情况关注', '基础关注', '阶段重点关注', '持续重点跟进'],
  ['免费打印张数', '80张', '300张', '500张'],
  ['赠送一对一辅导', '—', '1小时', '3小时'],
  ['阶段学习报告', '学期末基础报告', '月度学习报告', '考后即时分析 + 深度报告'],
  ['试卷分析服务', '—', '基础建议', '深度试卷分析'],
  ['志愿填报跟进', '基础资料提醒', '政策资料优先获取', '一对一跟进'],
  ['老带新回馈', '—', '专属回馈', '回馈升级，可助新客户提升等级'],
] as const

function extractConfiguredDetails(content: string, level: MembershipLevel): BenefitItem[] | null {
  if (!content.trim() || content.trim() === DEFAULT_MEMBERSHIP_BENEFITS.trim()) return null
  const heading = level === 'NORMAL' ? '普通用户' : `${level} 用户`
  const section = content.split(new RegExp(`##\\s+您当前为牧哲学堂\\s*${heading}`, 'i'))[1]
  if (!section) return null
  const sectionBody = section.split(/\n---|\n##\s/)[0]
  const items = [...sectionBody.matchAll(/\d+\.\s+\*\*(.+?)\*\*\s*\n+\s*([^\n]+)/g)]
    .slice(0, 10)
    .map(match => ({ title: match[1].trim(), description: match[2].trim() }))
  return items.length ? items : null
}

const LEVEL_META: Record<MembershipLevel, { name: string; rule: string; accent: string; bg: string; border: string }> = {
  NORMAL: { name: '普通用户', rule: '选择 1 次', accent: '#3E8E6E', bg: 'rgba(62,142,110,.10)', border: 'rgba(62,142,110,.28)' },
  VIP: { name: 'VIP 用户', rule: '选择 2 次及以上', accent: '#E8784A', bg: 'rgba(232,120,74,.10)', border: 'rgba(232,120,74,.30)' },
  SVIP: { name: 'SVIP 用户', rule: '选择 3 次及以上', accent: '#C9A45C', bg: 'rgba(201,164,92,.12)', border: 'rgba(201,164,92,.36)' },
}

export function BenefitsClient({ content, studentName, membershipLevel }: { content: string; studentName: string; membershipLevel: string }) {
  const level = resolveMembership(membershipLevel)
  const theme = MEMBERSHIP_THEME[level]
  const summary = LEVEL_SUMMARY[level]
  const [openLevel, setOpenLevel] = useState<MembershipLevel>(level)

  const detailItems = (Object.keys(LEVEL_DETAILS) as MembershipLevel[]).map(itemLevel => {
    const detail = LEVEL_DETAILS[itemLevel]
    const configuredItems = extractConfiguredDetails(content, itemLevel)
    const itemMeta = LEVEL_META[itemLevel]
    const isOpen = openLevel === itemLevel
    return {
      level: itemLevel,
      meta: itemMeta,
      detail,
      items: configuredItems || detail.items,
      isOpen,
    }
  })

  return (
    <div style={{ padding: '0 0 60px', overflowX: 'clip', color: '#123C35' }}>
      {/* 品牌头部 */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: level === 'SVIP'
          ? 'linear-gradient(150deg,#1B4A3D 0%,#0E5E4E 55%,#0B2A25 100%)'
          : level === 'VIP'
            ? 'linear-gradient(150deg,#1B4A3D 0%,#0E5E4E 55%,#123C35 100%)'
            : 'linear-gradient(150deg,#1B4A3D 0%,#0E5E4E 55%,#123C35 100%)',
        borderRadius: '0 0 26px 26px', padding: '22px 18px 26px', color: '#fff',
        boxShadow: '0 10px 26px rgba(14,94,78,.22)',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.32),transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: -70, left: -40, width: 150, height: 150, borderRadius: 999, background: 'radial-gradient(circle,rgba(255,255,255,.08),transparent 65%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image src="/images/logo-small-128.webp" alt="牧哲学堂" width={52} height={52} style={{ borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} preview={false} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.68)', letterSpacing: .5 }}>家长端 · 会员权益</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: .3, marginTop: 2 }}>会员权益</div>
          </div>
          <Tag
            style={{
              borderRadius: 999, margin: 0, flexShrink: 0,
              background: level === 'SVIP' ? 'linear-gradient(135deg,#C9A45C,#A8873D)' : level === 'VIP' ? 'linear-gradient(135deg,#F0875B,#E8784A)' : 'linear-gradient(135deg,#3E8E6E,#2F7A5F)',
              border: 'none', color: '#fff', fontWeight: 800, fontSize: 13,
              padding: '4px 14px',
            }}
          >
            {level === 'SVIP' && <CrownOutlined style={{ color: '#FFF3D6', marginRight: 4 }} />}
            {level === 'NORMAL' ? '普通用户' : level}
          </Tag>
        </div>
        <div style={{ position: 'relative', marginTop: 12, fontSize: 12.5, color: 'rgba(255,255,255,.82)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <StarOutlined style={{ color: '#C9A45C' }} />
          {studentName || '当前学生'} 当前等级：{level === 'NORMAL' ? '普通用户' : level}
        </div>
      </div>

      {/* 理念卡 */}
      <div style={{ margin: '14px 16px 0' }}>
        <div style={{
          borderRadius: 16, padding: '16px 16px 14px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg,rgba(201,164,92,.14),rgba(232,120,74,.06))',
          border: '1px solid rgba(201,164,92,.26)',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -10, width: 100, height: 100, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.18),transparent 65%)' }} />
          <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: 'linear-gradient(135deg,#C9A45C,#A8873D)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>
              <HeartOutlined />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#123C35' }}>牧哲学堂会员权益说明</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7A5C22', marginTop: 6, lineHeight: 1.6 }}>
                牧哲学堂始终坚持：把每一个孩子，当成自己的孩子来教。
              </div>
              <div style={{ fontSize: 12.5, color: '#7A6A55', lineHeight: 1.8, marginTop: 4 }}>
                无论您当前属于普通用户、VIP用户还是SVIP用户，孩子享受的班型要求、课堂标准、师资配置与教学态度都是一致的。会员等级不是对孩子区别教学，而是把更多优惠、提醒、跟进和增值服务，回馈给长期信任牧哲学堂的家庭。
              </div>
              <div style={{ fontSize: 12.5, color: '#7A5C22', fontWeight: 600, marginTop: 6 }}>
                每一次选择，都是一份信任；长期选择，我们更要认真对待。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 当前等级卡 */}
      <div style={{ margin: '14px 16px 0' }}>
        <div style={{
          borderRadius: 18, padding: '18px 16px 16px', position: 'relative', overflow: 'hidden',
          background: level === 'SVIP'
            ? 'linear-gradient(150deg,#123C35 0%,#0B2A25 100%)'
            : level === 'VIP'
              ? 'linear-gradient(150deg,#1B4A3D 0%,#123C35 100%)'
              : 'linear-gradient(150deg,#1B4A3D 0%,#123C35 100%)',
          border: level === 'SVIP' ? '1px solid rgba(201,164,92,.5)' : '1px solid rgba(201,164,92,.22)',
          boxShadow: '0 14px 30px rgba(18,60,53,.22)',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.22),transparent 65%)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: level === 'SVIP' ? '#E5C98A' : '#fff' }}>{summary.title}</div>
              <div style={{ fontSize: 12.5, color: level === 'SVIP' ? 'rgba(245,235,210,.78)' : 'rgba(255,255,255,.80)', lineHeight: 1.7, marginTop: 5 }}>
                {summary.subtitle}
              </div>
            </div>
            <SafetyCertificateOutlined style={{ color: level === 'SVIP' ? '#C9A45C' : theme.accent, fontSize: 24, flexShrink: 0, marginTop: 2 }} />
          </div>
          <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
            {summary.tags.map(tag => (
              <span key={tag} style={{
                padding: '4px 11px', borderRadius: 999,
                background: level === 'SVIP' ? 'rgba(201,164,92,.14)' : 'rgba(255,255,255,.10)',
                border: level === 'SVIP' ? '1px solid rgba(201,164,92,.28)' : '1px solid rgba(255,255,255,.16)',
                color: level === 'SVIP' ? '#E5C98A' : 'rgba(255,255,255,.88)',
                fontSize: 12, fontWeight: 600,
              }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{ position: 'relative', marginTop: 14, fontSize: 12, fontWeight: 700, color: level === 'SVIP' ? '#E5C98A' : '#C9A45C' }}>
            {summary.footer}
          </div>
        </div>
      </div>

      {/* 等级规则 */}
      <div style={{ margin: '18px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 9, borderLeft: '3px solid #0E5E4E' }}>
          <SafetyCertificateOutlined style={{ color: '#0E5E4E' }} />
          <Text strong style={{ color: '#123C35', fontSize: 15 }}>等级规则</Text>
        </div>
        <div style={{ fontSize: 12, color: '#9A8E7A', marginBottom: 10, paddingLeft: 12 }}>
          您的家庭服务等级将根据选择牧哲学堂的次数自动生成。
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {(Object.keys(LEVEL_META) as MembershipLevel[]).map((itemLevel, index) => {
            const meta = LEVEL_META[itemLevel]
            const isCurrent = itemLevel === level
            return (
              <div key={itemLevel} className="stagger-item" style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, borderRadius: 14, padding: '13px 14px', background: isCurrent ? meta.bg : '#fff', border: `1px solid ${isCurrent ? meta.border : '#EEE7E1'}`, display: 'flex', alignItems: 'center', gap: 12, boxShadow: isCurrent ? '0 4px 12px rgba(18,60,53,.08)' : 'none' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: isCurrent ? `linear-gradient(135deg,${meta.accent},${meta.accent}CC)` : 'rgba(0,0,0,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isCurrent ? '#fff' : '#9A8E7A', fontSize: 17,
                }}>
                  {itemLevel === 'SVIP' ? <CrownOutlined /> : itemLevel === 'VIP' ? <StarOutlined /> : <CheckCircleOutlined />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isCurrent ? meta.accent : '#123C35', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {meta.name}
                    {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: meta.accent, color: '#fff' }}>当前等级</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#7A6A55', marginTop: 2 }}>{meta.rule}</div>
                </div>
                {index < 2 && <RightOutlined style={{ color: '#C9A45C', fontSize: 13 }} />}
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: '#9A8E7A', marginTop: 10, paddingLeft: 12, lineHeight: 1.6 }}>
          我们珍惜每一次选择，也会把更多增值服务回馈给长期信任我们的家庭。
        </div>
      </div>

      {/* 等级权益详情 */}
      <div style={{ margin: '18px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 9, borderLeft: '3px solid #0E5E4E' }}>
          <CrownOutlined style={{ color: '#0E5E4E' }} />
          <Text strong style={{ color: '#123C35', fontSize: 15 }}>等级权益详情</Text>
        </div>
        <div style={{ fontSize: 12, color: '#9A8E7A', marginBottom: 10, paddingLeft: 12 }}>
          当前等级已为您展开，其他等级可按需查看。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {detailItems.map(item => (
            <div key={item.level} style={{
              borderRadius: 16, overflow: 'hidden',
              border: item.isOpen ? `1px solid ${item.meta.border}` : '1px solid #EEE7E1',
              background: '#fff',
              boxShadow: item.isOpen ? '0 6px 18px rgba(18,60,53,.10)' : '0 2px 10px rgba(26,18,1,.04)',
            }}>
              <button type="button" onClick={() => setOpenLevel(item.isOpen ? (item.level === level ? item.level : (Object.keys(LEVEL_DETAILS) as MembershipLevel[]).find(l => l !== item.level) || item.level) : item.level)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '13px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 999, flexShrink: 0,
                  background: `linear-gradient(135deg,${item.meta.accent},${item.meta.accent}AA)`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#123C35' }}>{item.detail.heading}</div>
                  {!item.isOpen && <div style={{ fontSize: 11.5, color: '#9A8E7A', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.items.length} 项权益 · 点击展开查看
                  </div>}
                </div>
                {item.isOpen
                  ? <DownOutlined style={{ color: item.meta.accent, fontSize: 12 }} />
                  : <RightOutlined style={{ color: '#C9A45C', fontSize: 12 }} />}
              </button>
              {item.isOpen && (
                <div style={{ padding: '4px 14px 14px', borderTop: '1px solid #F3EDE6' }}>
                  <div style={{ fontSize: 12.5, color: '#7A6A55', lineHeight: 1.7, padding: '10px 2px 4px' }}>
                    {item.detail.intro}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 }}>
                    {item.items.map((b, index) => (
                      <div key={b.title} className="stagger-item" style={{
                        animationDelay: `${Math.min(index, 8) * 40}ms`,
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '10px 12px', borderRadius: 12,
                        background: index % 2 === 0 ? 'rgba(18,60,53,.035)' : 'rgba(232,120,74,.035)',
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 8, flexShrink: 0,
                          background: `linear-gradient(135deg,${item.meta.accent},${item.meta.accent}BB)`,
                          color: '#fff', fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                        }}>
                          {index + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#123C35' }}>{b.title}</div>
                          <div style={{ fontSize: 12, color: '#7A6A55', lineHeight: 1.7, marginTop: 2 }}>{b.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: item.meta.accent, fontWeight: 600, lineHeight: 1.7, marginTop: 10 }}>
                    {item.detail.closing}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 权益对照 */}
      <div style={{ margin: '18px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 9, borderLeft: '3px solid #0E5E4E' }}>
          <CheckCircleOutlined style={{ color: '#0E5E4E' }} />
          <Text strong style={{ color: '#123C35', fontSize: 15 }}>权益对照</Text>
        </div>
        <div style={{ fontSize: 12, color: '#9A8E7A', marginBottom: 10, paddingLeft: 12 }}>
          各等级教学标准一致，以下仅对增值服务进行说明。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {COMPARISONS.map(([title, normal, vip, svip], compareIndex) => (
            <div key={title} className="stagger-item" style={{ animationDelay: `${Math.min(compareIndex, 8) * 40}ms`, borderRadius: 14, border: '1px solid #EEE7E1', background: '#fff', padding: '12px 14px', boxShadow: '0 2px 10px rgba(26,18,1,.04)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#123C35', marginBottom: 8 }}>{title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: 'rgba(62,142,110,.12)', color: '#3E8E6E', flexShrink: 0 }}>普通</span>
                  <span style={{ fontSize: 12, color: '#7A6A55' }}>{normal}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: 'rgba(232,120,74,.12)', color: '#E8784A', flexShrink: 0 }}>VIP</span>
                  <span style={{ fontSize: 12, color: '#7A6A55' }}>{vip}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: 'linear-gradient(135deg,#C9A45C,#A8873D)', color: '#fff', flexShrink: 0 }}>SVIP</span>
                  <span style={{ fontSize: 12, color: '#7A5C22', fontWeight: 600 }}>{svip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部暖语 */}
      <div style={{ margin: '18px 16px 0', textAlign: 'center', padding: '2px 10px 6px' }}>
        <div style={{
          borderRadius: 14, padding: '14px 16px',
          background: 'linear-gradient(135deg,rgba(18,60,53,.05),rgba(201,164,92,.08))',
          border: '1px dashed rgba(201,164,92,.36)',
          fontSize: 12, color: '#7A6A55', lineHeight: 1.8,
        }}>
          牧哲学堂始终坚持把每一个孩子当成自己的孩子来教。会员权益会根据实际课程安排、学生情况及机构服务规则执行，如有疑问可联系工作人员确认。
        </div>
      </div>
    </div>
  )
}
