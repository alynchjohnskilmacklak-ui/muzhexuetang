'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"
          fill="rgba(232,117,69,0.15)"
          stroke="#E87545"
          strokeWidth="1.4"
        />
        <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="#E87545" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: 'rgba(232,117,69,0.18)',
    title: '985/211硕士师资',
    desc: '全体老师均为985/211硕士，支持学信网实名核实资质',
    badge: '资质可查',
    badgeStyle: {
      background: 'rgba(232,117,69,0.12)',
      color: '#E87545',
      border: '1px solid rgba(232,117,69,0.25)',
    },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="#0d9e82" strokeWidth="1.4" fill="rgba(13,158,130,0.1)" />
        <path d="M5 8h10M5 11h6" stroke="#0d9e82" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    iconBg: 'rgba(13,158,130,0.18)',
    title: '自主研发管理系统',
    desc: '三端全覆盖，数据透明，家长实时查看孩子上课状态',
    badge: null,
    badgeStyle: null,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2l1.9 4.78L17 7.64l-3.55 3.39.84 4.79L10 13.5l-4.29 2.32.84-4.79L3 7.64l5.1-.86L10 2z"
          fill="rgba(150,120,255,0.15)"
          stroke="#a080f0"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconBg: 'rgba(180,150,255,0.15)',
    title: '新乐唯一志愿模拟',
    desc: '专为新乐市学生定制，整合一分一档数据，完全免费',
    badge: '✦ 新乐独家',
    badgeStyle: {
      background: 'rgba(160,128,240,0.15)',
      color: '#a080f0',
      border: '1px solid rgba(160,128,240,0.3)',
    },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2v16M2 10h16" stroke="#f5a623" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="10" r="7" stroke="#f5a623" strokeWidth="1.4" fill="rgba(245,166,35,0.08)" />
      </svg>
    ),
    iconBg: 'rgba(245,166,35,0.15)',
    title: '全新乐最低价格',
    desc: '透明定价，无二次收费，所有教辅教材费用全含',
    badge: '无隐性消费',
    badgeStyle: {
      background: 'rgba(245,166,35,0.12)',
      color: '#d48806',
      border: '1px solid rgba(245,166,35,0.25)',
    },
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"
          fill="rgba(232,117,69,0.15)"
          stroke="#E87545"
          strokeWidth="1.4"
        />
        <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="#E87545" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: 'rgba(232,117,69,0.18)',
    title: '每班10人·至少3名老师全程陪伴',
    desc: '没有学不会的学生，只有不会教的老师。从初一到中考，牧哲学堂只专注你的孩子',
    badge: null,
    badgeStyle: null,
  },
]

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'logo' | 'features'>('logo')
  const [shownFeatures, setShownFeatures] = useState<number[]>([])
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('features'), 1600)
    const t2 = setTimeout(() => {
      setExiting(true)
      setTimeout(onDone, 600)
    }, 4000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  useEffect(() => {
    if (phase !== 'features') return
    FEATURES.slice(0, 4).forEach((_, i) => {
      setTimeout(() => setShownFeatures((prev) => [...prev, i]), i * 110 + 60)
    })
    setTimeout(() => setShownFeatures((prev) => [...prev, 4]), 4 * 110 + 60 + 180)
  }, [phase])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'linear-gradient(145deg,#fffaf6 0%,#fff2e8 38%,#ffe0c7 72%,#fff8f0 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: phase === 'features' ? 'flex-start' : 'center',
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.6s ease',
      overflow: phase === 'features' ? 'auto' : 'hidden',
      padding: phase === 'features' ? '32px 0 28px' : '20px 0',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(ellipse at 28% 34%,rgba(232,117,69,0.22) 0%,transparent 58%),
          radial-gradient(ellipse at 78% 70%,rgba(240,154,91,0.2) 0%,transparent 55%)
        `,
      }} />

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        width: '100%',
        transformOrigin: 'left center',
        background: 'linear-gradient(90deg,#E87545,#0d9e82)',
        animation: 'splashProg 4s linear forwards',
        willChange: 'transform',
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        transition: 'transform 0.75s cubic-bezier(0.4,0,0.2,1), margin 0.75s ease',
        transform: 'scale(1)',
        marginBottom: 12,
        animation: 'splashLogoIn 0.85s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
      }} className={phase === 'features' ? 'splash-logo-block splash-logo-block-features' : 'splash-logo-block'}>
        <div className="splash-logo-mark" style={{ position: 'relative', width: 'clamp(136px, 18vw, 168px)', height: 'clamp(136px, 18vw, 168px)', filter: 'drop-shadow(0 0 16px rgba(232,117,69,0.25))' }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: '1px solid rgba(232,117,69,0.22)',
            animation: 'splashRing 2s ease 0.9s infinite',
            pointerEvents: 'none',
            willChange: 'transform, opacity',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: '1px solid rgba(13,158,130,0.16)',
            animation: 'splashRing 2s ease 1.5s infinite',
            pointerEvents: 'none',
            willChange: 'transform, opacity',
          }} />
          <Image
            src="/UI_picture/logo.png"
            alt="牧哲学堂"
            fill
            sizes="(max-width: 767px) 136px, 168px"
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        <div style={{
          fontSize: 46,
          fontWeight: 800,
          letterSpacing: 9,
          background: 'linear-gradient(135deg,#6f2c12 20%,#E87545 55%,#F09A5B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'splashFadeUp 0.55s ease 0.9s both',
          transition: 'opacity 0.3s, max-height 0.3s',
        }} className="splash-brand-title">
          牧哲学堂
        </div>
        <div style={{
          width: 80,
          height: 1,
          background: 'linear-gradient(90deg,transparent,#E87545 40%,#0d9e82 60%,transparent)',
          animation: 'splashLineIn 0.5s ease 1.3s both',
          transition: 'opacity 0.3s, max-height 0.3s',
        }} />
        <div style={{
          fontSize: 14,
          color: 'rgba(111,44,18,0.58)',
          letterSpacing: 8,
          animation: 'splashFadeUp 0.45s ease 1.15s both',
          transition: 'opacity 0.3s, max-height 0.3s',
        }} className="splash-brand-en">
          M O R E J O Y
        </div>
        <div style={{
          fontSize: 14,
          color: 'rgba(111,44,18,0.42)',
          letterSpacing: 2,
          animation: 'splashFadeUp 0.45s ease 1.6s both',
          transition: 'opacity 0.3s, max-height 0.3s',
        }} className="splash-brand-slogan">
          在思想的原野上，放牧星辰
        </div>
      </div>

      {phase === 'features' && (
        <div style={{
          width: '100%',
          maxWidth: 500,
          padding: '0 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}>
            {FEATURES.slice(0, 4).map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '11px 12px 10px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.88)',
                  border: '1px solid rgba(232,117,69,0.12)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  willChange: 'transform, opacity',
                  opacity: shownFeatures.includes(i) ? 1 : 0,
                  transform: shownFeatures.includes(i)
                    ? 'translateY(0) scale(1)'
                    : 'translateY(16px) scale(0.96)',
                  transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.2,0.64,1)',
                }}
              >
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  flexShrink: 0,
                  background: f.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {f.icon}
                </div>

                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#3d2010',
                  lineHeight: 1.35,
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'rgba(61,32,16,0.55)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {f.desc}
                </div>
                {f.badge && (
                  <div style={{
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 6,
                    marginTop: 'auto',
                    ...(f.badgeStyle as React.CSSProperties),
                  }}>
                    {f.badge}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            padding: '11px 14px',
            borderRadius: 16,
            background: 'linear-gradient(135deg,rgba(255,255,255,0.9) 0%,rgba(255,242,232,0.88) 100%)',
            border: '1px solid rgba(232,117,69,0.18)',
            boxShadow: '0 2px 12px rgba(232,117,69,0.07)',
            willChange: 'transform, opacity',
            opacity: shownFeatures.includes(4) ? 1 : 0,
            transform: shownFeatures.includes(4)
              ? 'translateY(0) scale(1)'
              : 'translateY(16px) scale(0.96)',
            transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.2,0.64,1)',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              flexShrink: 0,
              background: 'rgba(232,117,69,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="3"
                  fill="rgba(232,117,69,0.25)" stroke="#E87545" strokeWidth="1.4"/>
                <path d="M10 1v3M10 16v3M1 10h3M16 10h3
                         M3.22 3.22l2.12 2.12M14.66 14.66l2.12 2.12
                         M3.22 16.78l2.12-2.12M14.66 5.34l2.12-2.12"
                  stroke="#E87545" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#E87545',
                marginBottom: 3,
                lineHeight: 1.3,
              }}>
                每班10人 · 至少3名老师全程陪伴
              </div>
              <div style={{
                fontSize: 12,
                color: 'rgba(61,32,16,0.55)',
                lineHeight: 1.5,
              }}>
                没有学不会的学生，只有不会教的老师
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes splashLogoIn {
          from { opacity:0; transform:scale(0.3); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes splashFadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes splashLineIn {
          from { opacity:0; transform:scaleX(0); }
          to   { opacity:1; transform:scaleX(1); }
        }
        @keyframes splashRing {
          0%   { transform: translate(-50%,-50%) scale(0.46); opacity:0.7; }
          100% { transform: translate(-50%,-50%) scale(1);    opacity:0; }
        }
        @keyframes splashProg {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}
