'use client'

import useSWR from 'swr'
import Link from 'next/link'
import {
  CalendarOutlined,
  CoffeeOutlined,
  CompassOutlined,
  CrownOutlined,
  DollarOutlined,
  FileDoneOutlined,
  RightOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { ServiceOverviewPage } from '@/components/Services/ServiceOverviewPage'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TeacherServicesPage() {
  const { data: dashData } = useSWR('/api/teacher/dashboard', fetcher)
  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const theme = TIER_THEME[currentTier]
  const teacher = dashData?.teacher

  const quickServices = [
    {
      title: '今日就餐上报',
      desc: '班级学员用餐意向与米饭分量登记',
      href: '/teacher/meals',
      icon: <CoffeeOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
      shadow: '0 4px 12px rgba(217, 119, 6, 0.28)',
      badge: '每日必填',
    },
    {
      title: '薪酬与成长福利',
      desc: '月度课时费流水、计提明细与梯队特权',
      href: '/teacher/compensation',
      icon: <DollarOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
      shadow: '0 4px 12px rgba(5, 150, 105, 0.28)',
      badge: '透明即结',
    },
    {
      title: '请假与代课审批',
      desc: '学员假条审核、调课与考勤同步',
      href: '/teacher/leave',
      icon: <CalendarOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
      shadow: '0 4px 12px rgba(37, 99, 235, 0.28)',
      badge: '教务协同',
    },
    {
      title: '课堂考勤录入',
      desc: '课后即时出勤勾选与课时自动计提',
      href: '/teacher/attendance',
      icon: <FileDoneOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
      shadow: '0 4px 12px rgba(124, 58, 237, 0.28)',
      badge: '课后即提',
    },
  ]

  return (
    <div className="teacher-services-page" style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 沉浸式梯队主题 Hero 看板（东方雅致暗纹 + 双层光晕 + 彻底修复深色文本对比度） */}
      <section
        className={`services-hero-card teacher-dashboard-hero--${currentTier.toLowerCase()}`}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 20,
          background: theme.heroBg,
          border: theme.border,
          boxShadow: theme.shadow,
          padding: '22px 20px 20px',
          color: '#ffffff',
        }}
      >
        {/* 梯队专属东方暗纹 */}
        {theme.patternType === 'elite' ? (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.065, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <pattern id="svc-pattern-elite" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M14 0 L28 14 L14 28 L0 14 Z" fill="none" stroke="#F6E9C8" strokeWidth="0.8" />
                <circle cx="14" cy="14" r="3.5" fill="none" stroke="#C9A45C" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#svc-pattern-elite)" />
          </svg>
        ) : theme.patternType === 'senior' ? (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <pattern id="svc-pattern-senior" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M0 16 Q16 0 32 16 Q16 32 0 16 Z" fill="none" stroke="#FDE68A" strokeWidth="0.85" />
                <circle cx="16" cy="16" r="2.5" fill="#F59E0B" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#svc-pattern-senior)" />
          </svg>
        ) : theme.patternType === 'experienced' ? (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.065, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <pattern id="svc-pattern-experienced" width="32" height="22" patternUnits="userSpaceOnUse">
                <path d="M0 11 Q8 0 16 11 T32 11" fill="none" stroke="#38BDF8" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#svc-pattern-experienced)" />
          </svg>
        ) : (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.065, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <pattern id="svc-pattern-new" width="28" height="20" patternUnits="userSpaceOnUse">
                <path d="M0 10 Q7 0 14 10 T28 10" fill="none" stroke="#4ADE80" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#svc-pattern-new)" />
          </svg>
        )}

        {/* 顶部环境漫射流光 */}
        <div
          style={{
            position: 'absolute',
            top: '-40%',
            right: '-15%',
            width: 260,
            height: 260,
            background: `radial-gradient(circle, ${theme.glowColor}, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 标签栏 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 750,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: theme.badgeBg,
                  color: theme.badgeColor,
                  border: theme.badgeBorder,
                  boxShadow: theme.badgeShadow,
                  letterSpacing: '0.02em',
                }}
              >
                {theme.roleTag || theme.name}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11.5,
                  color: 'rgba(255, 255, 255, 0.92)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.16)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <CrownOutlined style={{ fontSize: 11 }} />
                <span>教师综合服务与教务支持</span>
              </span>
            </div>

            {/* 大标题：采用高对比纯白金箔字，杜绝被黑字覆盖 */}
            <h1
              style={{
                margin: '6px 0 6px',
                color: '#FFFFFF',
                fontSize: 'clamp(21px, 4.2vw, 26px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
              }}
            >
              服务与个人中心
            </h1>

            {/* 描述语 */}
            <p
              style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.88)',
                fontSize: 12.5,
                lineHeight: 1.55,
                maxWidth: 680,
                letterSpacing: '0.01em',
              }}
            >
              日常教务便捷办理 · 个人权益透明可查 · 学堂 9 大课程与成长产品全景手册
            </p>
          </div>

          {/* 教师个人专属名士头像卡 */}
          {teacher && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  padding: 2,
                  background: 'rgba(255, 255, 255, 0.22)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow: theme.avatarHalo,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.id)}
                  alt={teacher.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center 18%',
                    display: 'block',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                {teacher.name}
              </span>
            </div>
          )}
        </div>

        {/* 底部立志名言与服务承诺条 */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 11.5,
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          <span>{theme.motto}</span>
          <span style={{ opacity: 0.75, whiteSpace: 'nowrap' }}>牧哲学堂 · 师者道也</span>
        </div>
      </section>

      {/* 个人高频业务直达卡片矩阵（白玉微晶浮岛 + 3D 琉璃微拟物彩色图标） */}
      <section aria-label="高频教务办理" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
          <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 750, color: '#1A1201', letterSpacing: '-0.01em' }}>
            常用教务直达
          </h2>
          <span style={{ fontSize: 11.5, color: '#8C7E6A' }}>快速流转 · 即时计提</span>
        </div>

        <div className="quick-services-grid">
          {quickServices.map((svc) => (
            <Link key={svc.href} href={svc.href} className="quick-service-card">
              <div
                className="service-icon-box"
                style={{
                  background: svc.bg,
                  color: svc.color,
                  boxShadow: svc.shadow,
                }}
              >
                {svc.icon}
              </div>
              <div className="service-content">
                <div className="service-title-row">
                  <span className="service-title">{svc.title}</span>
                  <span className="service-pill-tag">{svc.badge}</span>
                </div>
                <div className="service-desc">{svc.desc}</div>
              </div>
              <div className="service-arrow-bubble">
                <RightOutlined style={{ fontSize: 10 }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 牧哲学堂对外服务与产品手册大厅（嵌入模式：去除突兀嵌套标题，与页面浑然一体） */}
      <section className="catalog-section" aria-label="学堂课程与规划产品矩阵">
        <div className="catalog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                fontSize: 14,
              }}
            >
              <CompassOutlined />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1A1201', letterSpacing: '-0.01em' }}>
                学堂课程与规划产品矩阵
              </h3>
              <span style={{ fontSize: 11.5, color: '#8C7E6A', display: 'block', marginTop: 1 }}>
                校区辅导班型 · 晚托晚自习 · 升学规划政策全景手册
              </span>
            </div>
          </div>
        </div>

        {/* 传入 hideHeader={true} 彻底消除原“业务总览 / 全部业务”的重复嵌套 */}
        <ServiceOverviewPage basePath="/teacher/services" hideHeader />
      </section>

      <style jsx>{`
        .quick-services-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 520px) {
          .quick-services-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }

        .quick-service-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid rgba(20, 87, 77, 0.08);
          background: linear-gradient(180deg, #FFFFFF 0%, #FAF8F4 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 2px 8px rgba(20, 60, 50, 0.04);
          text-decoration: none;
          color: inherit;
          user-select: none;
          transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .quick-service-card:hover {
          transform: translateY(-2px);
          border-color: rgba(20, 87, 77, 0.18);
          box-shadow: inset 0 1px 0 #FFFFFF, 0 6px 18px rgba(20, 87, 77, 0.09);
        }

        .quick-service-card:active {
          transform: scale(0.975);
        }

        .service-icon-box {
          position: relative;
          overflow: hidden;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .service-icon-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 45%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 100%);
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          pointer-events: none;
        }

        .quick-service-card:hover .service-icon-box {
          transform: scale(1.06);
        }

        .service-content {
          flex: 1;
          min-width: 0;
        }

        .service-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 2px;
        }

        .service-title {
          font-size: 14px;
          font-weight: 750;
          color: #123C35;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .service-pill-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(20, 87, 77, 0.08);
          color: #14574D;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .service-desc {
          font-size: 11.5px;
          color: #8C7E6A;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .service-arrow-bubble {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(20, 87, 77, 0.05);
          color: #B5A895;
          flex-shrink: 0;
          transition: background 0.16s ease, color 0.16s ease, transform 0.16s ease;
        }

        .quick-service-card:hover .service-arrow-bubble {
          background: rgba(20, 87, 77, 0.12);
          color: #14574D;
          transform: translateX(2px);
        }

        .catalog-section {
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid rgba(20, 87, 77, 0.08);
          padding: 20px;
          box-shadow: 0 2px 10px rgba(20, 60, 50, 0.03);
        }

        .catalog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(20, 87, 77, 0.06);
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}
