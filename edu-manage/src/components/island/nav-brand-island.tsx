'use client'

import { useEffect, useState, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseOutlined,
  CommentOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  HourglassOutlined,
  ReadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  TrophyFilled,
  UpOutlined,
} from '@ant-design/icons'

export type PortalRole = 'parent' | 'teacher' | 'admin'

export interface NavBrandIslandProps {
  title?: string
  roleLabel?: string
  userRole?: string
  onRoleClick?: () => void
  className?: string
  defaultActivity?: string | null
  compact?: boolean
}

function LivingDot({ color = '#32D74B' }: { color?: string }) {
  const pulseClass =
    color === '#32D74B'
      ? 'island-dot-pulse-green'
      : color === '#EF4444'
        ? 'island-dot-pulse-red'
        : 'island-dot-pulse-gold'

  return (
    <span
      className={pulseClass}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        position: 'relative',
        flexShrink: 0,
      }}
    />
  )
}

interface ActivityScenario {
  id: string
  role: PortalRole
  badgePillText: string
  compactPillText?: string
  pillSubText: string
  compactSubText?: string
  badgeColor?: string
  accentColor?: string
  icon: ReactNode
  messageType: string
  messageTime: string
  messageTitle: string
  messageBody: string
  action: {
    label: string
    onClick: () => void
  }
}

