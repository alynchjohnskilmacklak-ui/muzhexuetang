'use client'

import { useMemo, useState } from 'react'
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  IdcardOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Modal, Progress, Typography } from 'antd'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text, Title } = Typography
const GUIDE_VERSION = 'v2'
const GUIDE_STEPS = [
  {
    section: '每日先看',
    title: '首页：快速了解孩子今天的情况',
    entry: '登录后默认进入首页；有多个孩子时，可在孩子姓名处切换。',
    description: '首页将当天最重要的信息集中在一起，不需要逐个页面查找。',
    details: ['今天几点上课、由哪位老师授课', '考勤是否完成、有没有新的课堂反馈', '待查看通知、老师回复和成长动态'],
    tip: '首页数字为 0 不代表没有历史记录，只表示当前所选孩子在对应时间范围内暂无新数据。',
    path: '/parent/dashboard',
    action: '回到首页',
    icon: <CheckCircleOutlined />,
  },
  {
    section: '上课安排',
    title: '课程表：确认上课时间和授课老师',
    entry: '点击首页“看课表”，或打开左上角菜单，选择“课程表”。',
    description: '课程表用于查看孩子近期已经安排的班课和个性化课程。',
    details: ['上课日期、开始和结束时间', '课程学科、授课老师、班型和上课地点', '已安排、待上课、已完成等课程状态'],
    tip: '教师刚提交的个性化约课需要管理员审核，审核通过后才会正式显示。',
    path: '/parent/schedule',
    action: '打开课程表',
    icon: <CalendarOutlined />,
  },
  {
    section: '课后必看',
    title: '课堂反馈：查看孩子本节课学了什么',
    entry: '点击首页“看反馈”，或在菜单中选择“成长反馈”。',
    description: '老师发布后，您可以按孩子和日期查看每一次真实课堂记录。',
    details: ['本节课学习内容和知识点', '孩子对课堂内容的掌握情况', '老师评价、改进建议和课堂照片'],
    tip: '点击一条反馈可进入详情；如果暂未显示，通常是老师尚未发布或课程仍在进行。',
    path: '/parent/class-feedback',
    action: '查看课堂反馈',
    icon: <BookOutlined />,
  },
  {
    section: '长期变化',
    title: '成长主页：连续查看老师对孩子的评价',
    entry: '打开菜单中的“成长主页”，或点击首页孩子卡片的“查看成长档案”。',
    description: '成长主页不是单次成绩排名，而是将一段时间内的反馈和表现串联起来。',
    details: ['老师最近对孩子说了什么', '近期出勤、课堂表现和需要关注的方向', '按时间查看更多成长记录和阶段报告'],
    tip: '切换时间范围后，可以更清楚地比较近期变化；阶段报告只依据系统中的真实记录生成。',
    path: '/parent/archive',
    action: '查看成长主页',
    icon: <FileTextOutlined />,
  },
  {
    section: '家校沟通',
    title: '我的留言：向老师咨询并查看回复',
    entry: '点击首页“去留言”，或在菜单“消息沟通”中选择“我的留言”。',
    description: '如需了解课堂表现、作业或其他学习情况，可在对应留言中继续沟通。',
    details: ['查看自己已发送的留言', '查看教师或管理员的最新回复', '继续追问，并确认消息是否已经查看'],
    tip: '涉及具体课堂的问题，建议从对应课堂反馈详情发起留言，老师更容易确认是哪一次课程。',
    path: '/parent/messages',
    action: '打开我的留言',
    icon: <CommentOutlined />,
  },
  {
    section: '重要提醒',
    title: '通知中心：查看学校提醒和处理结果',
    entry: '点击页面右上角提醒图标，或在菜单中选择“通知”。',
    description: '新反馈、学校通知、处理结果等信息会集中显示在通知中心。',
    details: ['未读消息会显示数量提示', '点击通知可进入对应业务详情', '查看后会自动更新未读状态'],
    tip: '如果微信中没有及时看到提醒，可进入通知中心检查；建议同时保持微信通知绑定有效。',
    path: '/parent/notifications',
    action: '查看通知中心',
    icon: <BellOutlined />,
  },
  {
    section: '课时服务',
    title: '课时与请假：核对记录并提前办理',
    entry: '打开菜单“生活服务”，选择“课时明细”或“请假”。',
    description: '课时页面用于核对已经确认的授课记录，请假页面用于提交不能到课的情况。',
    details: ['查看每次上课日期、学科和计入课时', '区分待审核与已经确认的个性化课程', '提交请假申请并查看处理状态'],
    tip: '个性化课程以管理员审核通过的实际授课分钟为准；请假尽量在上课前提交。',
    path: '/parent/hour-records',
    action: '查看课时明细',
    icon: <ClockCircleOutlined />,
  },
  {
    section: '账号设置',
    title: '个人中心：维护联系方式和微信提醒',
    entry: '点击右上角头像，或从菜单“账户设置”进入个人中心。',
    description: '请保持联系方式和微信绑定准确，方便接收学校通知。',
    details: ['查看和维护家长基本资料', '检查绑定孩子是否正确', '管理微信通知绑定和账号安全'],
    tip: '若孩子、教师或课程信息不正确，请不要自行创建重复账号，直接联系管理员核对。',
    path: '/parent/profile',
    action: '打开个人中心',
    icon: <IdcardOutlined />,
  },
] as const

