'use client'

import { Card, Collapse, Tag, Typography } from 'antd'
import { CrownOutlined, HeartOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
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

function BenefitList({ items }: { items: BenefitItem[] }) {
  return <div className="membership-benefit-list">{items.map((item, index) => (
    <div className="membership-benefit-item" key={item.title}>
      <span className="membership-benefit-index">{index + 1}</span>
      <div><strong>{item.title}</strong><p>{item.description}</p></div>
    </div>
  ))}</div>
}

export function BenefitsClient({ content, studentName, membershipLevel }: { content: string; studentName: string; membershipLevel: string }) {
  const level = resolveMembership(membershipLevel)
  const theme = MEMBERSHIP_THEME[level]
  const summary = LEVEL_SUMMARY[level]
  const detailItems = (Object.keys(LEVEL_DETAILS) as MembershipLevel[]).map(itemLevel => {
    const detail = LEVEL_DETAILS[itemLevel]
    const configuredItems = extractConfiguredDetails(content, itemLevel)
    const itemTheme = MEMBERSHIP_THEME[itemLevel]
    return {
      key: itemLevel,
      label: <span className="membership-collapse-label"><span style={{ background: itemTheme.accent }} />{detail.heading}</span>,
      children: <div className="membership-level-detail">
        <p className="membership-level-intro">{detail.intro}</p>
        <BenefitList items={configuredItems || detail.items} />
        <p className="membership-level-closing">{detail.closing}</p>
      </div>,
    }
  })

  return (
    <div className="membership-benefits-page">
      <header className="membership-page-head">
        <div>
          <Text className="membership-eyebrow">MUZHE ACADEMY</Text>
          <Title level={2}>会员权益</Title>
          <Text>{studentName || '当前学生'} 当前等级：{level === 'NORMAL' ? '普通用户' : level}</Text>
        </div>
        <Tag className="membership-current-tag" style={{ background: theme.bg, borderColor: theme.border, color: theme.accent }}>
          {level === 'SVIP' && <CrownOutlined style={{ color: theme.gold }} />} {level === 'NORMAL' ? '普通' : level}
        </Tag>
      </header>

      <Card className="membership-philosophy" bordered={false}>
        <div className="membership-section-icon"><HeartOutlined /></div>
        <div>
          <Title level={4}>牧哲学堂会员权益说明</Title>
          <p><strong>牧哲学堂始终坚持：把每一个孩子，当成自己的孩子来教。</strong></p>
          <p>无论您当前属于普通用户、VIP用户还是SVIP用户，孩子享受的班型要求、课堂标准、师资配置与教学态度都是一致的。会员等级不是对孩子区别教学，而是把更多优惠、提醒、跟进和增值服务，回馈给长期信任牧哲学堂的家庭。</p>
          <p>每一次选择，都是一份信任；长期选择，我们更要认真对待。</p>
        </div>
      </Card>

      <Card className={`membership-summary membership-summary-${level.toLowerCase()}`} bordered={false}>
        <div className="membership-summary-head">
          <div><Title level={3}>{summary.title}</Title><Text>{summary.subtitle}</Text></div>
          <SafetyCertificateOutlined style={{ color: theme.accent }} />
        </div>
        <div className="membership-summary-tags">{summary.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
        <div className="membership-summary-footer" style={{ color: theme.accent }}>{summary.footer}</div>
      </Card>

      <section className="membership-section">
        <div className="membership-section-heading"><Title level={4}>等级规则</Title><Text>您的家庭服务等级将根据选择牧哲学堂的次数自动生成。</Text></div>
        <div className="membership-rule-grid">
          <div><span style={{ background: MEMBERSHIP_THEME.NORMAL.accent }} />普通用户<strong>选择 1 次</strong></div>
          <div><span style={{ background: MEMBERSHIP_THEME.VIP.accent }} />VIP用户<strong>选择 2 次及以上</strong></div>
          <div><span style={{ background: MEMBERSHIP_THEME.SVIP.accent }} />SVIP用户<strong>选择 3 次及以上</strong></div>
        </div>
        <Text className="membership-rule-note">我们珍惜每一次选择，也会把更多增值服务回馈给长期信任我们的家庭。</Text>
      </section>

      <section className="membership-section">
        <div className="membership-section-heading"><Title level={4}>等级权益详情</Title><Text>当前等级已为您展开，其他等级可按需查看。</Text></div>
        <Collapse className="membership-level-collapse" defaultActiveKey={[level]} accordion items={detailItems} />
      </section>

      <section className="membership-section">
        <div className="membership-section-heading"><Title level={4}>权益对照</Title><Text>各等级教学标准一致，以下仅对增值服务进行说明。</Text></div>
        <div className="membership-comparison-list">{COMPARISONS.map(([title, normal, vip, svip]) => (
          <Card key={title} className="membership-comparison-card" bordered={false}>
            <strong className="membership-comparison-title">{title}</strong>
            <div className="membership-comparison-row"><Tag>普通</Tag><span>{normal}</span></div>
            <div className="membership-comparison-row"><Tag color="orange">VIP</Tag><span>{vip}</span></div>
            <div className="membership-comparison-row membership-comparison-svip"><Tag>SVIP</Tag><span>{svip}</span></div>
          </Card>
        ))}</div>
      </section>

      <footer className="membership-warm-note">
        牧哲学堂始终坚持把每一个孩子当成自己的孩子来教。会员权益会根据实际课程安排、学生情况及机构服务规则执行，如有疑问可联系工作人员确认。
      </footer>
    </div>
  )
}