export function NavBrandIsland({
  title = '牧哲学堂',
  roleLabel = '家长端',
  userRole,
  className,
  defaultActivity,
  compact = false,
}: NavBrandIslandProps) {
  const router = useRouter()

  // Determine portal role
  const portalRole: PortalRole =
    roleLabel?.includes('教师') || userRole === 'teacher'
      ? 'teacher'
      : roleLabel?.includes('管理') || userRole === 'admin'
        ? 'admin'
        : 'parent'

  // Default scenario for each role
  const initialScenarioId =
    defaultActivity ||
    (portalRole === 'teacher'
      ? 'teacher_teaching'
      : portalRole === 'admin'
        ? 'admin_campus'
        : 'parent_lesson')

  const [stackIndex, setStackIndex] = useState<number>(0)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [dragOffset, setDragOffset] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartX = useRef<number>(0)
  const currentDragX = useRef<number>(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSwell, setIsSwell] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto close on escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // 3-Portal Message Scenarios (纯粹消息呈现：类型、时间、正文与跳转)
  // ─────────────────────────────────────────────────────────────
  const scenarios: Record<string, ActivityScenario> = {
    // ════════════════════════════════════════════════════════════
    // 👨‍👩‍👧 家长端（Parent）：课时账户、上课动态、捷报与家校留言
    // ════════════════════════════════════════════════════════════
    parent_hour: {
      id: 'parent_hour',
      role: 'parent',
      badgePillText: '课时消耗与剩余预警',
      compactPillText: '课时预警',
      pillSubText: '余3课时',
      compactSubText: '余3h',
      badgeColor: '#D6B45B',
      accentColor: '#E8784A',
      icon: <HourglassOutlined style={{ color: '#D6B45B', fontSize: 13 }} />,
      messageType: '课时账户变动提醒',
      messageTime: '刚刚',
      messageTitle: '初二数学尖子班已核销 2.0 课时',
      messageBody:
        '马子墨今日 16:00-18:00 的初二数学尖子培优班已完成考勤核销。当前账户在读剩余 3.0 课时，已低于安全课时线。建议提前预约保留原班原座，避免寒春学位释放。',
      action: {
        label: '查看课时账单与续费明细 ›',
        onClick: () => {
          router.push('/parent/fees')
          setIsExpanded(false)
        },
      },
    },

    parent_lesson: {
      id: 'parent_lesson',
      role: 'parent',
      badgePillText: '初二数学培优中',
      compactPillText: '数学培优中',
      pillSubText: '余25m',
      compactSubText: '25m',
      badgeColor: '#D6B45B',
      accentColor: '#32D74B',
      icon: <LivingDot color="#32D74B" />,
      messageType: '课堂授课进行中',
      messageTime: '预计 17:30 准时下课',
      messageTitle: '初二数学 · 尖子培优班上课中',
      messageBody:
        '胡思彤老师正在讲授二次函数定值极值与几何综合解析。马子墨课堂专注敏思，已攻克 2 道重点题。助教将在下课后护送孩子至校区接送大堂。',
      action: {
        label: '查看孩子今日课表与提纲 ›',
        onClick: () => {
          router.push('/parent/schedule')
          setIsExpanded(false)
        },
      },
    },

    parent_feedback: {
      id: 'parent_feedback',
      role: 'parent',
      badgePillText: '随堂测验满分捷报',
      compactPillText: '测验满分捷报',
      pillSubText: '100分',
      compactSubText: '100分',
      badgeColor: '#F59E0B',
      accentColor: '#F59E0B',
      icon: <TrophyFilled style={{ color: '#F59E0B', fontSize: 13 }} />,
      messageType: '随堂测验满分捷报',
      messageTime: '今日 16:40 发布',
      messageTitle: '马子墨在解析几何随堂诊断中荣获满分 100 分',
      messageBody:
        '胡思彤老师评语：“子墨今天课堂专注度评级 A+，辅助线构造严谨规范，不仅按时完成了拓展题，还主动为同桌讲解难题解题思路。”',
      action: {
        label: '查看完整学情诊断报告 ›',
        onClick: () => {
          router.push('/parent/growth')
          setIsExpanded(false)
        },
      },
    },

    parent_message: {
      id: 'parent_message',
      role: 'parent',
      badgePillText: '任课教师新留言',
      compactPillText: '任课老师留言',
      pillSubText: '刚刚',
      compactSubText: '刚刚',
      badgeColor: '#34D399',
      accentColor: '#34D399',
      icon: <CommentOutlined style={{ color: '#34D399', fontSize: 13 }} />,
      messageType: '家校沟通新留言',
      messageTime: '10分钟前',
      messageTitle: '胡思彤老师给您发送了一条教学留言',
      messageBody:
        '“家长您好，今天孩子课上专注度非常高，二次函数定点公式理解透彻，周末作业与配套拓展训练已整理入库，请查阅。”',
      action: {
        label: '立即回复胡老师 ›',
        onClick: () => {
          router.push('/parent/messages')
          setIsExpanded(false)
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // 👨‍🏫 教师端（Teacher）：点名待办、候课提醒、学情撰写与问答
    // ════════════════════════════════════════════════════════════
    teacher_teaching: {
      id: 'teacher_teaching',
      role: 'teacher',
      badgePillText: '初二尖子1班 · 授课中',
      compactPillText: '尖子1班·授课',
      pillSubText: '余25m',
      compactSubText: '25m',
      badgeColor: '#D6B45B',
      accentColor: '#32D74B',
      icon: <LivingDot color="#32D74B" />,
      messageType: '教学履约待办',
      messageTime: '进行中 · 预计17:30下课',
      messageTitle: '初二尖子1班已授课 65 分钟，待记录随堂表现',
      messageBody:
        '201 多媒体教室应到 12 人、实到 12 人（全勤）。教务提醒：请于下课前完成随堂快速点名与课堂互动表现记录。',
      action: {
        label: '随堂快速点名 / 记课堂表现 ›',
        onClick: () => {
          router.push('/teacher/attendance')
          setIsExpanded(false)
        },
      },
    },

    teacher_countdown: {
      id: 'teacher_countdown',
      role: 'teacher',
      badgePillText: '下节课候课 · 距开课45m',
      compactPillText: '下节培优候课',
      pillSubText: '18:30',
      compactSubText: '18:30',
      badgeColor: '#D6B45B',
      accentColor: '#D6B45B',
      icon: <ClockCircleOutlined style={{ color: '#D6B45B', fontSize: 13 }} />,
      messageType: '候课准备提醒',
      messageTime: '距开课 45 分钟',
      messageTitle: '高中数学冲刺1班将于 18:30 在 301 阶梯教室开课',
      messageBody:
        '选课学员 16 人全部确认到校。多媒体课件已载入备课中心，随堂讲义 16 份已送达讲台，请提前 15 分钟候课。',
      action: {
        label: '预览备课教案与学员名册 ›',
        onClick: () => {
          router.push('/teacher/schedule')
          setIsExpanded(false)
        },
      },
    },

    teacher_feedback_todo: {
      id: 'teacher_feedback_todo',
      role: 'teacher',
      badgePillText: '课后学情待撰写',
      compactPillText: '课后学情待写',
      pillSubText: '12份',
      compactSubText: '12份',
      badgeColor: '#F59E0B',
      accentColor: '#F59E0B',
      icon: <ReadOutlined style={{ color: '#F59E0B', fontSize: 13 }} />,
      messageType: '课后学情交付待办',
      messageTime: '今晚 19:30 质检截止',
      messageTitle: '初二尖子1班 12 份个性化学情诊断待录入',
      messageBody:
        '今日 17:30 课程已完课，质检督导抽检截止今晚 19:30。请及时录入随堂评价，系统已准备精选评语库可快速选用。',
      action: {
        label: '立即录入学情评语 ›',
        onClick: () => {
          router.push('/teacher/feedback')
          setIsExpanded(false)
        },
      },
    },

    teacher_inquiry: {
      id: 'teacher_inquiry',
      role: 'teacher',
      badgePillText: '家长留言咨询',
      compactPillText: '家长留言待回',
      pillSubText: '2条待回',
      compactSubText: '2条',
      badgeColor: '#34D399',
      accentColor: '#34D399',
      icon: <CommentOutlined style={{ color: '#34D399', fontSize: 13 }} />,
      messageType: '家校问答咨询',
      messageTime: '10分钟前',
      messageTitle: '马紫晨家长咨询：“第14题极值问能发导图吗？”',
      messageBody:
        '来自初二数学培优班，家长咨询周末拓展作业解法。建议在 15 分钟内给予专业解答，提升家校协同满意度。',
      action: {
        label: '立即回复家长留言 ›',
        onClick: () => {
          router.push('/teacher/messages')
          setIsExpanded(false)
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // 🏛️ 管理端（Admin）：巡课大盘、质检督导、经营续费与时序
    // ════════════════════════════════════════════════════════════
    admin_campus: {
      id: 'admin_campus',
      role: 'admin',
      badgePillText: '校区运行大盘 · 18堂开课',
      compactPillText: '校区大盘·18堂',
      pillSubText: '98.6%出勤',
      compactSubText: '98.6%',
      badgeColor: '#D6B45B',
      accentColor: '#32D74B',
      icon: <TeamOutlined style={{ color: '#D6B45B', fontSize: 13 }} />,
      messageType: '校区运行监控',
      messageTime: '实时大盘',
      messageTitle: '晚间黄金授课档：全校 18 间教室全开，到课率 98.6%',
      messageBody:
        '当前时段 18 个班级教学秩序井然，在校学员 142 人，安保巡视与通风消杀正常，预计今日核销 36.5 课时。',
      action: {
        label: '进入校区实时大盘 ›',
        onClick: () => {
          router.push('/dashboard')
          setIsExpanded(false)
        },
      },
    },

    admin_renewal: {
      id: 'admin_renewal',
      role: 'admin',
      badgePillText: '低课时续费预警',
      compactPillText: '低课时续费池',
      pillSubText: '5人待跟进',
      compactSubText: '5人',
      badgeColor: '#D6B45B',
      accentColor: '#E8784A',
      icon: <ExclamationCircleOutlined style={{ color: '#D6B45B', fontSize: 13 }} />,
      messageType: '经营续费预警',
      messageTime: '今日待办',
      messageTitle: '初中部 5 名学员剩余课时 ≤ 4 课时，进入续费预警池',
      messageBody:
        '马子墨、李明等学员预期续费总额 ¥48,000。已推送到学管师跟进公海，历史续约转化率 92%，请关注跟进进度。',
      action: {
        label: '查看续费预警名单 ›',
        onClick: () => {
          router.push('/students')
          setIsExpanded(false)
        },
      },
    },

    admin_quality: {
      id: 'admin_quality',
      role: 'admin',
      badgePillText: '教学质检待审核',
      compactPillText: '教学质检待审',
      pillSubText: '3项待办',
      compactSubText: '3项',
      badgeColor: '#F59E0B',
      accentColor: '#F59E0B',
      icon: <SafetyCertificateOutlined style={{ color: '#F59E0B', fontSize: 13 }} />,
      messageType: '教学质检中心',
      messageTime: '3份待审',
      messageTitle: '胡老师、李老师已提交完课学情诊断报告',
      messageBody:
        '本周抽检率 100%。质检通过后将自动下发家长端。请抽查评语个性化程度与随堂表现评级。',
      action: {
        label: '进入教学质检审核中心 ›',
        onClick: () => {
          router.push('/dashboard')
          setIsExpanded(false)
        },
      },
    },

    admin_conflict: {
      id: 'admin_conflict',
      role: 'admin',
      badgePillText: '教室排课冲突预警',
      compactPillText: '教室冲突预警',
      pillSubText: '202室紧凑',
      compactSubText: '202室',
      badgeColor: '#EF4444',
      accentColor: '#EF4444',
      icon: <CalendarOutlined style={{ color: '#EF4444', fontSize: 13 }} />,
      messageType: '运力安全排查',
      messageTime: '紧急排查',
      messageTitle: '202 多媒体教室课间交接仅 10 分钟',
      messageBody:
        '下节课有 16 人大班进驻，已提醒楼层值班助教做好快速通风与清场，请保持调度关注。',
      action: {
        label: '调整教室与时序 ›',
        onClick: () => {
          router.push('/schedule')
          setIsExpanded(false)
        },
      },
    },
  }

  // Get current portal scenarios list for stacked deck
  const currentRoleScenarios = Object.values(scenarios).filter(
    (s) => s.role === portalRole,
  )
  const totalCards = currentRoleScenarios.length

  // Current active scenario and underlying stack cards
  const currentScenario =
    currentRoleScenarios[stackIndex] || currentRoleScenarios[0] || scenarios.parent_lesson
  const card1 = currentRoleScenarios[(stackIndex + 1) % totalCards]
  const card2 = currentRoleScenarios[(stackIndex + 2) % totalCards]

  const dismissCard = (direction: 'left' | 'right' = 'right') => {
    if (exitDirection) return
    setExitDirection(direction)
    setTimeout(() => {
      setStackIndex((prev) => (prev + 1) % totalCards)
      setExitDirection(null)
      setDragOffset(0)
      setIsDragging(false)
    }, 280)
  }

  const prevCard = () => {
    if (exitDirection) return
    setExitDirection('left')
    setTimeout(() => {
      setStackIndex((prev) => (prev - 1 + totalCards) % totalCards)
      setExitDirection(null)
      setDragOffset(0)
      setIsDragging(false)
    }, 280)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement)?.closest('button')) return
    dragStartX.current = e.clientX
    currentDragX.current = e.clientX
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartX.current
    currentDragX.current = e.clientX
    setDragOffset(dx)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    const offset = dragOffset
    setIsDragging(false)
    if (offset > 55) {
      dismissCard('right')
    } else if (offset < -55) {
      dismissCard('left')
    } else {
      setDragOffset(0)
    }
  }

  const handlePointerCancel = () => {
    setIsDragging(false)
    setDragOffset(0)
  }

  const handleCardButtonClick = (actionFn: () => void) => {
    if (Math.abs(dragOffset) > 8) return
    actionFn()
  }

  const handlePillClick = () => {
    setIsSwell(true)
    setTimeout(() => setIsSwell(false), 240)

    if (isExpanded) {
      // 再次点击灵动岛：收回展开卡片
      setIsExpanded(false)
    } else {
      // 点击展开卡片
      setIsExpanded(true)
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`nav-brand-island-container ${className || ''}`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        {/* ── Top Capsule Pill in Header (墨玉流金 · 呼吸微光 · 灵动交互) ── */}
        <button
          type="button"
          onClick={handlePillClick}
          aria-expanded={isExpanded}
          aria-label={`${currentScenario.badgePillText}，点击${isExpanded ? '收起' : '展开'}卡片`}
          className="island-capsule-button"
          style={{
            all: 'unset',
            cursor: 'pointer',
            height: 33,
            padding: compact ? '0 8px' : '0 12px 0 10px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(13, 46, 40, 0.95) 0%, rgba(7, 26, 22, 0.98) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(214, 180, 91, 0.45)',
            boxShadow:
              '0 4px 14px rgba(4, 18, 15, 0.5), 0 0 10px rgba(214, 180, 91, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: compact ? 5 : 7,
            maxWidth: compact ? 188 : 236,
            transform: isSwell ? 'scale(0.96)' : 'scale(1)',
            position: 'relative',
            overflow: 'hidden',
            zIndex: isExpanded ? 1410 : 1,
          }}
        >
          {/* Subtle Glass Shimmer Light Sweep (流金微光扫掠) */}
          <span className="island-shimmer-sheen" aria-hidden="true" />

          {/* Living Icon / Status Dot */}
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, zIndex: 1 }}>
            {currentScenario.icon}
          </span>

          {/* Title Text */}
          <span
            style={{
              fontSize: compact ? 12 : 12.5,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '0.2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              zIndex: 1,
            }}
          >
            {compact
              ? currentScenario.compactPillText || currentScenario.badgePillText
              : currentScenario.badgePillText}
          </span>

          {/* SubText Pill Badge */}
          <span
            style={{
              fontSize: compact ? 10.5 : 11,
              fontWeight: 750,
              color: currentScenario.badgeColor || '#FFE29A',
              background: 'rgba(214, 180, 91, 0.22)',
              border: '1px solid rgba(214, 180, 91, 0.38)',
              padding: '1px 5px',
              borderRadius: 999,
              marginLeft: 'auto',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 1px rgba(0,0,0,0.4)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              zIndex: 1,
            }}
          >
            {compact
              ? currentScenario.compactSubText || currentScenario.pillSubText
              : currentScenario.pillSubText}
          </span>

          {/* Animated Chevron */}
          <span
            style={{
              fontSize: 9,
              color: 'rgba(214, 180, 91, 0.85)',
              marginLeft: 1,
              display: 'inline-flex',
              alignItems: 'center',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              flexShrink: 0,
              zIndex: 1,
            }}
          >
            <DownOutlined />
          </span>
        </button>
      </div>

      {/* ── Expanded Dropdown Card (Portalled to document.body, free from transformed ancestors) ── */}
      {mounted &&
        isExpanded &&
        createPortal(
          <>
            {/* Backdrop Blur Overlay */}
            <div
              onClick={() => setIsExpanded(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.58)',
                backdropFilter: 'blur(5px)',
                WebkitBackdropFilter: 'blur(5px)',
                zIndex: 1150,
                animation: 'navIslandFadeIn 0.25s ease',
              }}
            />

            {/* Floating Card Deck Container (灵动岛消息折叠空间 · 下层通知露出完整边缘) */}
            <div
              style={{
                position: 'fixed',
                top: 'calc(54px + env(safe-area-inset-top, 0px) + 6px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(calc(100vw - 24px), 396px)',
                boxSizing: 'border-box',
                zIndex: 1160,
                animation: 'navIslandSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                paddingBottom: 54,
              }}
            >
              {/* ── Stack Wrap Container (P10 纵深堆叠 + P25 堆叠补位) ── */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                }}
              >
                {/* ── Underlying Card 2 (第三层深度露边) ── */}
                {totalCards > 2 && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 16,
                      bottom: -46,
                      left: 14,
                      right: 14,
                      borderRadius: 18,
                      background: 'linear-gradient(155deg, #071C17 0%, #030D0B 100%)',
                      border: '1px solid rgba(214, 180, 91, 0.25)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
                      opacity: 0.55,
                      zIndex: 1,
                      pointerEvents: 'none',
                      transition: 'all 0.32s cubic-bezier(0.18, 1.25, 0.32, 1)',
                    }}
                  />
                )}

                {/* ── Underlying Card 1 (第二层通知露边，完整露出底部信息条，点击即展开) ── */}
                {totalCards > 1 && (
                  <div
                    onClick={() => dismissCard('right')}
                    role="button"
                    tabIndex={0}
                    aria-label={`下一条通知：${card1.messageTitle}，点击展开`}
                    style={{
                      position: 'absolute',
                      top: 8,
                      bottom: -32,
                      left: 7,
                      right: 7,
                      borderRadius: 18,
                      background: 'linear-gradient(155deg, #0A2F27 0%, #061C17 100%)',
                      border: '1.2px solid rgba(214, 180, 91, 0.45)',
                      boxShadow: '0 14px 34px rgba(0, 0, 0, 0.6), 0 0 14px rgba(214, 180, 91, 0.1)',
                      opacity: 0.92,
                      zIndex: 2,
                      cursor: 'pointer',
                      transition: 'all 0.32s cubic-bezier(0.18, 1.25, 0.32, 1)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Peeking Full Banner at the exposed bottom (露出的完整通知边) */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 32,
                        padding: '0 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(180deg, rgba(10, 47, 39, 0.98) 0%, rgba(6, 28, 23, 1) 100%)',
                        borderTop: '1px solid rgba(214, 180, 91, 0.28)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 11, color: '#D6B45B', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          {card1.icon}
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#F4EFE6',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {card1.messageTitle}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 750,
                          color: '#FFE29A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        <span>下一条</span>
                        <span style={{ fontSize: 10 }}>›</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Top Active Card (Offset 0，顶层消息卡片，纯粹消息呈现) ── */}
                <div
                  className="island-stack-top-card"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  style={{
                    position: 'relative',
                    zIndex: 5,
                    boxSizing: 'border-box',
                    background: 'linear-gradient(155deg, #0E342D 0%, #061A16 100%)',
                    border: '1.2px solid rgba(214, 180, 91, 0.45)',
                    borderRadius: 18,
                    padding: '16px 16px 15px',
                    color: '#FFFFFF',
                    boxShadow:
                      '0 20px 48px rgba(0, 0, 0, 0.65), 0 0 20px rgba(214, 180, 91, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                    transform: isDragging
                      ? `translate3d(${dragOffset}px, 0, 0) rotate(${dragOffset * 0.045}deg)`
                      : exitDirection === 'left'
                        ? 'translate3d(-125%, -10px, 0) rotate(-14deg)'
                        : exitDirection === 'right'
                          ? 'translate3d(125%, -10px, 0) rotate(14deg)'
                          : 'translate3d(0, 0, 0) scale(1)',
                    opacity: exitDirection ? 0 : 1,
                    transition: isDragging
                      ? 'none'
                      : 'transform 0.32s cubic-bezier(0.18, 1.25, 0.32, 1), opacity 0.26s ease',
                    touchAction: 'pan-y',
                    userSelect: 'none',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                >
                  {/* Top Bar inside Card: Left Message Type & Time | Right Close Button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          background: 'rgba(214, 180, 91, 0.16)',
                          border: '1px solid rgba(214, 180, 91, 0.32)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 12,
                          color: '#D6B45B',
                          flexShrink: 0,
                        }}
                      >
                        {currentScenario.icon}
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 750,
                          color: '#FFE29A',
                          letterSpacing: '0.2px',
                        }}
                      >
                        {currentScenario.messageType}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'rgba(255, 255, 255, 0.52)',
                        }}
                      >
                        · {currentScenario.messageTime}
                      </span>
                    </div>

                    {/* Close Button in Main Card's Top Right */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(false)
                      }}
                      aria-label="关闭消息"
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        width: 26,
                        height: 26,
                        minWidth: 26,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontSize: 11,
                        flexShrink: 0,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <CloseOutlined />
                    </button>
                  </div>

                  {/* Message Title (消息标题) */}
                  <h4
                    style={{
                      margin: '0 0 8px',
                      fontSize: 15,
                      fontWeight: 750,
                      color: '#FFFFFF',
                      lineHeight: 1.45,
                      letterSpacing: '0.2px',
                    }}
                  >
                    {currentScenario.messageTitle}
                  </h4>

                  {/* Message Body Content (消息正文) */}
                  <p
                    style={{
                      margin: '0 0 14px',
                      fontSize: 13,
                      color: 'rgba(255, 255, 255, 0.85)',
                      lineHeight: 1.6,
                      background: 'rgba(0, 0, 0, 0.22)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      padding: '10px 12px',
                    }}
                  >
                    {currentScenario.messageBody}
                  </p>

                  {/* Single Clean Jump Button (点击跳转) */}
                  <button
                    type="button"
                    onClick={() => {
                      currentScenario.action.onClick()
                    }}
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #18685C 0%, #104B42 100%)',
                      border: '1px solid rgba(214, 180, 91, 0.5)',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(16, 75, 66, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                      transition: 'transform 0.12s ease',
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <span>{currentScenario.action.label}</span>
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* Global CSS for Animations (呼吸微光、流金光晕、灵动弹出与微光扫掠) */}
      <style>{`
        /* Living Pulse for Green Active Dot (高亮在课/在线呼吸绿灯) */
        @keyframes islandDotPulseGreen {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(50, 215, 75, 0.75), 0 0 6px #32D74B;
          }
          50% {
            transform: scale(1.15);
            box-shadow: 0 0 0 4.5px rgba(50, 215, 75, 0), 0 0 12px #32D74B;
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(50, 215, 75, 0), 0 0 6px #32D74B;
          }
        }
        .island-dot-pulse-green {
          animation: islandDotPulseGreen 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* Living Pulse for Gold Dot (流金候课/大盘微光) */
        @keyframes islandDotPulseGold {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(214, 180, 91, 0.75), 0 0 6px #D6B45B;
          }
          50% {
            transform: scale(1.15);
            box-shadow: 0 0 0 4.5px rgba(214, 180, 91, 0), 0 0 12px #D6B45B;
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(214, 180, 91, 0), 0 0 6px #D6B45B;
          }
        }
        .island-dot-pulse-gold {
          animation: islandDotPulseGold 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* Living Pulse for Red Warning Dot (冲突/告警脉冲) */
        @keyframes islandDotPulseRed {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.75), 0 0 6px #EF4444;
          }
          50% {
            transform: scale(1.15);
            box-shadow: 0 0 0 4.5px rgba(239, 68, 68, 0), 0 0 12px #EF4444;
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 0 6px #EF4444;
          }
        }
        .island-dot-pulse-red {
          animation: islandDotPulseRed 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* Ambient Breathing Aura on the Capsule (墨玉流金胶囊边框与阴影呼吸) */
        @keyframes islandCapsuleAura {
          0%, 100% {
            border-color: rgba(214, 180, 91, 0.40);
            box-shadow: 0 4px 14px rgba(4, 18, 15, 0.5), 0 0 8px rgba(214, 180, 91, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          }
          50% {
            border-color: rgba(214, 180, 91, 0.76);
            box-shadow: 0 4px 18px rgba(4, 18, 15, 0.68), 0 0 16px rgba(214, 180, 91, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.28);
          }
        }
        .island-capsule-button {
          animation: islandCapsuleAura 3.6s ease-in-out infinite;
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .island-capsule-button:active {
          transform: scale(0.96) !important;
        }

        /* Silky Light Sheen Sweep across the capsule (微晶表面流金光泽掠过) */
        @keyframes islandSheenSweep {
          0% {
            transform: translateX(-160%) skewX(-25deg);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          42% {
            transform: translateX(260%) skewX(-25deg);
            opacity: 0;
          }
          100% {
            transform: translateX(260%) skewX(-25deg);
            opacity: 0;
          }
        }
        .island-shimmer-sheen {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          overflow: hidden;
          pointer-events: none;
        }
        .island-shimmer-sheen::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 55%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.12) 35%, rgba(214, 180, 91, 0.26) 65%, transparent 100%);
          animation: islandSheenSweep 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes navIslandSlideDown {
          0% {
            opacity: 0;
            transform: translate(-50%, -18px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes navIslandFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