function storageKey(parentUserId?: string) {
  return `mz_parent_usage_guide_${GUIDE_VERSION}_${parentUserId || 'device'}`
}

export function ParentUsageGuideDrawerExtra({ parentUserId }: { parentUserId?: string }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [open, setOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  const current = GUIDE_STEPS[activeStep]
  const progress = useMemo(
    () => Math.round(((activeStep + 1) / GUIDE_STEPS.length) * 100),
    [activeStep],
  )

  const rememberCompletion = () => {
    try {
      window.localStorage.setItem(storageKey(parentUserId), 'completed')
    } catch {
      // The guide remains functional even when storage is unavailable.
    }
  }

  const closeGuide = () => {
    rememberCompletion()
    setOpen(false)
  }

  const navigateTo = (path: string) => {
    setNavigatingTo(path)
    router.push(path)
  }

  const goTo = (path: string) => {
    rememberCompletion()
    setOpen(false)
    navigateTo(path)
  }

  const guideBody = (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>
            第 {activeStep + 1} 项，共 {GUIDE_STEPS.length} 项
          </Text>
          <Text style={{ color: 'var(--color-primary)', fontSize: 13, fontWeight: 600 }}>
            {current.section}
          </Text>
        </div>
        <Progress
          percent={progress}
          showInfo={false}
          strokeColor="var(--color-primary)"
          trailColor="var(--color-surface-4)"
          size="small"
          style={{ marginTop: 8 }}
        />
      </div>

      <div style={{
        padding: isMobile ? 15 : 20,
        borderRadius: 14,
        background: 'var(--color-primary-bg)',
        border: '1px solid var(--color-hairline)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--color-primary)',
            background: 'var(--color-surface-1)',
            fontSize: 19,
          }}>
            {current.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: 'var(--color-ink)', fontSize: 18, lineHeight: 1.45 }}>
              {current.title}
            </Title>
            <Text style={{ display: 'block', marginTop: 8, color: 'var(--color-ink-muted)', fontSize: 14, lineHeight: 1.75 }}>
              {current.description}
            </Text>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--color-surface-1)' }}>
          <div style={{ color: 'var(--color-ink)', fontSize: 13, fontWeight: 650 }}>从哪里进入</div>
          <div style={{ marginTop: 5, color: 'var(--color-ink-muted)', fontSize: 13, lineHeight: 1.7 }}>{current.entry}</div>
          <div style={{ marginTop: 13, color: 'var(--color-ink)', fontSize: 13, fontWeight: 650 }}>进去后可以看到</div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 19, color: 'var(--color-ink-muted)', fontSize: 13, lineHeight: 1.75 }}>
            {current.details.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        </div>

        <div style={{ marginTop: 12, color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--color-primary)' }}>使用提示：</strong>{current.tip}
        </div>

        <Button
          type="link"
          loading={navigatingTo === current.path}
          onClick={() => goTo(current.path)}
          style={{ paddingInline: 0, marginTop: 8, color: 'var(--color-primary)', fontWeight: 600 }}
        >
          {current.action} <RightOutlined />
        </Button>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 18,
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
      }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(0, step - 1))}>
          上一步
        </Button>
        {activeStep < GUIDE_STEPS.length - 1 ? (
          <Button type="primary" onClick={() => setActiveStep((step) => Math.min(GUIDE_STEPS.length - 1, step + 1))}>
            下一步
          </Button>
        ) : (
          <Button type="primary" onClick={closeGuide}>我知道怎么用了</Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Button
        block
        onClick={() => {
          setActiveStep(0)
          setOpen(true)
        }}
        style={{ minHeight: 44, fontWeight: 650 }}
      >
        使用指南
      </Button>

      {open && (isMobile ? (
        <Drawer
          title="牧哲学堂家长端使用指南"
          placement="bottom"
          height="min(84vh, 700px)"
          open
          onClose={closeGuide}
          destroyOnHidden
          styles={{ body: { padding: 14 }, header: { borderBottom: '1px solid var(--color-hairline)' } }}
        >
          {guideBody}
        </Drawer>
      ) : (
        <Modal
          title="牧哲学堂家长端使用指南"
          open
          onCancel={closeGuide}
          footer={null}
          width={600}
          destroyOnHidden
        >
          {guideBody}
        </Modal>
      ))}
    </>
  )
}
