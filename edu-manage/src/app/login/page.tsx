'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { getSession, signIn } from 'next-auth/react'
import { Button, Checkbox, Input, Modal, Typography } from 'antd'
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  WarningFilled,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SplashScreen } from '@/components/SplashScreen'
import BrandBackground from '@/components/BrandBackground'
import { toast } from 'sonner'
import { BorderBeam, ShimmerButton } from '@/components/magicui'
import {
  clearLoginPreference,
  offerPasswordManagerSave,
  readLoginPreference,
  writeLoginPreference,
} from '@/lib/login-preferences'

const { Text } = Typography

type LoginRole = 'admin' | 'teacher' | 'parent'
type LoginDivision = 'JUNIOR' | 'SENIOR'
type LoginIdentifierType = 'email' | 'phone'

function inferLoginIdentifierType(value: string): LoginIdentifierType {
  let digits = value.trim().replace(/\D/g, '')
  if (digits.startsWith('0086') && digits.length === 15) digits = digits.slice(4)
  else if (digits.startsWith('86') && digits.length === 13) digits = digits.slice(2)
  return /^1[3-9]\d{9}$/.test(digits) ? 'phone' : 'email'
}

const DIVISION_OPTIONS: Array<{ value: LoginDivision; label: string }> = [
  { value: 'JUNIOR', label: '初中部' },
  { value: 'SENIOR', label: '高中部' },
]

const ROLE_OPTIONS: Array<{ value: LoginRole; label: string }> = [
  { value: 'admin', label: '管理者' },
  { value: 'teacher', label: '教师端' },
  { value: 'parent', label: '家长端' },
]

const PLACEHOLDER_MAP: Record<LoginRole, { email: string; pwd: string }> = {
  admin: { email: '请输入账号', pwd: '请输入密码' },
  teacher: { email: '请输入账号', pwd: '请输入密码' },
  parent: { email: '请输入账号', pwd: '请输入密码' },
}

const BUSINESS_SLIDES = [
  { src: '/services/seasonal-bootcamp/1.png', title: '寒暑假冲刺预备课', kicker: '集中学习 · 系统复习 · 查漏补缺', tag: '冲刺培优' },
  { src: '/services/one-to-one/1.png', title: '各年级一对一冲刺', kicker: '个性化定制 · 及时反馈 · 学情可视化', tag: '专属定制' },
  { src: '/services/evening-study/1.png', title: '晚间课业辅导营', kicker: '当天问题当天解决，学习过程看得见', tag: '课后托底' },
  { src: '/services/weekend-pioneer/1.png', title: '周末先锋营', kicker: '一周一清，周周领先', tag: '同步巩固' },
  { src: '/services/zhongkao-planning/1.png', title: '中考升学规划', kicker: '提前了解 · 科学定位 · 从容选择', tag: '升学指导' },
  { src: '/services/gaokao-consulting/1.png', title: '高考志愿咨询', kicker: '专业规划 · 多重审核 · 家庭放心', tag: '精准报考' },
  { src: '/services/single-enrollment/1.png', title: '单招文化课辅导', kicker: '小班精讲 · 高频考点 · 稳步提升', tag: '专项突破' },
  { src: '/services/postgraduate-public-courses/1.png', title: '考研公共课辅导', kicker: '系统精讲 · 真题训练 · 少走弯路', tag: '高阶深造' },
]

const SCHOOL_ADVANTAGES = [
  {
    icon: '🎯',
    title: '教学精准紧凑',
    desc: '紧贴考纲大纲与实际学情，直击必考常考易错点，不浪费学生一分钟。',
    tag: '靶向提分',
  },
  {
    icon: '👩‍🏫',
    title: '全员真实师资',
    desc: '授课教师全员持证上岗，线下大厅公示资质，学信网实名在线可查验。',
    tag: '资质透明',
  },
  {
    icon: '👥',
    title: '约10人精细小班',
    desc: '严格控制班级规模，每班配备至少4名老师全程陪学辅导、答疑督学。',
    tag: '全员关注',
  },
  {
    icon: '📱',
    title: '数字家校闭环',
    desc: '课堂互动、随堂提问与学情分析每节课即时触达家长，进度清晰透明。',
    tag: '过程可视',
  },
]

const ERROR_MESSAGES: Record<string, string> = {
  BAD_USERNAME: '账号不存在，请检查输入的账号是否正确',
  not_found: '账号不存在，请检查输入的账号是否正确',
  BAD_PASSWORD: '密码错误，请重新输入',
  wrong_password: '密码错误，请重新输入',
  BAD_ROLE: '身份选择不正确，请切换到对应的身份入口登录',
  BAD_DIVISION: '该账号不属于所选学部，请切换初中部/高中部后再登录',
  DISABLED: '该账号已被停用，请联系管理员',
  LOCKED: '密码连续输错次数过多，账号已临时锁定，请30分钟后重试',
  ACCOUNT_LOCKED: '该账号尝试次数过多，请15分钟后重试',
  RATE_LIMITED: '登录请求过于频繁，请稍后再试',
  uninitialized: '账号未初始化，请联系管理员创建账号',
  PARENT_TERM_EXPIRED: '登录信息已过期，请联系管理员',
  CredentialsSignin: '账号或密码不正确，请重新尝试',
  DB_UNAVAILABLE: '登录服务暂时不可用，可能是数据库连接中断，请稍后重试',
  Configuration: '登录服务暂时不可用，请稍后重试',
  INVALID_PHONE: '请输入有效的11位中国大陆手机号',
  AMBIGUOUS_PHONE: '该手机号关联多个账号，请使用邮箱/账号登录并联系管理员核对手机号绑定',
}

/* ── Module-level components ── */

function BusinessSlide({ activeSlide, mobile = false, preloadActive = false, deferImage = false, onSwipe }: { activeSlide: number; mobile?: boolean; preloadActive?: boolean; deferImage?: boolean; onSwipe?: (dir: 1 | -1) => void }) {
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })
  const [loadedSlides, setLoadedSlides] = useState<Record<number, boolean>>({})
  const [displayedSlide, setDisplayedSlide] = useState(activeSlide)

  useEffect(() => {
    if (loadedSlides[activeSlide]) setDisplayedSlide(activeSlide)
  }, [activeSlide, loadedSlides])

  return (
    <div
      className={mobile ? 'login-business-stage login-business-stage-mobile' : 'login-business-stage'}
      style={{ touchAction: 'pan-y', cursor: 'grab', userSelect: 'none' }}
      onPointerDown={(e) => { dragRef.current = { x: e.clientX, y: e.clientY, active: true } }}
      onPointerUp={(e) => {
        if (!dragRef.current.active) return
        dragRef.current.active = false
        const dx = e.clientX - dragRef.current.x
        const dy = e.clientY - dragRef.current.y
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) onSwipe?.(dx < 0 ? 1 : -1)
      }}
      onPointerCancel={() => { dragRef.current.active = false }}
      onPointerLeave={(e) => {
        if (!dragRef.current.active) return
        dragRef.current.active = false
        const dx = e.clientX - dragRef.current.x
        if (Math.abs(dx) > 40) onSwipe?.(dx < 0 ? 1 : -1)
      }}
    >
      <div className="login-business-glow" aria-hidden="true" />
      {!deferImage && BUSINESS_SLIDES.map((slide, index) => {
        const isActive = index === activeSlide
        const isDisplayed = index === displayedSlide
        // 渲染当前海报与前后紧邻海报，实现平滑无缝交叉淡入淡出（Crossfade）
        const shouldRender = isActive || isDisplayed || Math.abs(index - activeSlide) <= 1 ||
          (activeSlide === 0 && index === BUSINESS_SLIDES.length - 1) ||
          (activeSlide === BUSINESS_SLIDES.length - 1 && index === 0)
        if (!shouldRender) return null

        return (
          <div
            key={slide.src}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isDisplayed ? 1 : 0,
              transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isDisplayed ? 'auto' : 'none',
              zIndex: isDisplayed ? 2 : 1,
            }}
          >
            <Image
              src={slide.src}
              alt={`${slide.title}业务介绍`}
              fill
              unoptimized
              sizes={mobile ? '(max-width: 768px) calc(100vw - 24px), 50vw' : '50vw'}
              className="login-business-image"
              loading={isActive && preloadActive ? 'eager' : 'lazy'}
              priority={isActive && preloadActive}
              onLoad={() => setLoadedSlides((previous) => ({ ...previous, [index]: true }))}
            />
          </div>
        )
      })}
    </div>
  )
}

function SlideControls({ activeSlide, onChange, compact = false }: { activeSlide: number; onChange: (index: number) => void; compact?: boolean }) {
  return (
    <div className={compact ? 'login-slide-controls is-compact' : 'login-slide-controls'}>
      <span className="login-slide-count" aria-hidden="true">{String(activeSlide + 1).padStart(2, '0')}</span>
      <div className="login-slide-dots" aria-label="选择业务介绍图片">
        {BUSINESS_SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            className={index === activeSlide ? 'login-slide-dot is-active' : 'login-slide-dot'}
            aria-label={`查看${slide.title}`}
            aria-current={index === activeSlide ? 'true' : undefined}
            onClick={() => onChange(index)}
          />
        ))}
      </div>
      <span className="login-slide-count" aria-hidden="true">08</span>
    </div>
  )
}

function BrandLeft({ activeSlide, onSlideChange, onSwipe, preloadActive, deferImage, onHoverChange }: { activeSlide: number; onSlideChange: (index: number) => void; onSwipe?: (dir: 1 | -1) => void; preloadActive: boolean; deferImage: boolean; onHoverChange?: (paused: boolean) => void }) {
  const slide = BUSINESS_SLIDES[activeSlide]
  return (
    <section
      className="login-left login-business-panel"
      style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <BusinessSlide activeSlide={activeSlide} preloadActive={preloadActive} deferImage={deferImage} onSwipe={onSwipe} />
      <div className="login-business-shade" aria-hidden="true" />
      <div className="login-business-brand">
        <div className="login-business-eyebrow">八类业务 · 专业教育服务 · 不怕学浅，唯恐志短</div>
      </div>
      <div className="login-business-caption">
        <div key={slide.title} className="login-business-caption-copy">
          <span className="login-business-kicker">当前服务</span>
          <h2>{slide.title}</h2>
          <p>{slide.kicker}</p>
        </div>
        <SlideControls activeSlide={activeSlide} onChange={onSlideChange} />
      </div>
    </section>
  )
}

function TopBusinessOverview({ activeSlide, onChange, onHoverChange }: { activeSlide: number; onChange: (index: number) => void; onHoverChange?: (paused: boolean) => void }) {
  const current = BUSINESS_SLIDES[activeSlide]
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [imageLoadedMap, setImageLoadedMap] = useState<Record<number, boolean>>({})
  const [displayedSlide, setDisplayedSlide] = useState(0)

  useEffect(() => {
    if (imageLoadedMap[activeSlide]) setDisplayedSlide(activeSlide)
  }, [activeSlide, imageLoadedMap])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    onHoverChange?.(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    onHoverChange?.(false)
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = e.changedTouches[0].clientX - touchStartX.current
    const diffY = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // 仅在水平滑动距离占优时触发切页，避免纵向正常滑动页面时误触轮播
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
      if (diffX < 0) {
        onChange((activeSlide + 1) % BUSINESS_SLIDES.length)
      } else {
        onChange((activeSlide - 1 + BUSINESS_SLIDES.length) % BUSINESS_SLIDES.length)
      }
    }
  }

  return (
    <div
      className="login-top-business"
      style={{ width: '100%', maxWidth: 420, marginBottom: 14 }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      {/* ── 超简洁顶栏：轻巧的业务分类与当前标题 ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        padding: '0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-block',
            width: 3,
            height: 12,
            borderRadius: 2,
            background: '#14574D',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1201', letterSpacing: 0.5 }}>
            办学业务总览
          </span>
          <span style={{ fontSize: 11, color: '#8A6517', fontWeight: 600 }}>
            · {current.title}
          </span>
        </div>
      </div>

      {/* ── 展示海报卡片（黄金比例高度，支持平滑手势与自动预载） ── */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          onHoverChange?.(false)
          touchStartX.current = null
          touchStartY.current = null
        }}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          background: 'transparent',
          border: '1px solid rgba(214, 180, 91, 0.45)',
          boxShadow: '0 4px 14px rgba(26, 18, 1, 0.05)',
          userSelect: 'none',
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(180px, 48vw, 230px)',
          background: 'transparent',
          overflow: 'hidden',
        }}>
          {BUSINESS_SLIDES.map((slide, idx) => {
            const isActive = idx === activeSlide
            const isDisplayed = idx === displayedSlide
            // 严控网络并发：当前激活页或已预载页才挂载，防止首屏同时下载多张1MB+大图堵死登录网络通道
            if (!isActive && !isDisplayed && !imageLoadedMap[idx]) return null

            return (
              <div
                key={slide.src}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: isDisplayed ? 1 : 0,
                  transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  pointerEvents: 'none',
                  zIndex: isDisplayed ? 2 : 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.src}
                  alt={slide.title}
                  loading={isActive ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={isActive ? 'high' : 'auto'}
                  onLoad={() => setImageLoadedMap((prev) => ({ ...prev, [idx]: true }))}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    padding: 8,
                    filter: 'drop-shadow(0 4px 12px rgba(26, 18, 1, 0.08))',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* ── 卡片底部信息条：业务亮点 + 可点击切换圆点 ── */}
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(220, 210, 195, 0.6)',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF6EE 100%)',
        }}>
          <span style={{
            fontSize: 11,
            color: '#8A6517',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '52%',
          }}>
            {current.kicker}
          </span>

          {/* ── 核心交互：可直接点击切换的点（舒适触摸热区） ── */}
          <div
            role="tablist"
            aria-label="业务导航指示点"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
            }}
          >
            {BUSINESS_SLIDES.map((slide, idx) => {
              const active = idx === activeSlide
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`切换到业务: ${slide.title}`}
                  onClick={() => onChange(idx)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 3px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      height: 5.5,
                      width: active ? 16 : 5.5,
                      borderRadius: 999,
                      background: active ? '#14574D' : 'rgba(0, 0, 0, 0.16)',
                      boxShadow: active ? '0 1px 3px rgba(20, 87, 77, 0.3)' : 'none',
                      transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function BottomAdvantagesSection() {
  return (
    <div className="login-bottom-advantages" style={{ marginTop: 28, width: '100%', maxWidth: 420 }}>
      {/* ── 办学优势 ── */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: '#14574D',
          letterSpacing: 1.5,
          marginBottom: 4,
          padding: '2px 10px',
          borderRadius: 999,
          background: 'rgba(20, 87, 77, 0.08)',
        }}>
          <span>✦</span> 办学特色 · MOREJOY <span>✦</span>
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a1201', margin: '2px 0 0' }}>
          四大核心办学优势
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 24,
      }}>
        {SCHOOL_ADVANTAGES.map((adv) => (
          <div
            key={adv.title}
            style={{
              padding: '12px 10px',
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid rgba(220, 210, 195, 0.55)',
              boxShadow: '0 2px 8px rgba(26, 18, 1, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18 }}>{adv.icon}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#E8784A',
                background: '#FFF5F0',
                padding: '1px 5px',
                borderRadius: 4,
                border: '1px solid rgba(232, 120, 74, 0.2)',
              }}>
                {adv.tag}
              </span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1201' }}>{adv.title}</div>
            <div style={{ fontSize: 11, color: '#7a6f61', lineHeight: 1.4 }}>{adv.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 20, fontSize: 11.5, color: '#A89B8C' }}>
        <span>© 2026 牧哲学堂</span>
        <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
        <span>冀ICP备2026028285号</span>
      </div>
    </div>
  )
}

function RightForm({
  role, division, setDivision, loading, formError, setFormError, onFinish, showPwd, setShowPwd,
  autoDetectRole, onResolveRole, onEmailEdit, onManualRoleSelect,
  isMobile, reason, initialEmail, rememberAccount, setRememberAccount, identifierType, onIdentifierTypeChange,
  activeSlide, onSlideChange, onHoverChange,
}: {
  role: LoginRole
  division: LoginDivision; setDivision: (d: LoginDivision) => void
  loading: boolean
  formError: string; setFormError: (msg: string) => void
  onFinish: (values: { email: string; password: string }, loginRole: LoginRole, identifierType: LoginIdentifierType) => Promise<void>
  showPwd: boolean; setShowPwd: (v: boolean) => void
  autoDetectRole: boolean
  onResolveRole: (identifier: string, identifierType: LoginIdentifierType) => Promise<LoginRole | null>
  onEmailEdit: () => void
  onManualRoleSelect: (role: LoginRole) => void
  isMobile: boolean
  reason?: string | null
  initialEmail: string
  rememberAccount: boolean
  setRememberAccount: (remember: boolean) => void
  identifierType: LoginIdentifierType
  onIdentifierTypeChange: (identifierType: LoginIdentifierType) => void
  activeSlide: number
  onSlideChange: (index: number) => void
  onHoverChange?: (paused: boolean) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const loginInFlight = useRef(false)

  const isButtonBusy = loading || submitting

  useEffect(() => {
    if (initialEmail) setEmail((current) => current || initialEmail)
  }, [initialEmail])

  useEffect(() => {
    const candidate = email.trim()
    if (!autoDetectRole || candidate.length < 3) return
    const candidateType = inferLoginIdentifierType(candidate)
    const normalizedDigits = candidate.replace(/\D/g, '')
    if (candidateType === 'phone' && normalizedDigits.length < 11) return
    if (candidateType === 'email' && candidate.length < 5) return
    const timer = window.setTimeout(() => { void onResolveRole(candidate, candidateType) }, 450)
    return () => window.clearTimeout(timer)
  }, [email, identifierType, autoDetectRole, onResolveRole])

  const handleLogin = async () => {
    setFormError('')
    const usernameInput = (document.getElementById('login-username') as HTMLInputElement)?.value || ''
    const passwordInput = (document.getElementById('login-password') as HTMLInputElement)?.value || ''
    const finalEmail = (email || usernameInput).trim()
    const finalPassword = (password || passwordInput).trim()

    if (!finalEmail || !finalPassword) {
      setFormError('请填写账号和密码')
      return
    }
    if (isButtonBusy || loginInFlight.current) return
    loginInFlight.current = true
    setSubmitting(true)
    try {
      // 登录时直接使用已确定的 role，服务端 signIn('credentials') 自带完整的身份/角色/学部校验
      await onFinish({ email: finalEmail, password: finalPassword }, role, identifierType)
    } finally {
      loginInFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="login-right" style={{ flex: 1, display: 'grid', placeItems: 'center', padding: isMobile ? '16px 16px 28px' : 40, minHeight: '100vh', width: '100%' }}>
      <div className="login-form-shell" style={{ width: '100%', maxWidth: 420 }}>
        {/* 1. 最上面：业务总览（海报顶部自带官方Logo与校训） */}
        {isMobile && (
          <TopBusinessOverview
            activeSlide={activeSlide}
            onChange={onSlideChange}
            onHoverChange={onHoverChange}
          />
        )}

        <div className="login-card" style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 22,
          padding: isMobile ? '28px 22px 24px' : '36px 34px',
          border: '1px solid rgba(214, 180, 91, 0.35)',
          boxShadow: '0 4px 16px -2px rgba(26, 18, 1, 0.04), 0 20px 48px -6px rgba(26, 18, 1, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        }}>
          {/* Magic UI · 流金光环边框 */}
          <BorderBeam
            borderRadius={22}
            borderWidth={1.5}
            duration={10}
            colorFrom="#D6B45B"
            colorTo="#14574D"
          />
          {/* Card subtle brand watermark */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -24,
              bottom: -24,
              width: 190,
              height: 190,
              opacity: 0.045,
              pointerEvents: 'none',
              backgroundImage: "url('/images/logo-small-128.webp')",
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              transform: 'rotate(-10deg)',
              zIndex: 0,
            }}
          />

          {reason === 'kicked' && (
            <div style={{ position: 'relative', zIndex: 1, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#d46b08', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div><div style={{ fontWeight: 600, marginBottom: 2 }}>账号已在其他设备登录</div><div style={{ opacity: 0.85 }}>您的账号在另一台设备上登录，本设备已自动退出。如非本人操作，请立即修改密码。</div></div>
            </div>
          )}
          {reason === 'disabled' && (
            <div style={{ position: 'relative', zIndex: 1, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#cf1322', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🚫</span>
              <div><div style={{ fontWeight: 600, marginBottom: 2 }}>账号已被停用</div><div style={{ opacity: 0.85 }}>请联系学堂管理员核实处理</div></div>
            </div>
          )}

          {/* School Badge & Header */}
          <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #FFFDF9 0%, #F7EFE6 100%)',
              border: '1px solid rgba(214, 180, 91, 0.4)',
              boxShadow: '0 4px 14px rgba(232, 120, 74, 0.12), inset 0 1px 0 #ffffff',
              marginBottom: 10,
              padding: 8,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-small-128.webp"
                alt="牧哲学堂"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div className="login-welcome-title stagger-item" style={{ fontSize: 21, fontWeight: 800, color: '#1a1201', letterSpacing: -0.3, lineHeight: 1.25, marginBottom: 4 }}>
              欢迎登录牧哲学堂
            </div>
            <p className="stagger-item" style={{ fontSize: 13, color: '#8a7d6d', margin: 0, letterSpacing: 0.3 }}>
              教学记录 · 课堂反馈 · 家校沟通平台
            </p>
          </div>

          {/* 角色切换标签 */}
          <div className="stagger-item" style={{ marginBottom: 14 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              padding: 4,
              background: '#F5F0EA',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.04)',
            }}>
              {ROLE_OPTIONS.map((item) => {
                const active = role === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={loading}
                    onClick={() => onManualRoleSelect(item.value)}
                    style={{
                      height: 38,
                      borderRadius: 9,
                      border: 'none',
                      background: active ? '#ffffff' : 'transparent',
                      color: active ? '#14574D' : '#756A58',
                      fontWeight: active ? 700 : 500,
                      fontSize: 13.5,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: active ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {(role === 'admin' || role === 'teacher') && (
            <div className="stagger-item" style={{ marginBottom: 16 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                padding: 4,
                background: '#F5F0EA',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.04)',
              }}>
                {DIVISION_OPTIONS.map((item) => {
                  const active = division === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={loading}
                      onClick={() => setDivision(item.value)}
                      style={{
                        height: 36,
                        borderRadius: 9,
                        border: 'none',
                        background: active ? '#ffffff' : 'transparent',
                        color: active ? '#14574D' : '#756A58',
                        fontWeight: active ? 650 : 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <form
            autoComplete="on"
            onSubmit={(event) => {
              event.preventDefault()
              void handleLogin()
            }}
          >
          <div className="stagger-item" style={{ marginBottom: 14 }}>
            <Input
              id="login-username"
              name="username"
              aria-label="登录账号"
              prefix={<UserOutlined style={{ color: '#A89886', fontSize: 15, marginRight: 4 }} />}
              type="text"
              placeholder="手机号 / 账号 / 邮箱"
              autoComplete="username"
              disabled={loading}
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                onIdentifierTypeChange(inferLoginIdentifierType(e.target.value))
                onEmailEdit()
                setFormError('')
              }}
              status={formError ? 'error' : undefined}
              style={{
                borderRadius: 12,
                height: 48,
                background: '#FCFBFA',
                border: '1px solid #E6DFD5',
                fontSize: 15,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
              }}
            />
          </div>
          <div className="stagger-item" style={{ marginBottom: 12 }}>
            <Input
              id="login-password"
              name="password"
              aria-label="登录密码"
              prefix={<LockOutlined style={{ color: '#A89886', fontSize: 15, marginRight: 4 }} />}
              type={showPwd ? 'text' : 'password'}
              placeholder="请输入登录密码"
              autoComplete="current-password"
              disabled={loading}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFormError('') }}
              status={formError ? 'error' : undefined}
              suffix={(
                <button
                  type="button"
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', margin: -6, padding: 0, border: 0, background: 'transparent', color: '#A89886', cursor: 'pointer', borderRadius: 8 }}
                >
                  {showPwd ? <EyeOutlined style={{ fontSize: 16 }} /> : <EyeInvisibleOutlined style={{ fontSize: 16 }} />}
                </button>
              )}
              style={{
                borderRadius: 12,
                height: 48,
                background: '#FCFBFA',
                border: '1px solid #E6DFD5',
                fontSize: 15,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
              }}
            />
          </div>
          <div className="login-remember-row stagger-item" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Checkbox
              checked={rememberAccount}
              onChange={(event) => setRememberAccount(event.target.checked)}
              style={{ fontSize: 13, color: '#685D4E' }}
            >
              记住账号
            </Checkbox>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 2px',
                color: '#14574D',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
                outline: 'none',
                transition: 'opacity 0.2s ease',
              }}
            >
              忘记密码？
            </button>
          </div>
          {/* ── Error banner ── */}
          {formError ? (
            <div style={{
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#FFF2F0',
              border: '1px solid #FFCCC7',
              fontSize: 13,
              color: '#cf1322',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <WarningFilled style={{ color: '#ff4d4f', fontSize: 14, flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: 500 }}>{formError}</span>
            </div>
          ) : null}
          <ShimmerButton
            type="submit"
            loading={isButtonBusy}
            disabled={isButtonBusy}
            className="stagger-item"
            shimmerColor="rgba(214, 180, 91, 0.38)"
            shimmerDuration="3.2s"
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 650,
              letterSpacing: 2,
            }}
          >
            {isButtonBusy ? '正在登录...' : '登 录'}
          </ShimmerButton>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#A09484' }}>
            <span>🔒 全程数据加密</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>🏫 牧哲学堂数字化教务</span>
          </div>
          {!isMobile && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: '#A89B8C' }}>
              <span>© 2026 牧哲学堂</span>
              <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
              <span>冀ICP备2026028285号</span>
            </div>
          )}
        </div>

        {/* 3. 下面：优势在下面 */}
        {isMobile && <BottomAdvantagesSection />}
      </div>

      <Modal
        open={showForgotModal}
        onCancel={() => setShowForgotModal(false)}
        footer={null}
        centered
        width={440}
        styles={{
          content: {
            borderRadius: 16,
            padding: '28px 24px 24px',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 20px 40px rgba(26,18,1,0.12)',
          },
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#fef3ec',
            color: '#E8784A',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            marginBottom: 12,
          }}>
            <SafetyCertificateOutlined />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1201', margin: 0 }}>
            账号与密码支持
          </h3>
          <p style={{ fontSize: 13, color: '#8c7d6b', marginTop: 4, marginBottom: 0 }}>
            牧哲学堂家校互通安全保障
          </p>
        </div>

        <div style={{
          background: '#faf8f5',
          border: '1px solid #f0eae1',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 18,
          fontSize: 13,
          lineHeight: 1.6,
          color: '#5c5246',
        }}>
          为保护学员学情记录与家庭隐私安全，系统实行<strong>线下人工安全核验机制</strong>。如您遗忘密码或无法登录，请按以下指引办理：
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#E8784A',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              marginTop: 1,
            }}>
              1
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1201' }}>联系任课老师或班主任</div>
              <div style={{ fontSize: 12, color: '#8c7d6b', marginTop: 2, lineHeight: 1.5 }}>
                向孩子的任课教师或班主任说明情况，教师核验学员信息后将协助提交重置。
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#14574D',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              marginTop: 1,
            }}>
              2
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1201' }}>学堂教务核实重置</div>
              <div style={{ fontSize: 12, color: '#8c7d6b', marginTop: 2, lineHeight: 1.5 }}>
                学堂教务管理员核实家长身份后，将在后台为您重置安全密码并直接通知您。
              </div>
            </div>
          </div>
        </div>

        <Button
          type="primary"
          block
          onClick={() => setShowForgotModal(false)}
          style={{
            height: 42,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            background: '#E8784A',
            border: 'none',
          }}
        >
          我知道了
        </Button>
      </Modal>
    </section>
  )
}

function MobileBrandBar(_props: { activeSlide: number; onSlideChange: (index: number) => void; onSwipe?: (dir: 1 | -1) => void; preloadActive: boolean; deferImage: boolean }) {
  return null
}

/* ── Main Page ── */
export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(false)
  const [splashResolved, setSplashResolved] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [role, setRole] = useState<LoginRole>('parent')
  const [identifierType, setIdentifierType] = useState<LoginIdentifierType>('email')
  const [division, setDivision] = useState<LoginDivision>('JUNIOR')
  const divisionRef = useRef<LoginDivision>('JUNIOR')
  const [autoDetectRole, setAutoDetectRole] = useState(true)
  const [reason, setReason] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [initialEmail, setInitialEmail] = useState('')
  const [rememberAccount, setRememberAccount] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const isMobile = useIsMobile(768) ?? false
  const autoDetectRoleRef = useRef(true)
  const roleDetectionSequence = useRef(0)
  const roleDetectionController = useRef<AbortController | null>(null)
  const roleDetectionPending = useRef<{ identifier: string; identifierType: LoginIdentifierType; division: LoginDivision; promise: Promise<LoginRole | null> } | null>(null)
  const roleDetectionResult = useRef<{ identifier: string; identifierType: LoginIdentifierType; division: LoginDivision; role: LoginRole | null; checkedAt: number } | null>(null)
  const adminRolePinned = useRef(false)

  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    setReason(searchParams.get('reason'))
    const preference = readLoginPreference()
    if (preference) {
      setInitialEmail(preference.email)
      setRole(preference.role)
      setIdentifierType(inferLoginIdentifierType(preference.email))
      divisionRef.current = preference.division
      setDivision(preference.division)
    }
    const errorCode = searchParams.get('error')
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setRole('parent')
      setFormError(ERROR_MESSAGES[errorCode])
    }
    // 播放开屏 7 秒视频/动画（满足用户保留开屏7秒动画视频需求）
    setShowSplash(true)
    setSplashResolved(true)
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches || isPaused) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % BUSINESS_SLIDES.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [activeSlide, isPaused])

  // 静默预加载紧邻的下一张海报，避免一次性并发请求占满网络带宽
  useEffect(() => {
    if (typeof window === 'undefined') return
    const nextIndex = (activeSlide + 1) % BUSINESS_SLIDES.length
    const img = new window.Image()
    img.src = BUSINESS_SLIDES[nextIndex].src
  }, [activeSlide])

  const handleManualSlideChange = useCallback((nextIndex: number) => {
    setActiveSlide(nextIndex)
  }, [])

  const handleSwipe = useCallback((dir: 1 | -1) => {
    setActiveSlide((current) => (current + dir + BUSINESS_SLIDES.length) % BUSINESS_SLIDES.length)
  }, [])

  const changeDivision = useCallback((nextDivision: LoginDivision) => {
    divisionRef.current = nextDivision
    setDivision(nextDivision)
  }, [])

  const updateRememberAccount = (remember: boolean) => {
    setRememberAccount(remember)
    if (!remember) clearLoginPreference()
  }

  const resetRoleDetection = useCallback(() => {
    roleDetectionSequence.current += 1
    roleDetectionController.current?.abort()
    roleDetectionController.current = null
    roleDetectionPending.current = null
    roleDetectionResult.current = null
    if (adminRolePinned.current) return
    autoDetectRoleRef.current = true
    setAutoDetectRole(true)
  }, [])

  const selectRoleManually = useCallback((nextRole: LoginRole) => {
    roleDetectionSequence.current += 1
    roleDetectionController.current?.abort()
    roleDetectionController.current = null
    roleDetectionPending.current = null
    roleDetectionResult.current = null
    adminRolePinned.current = nextRole === 'admin'
    autoDetectRoleRef.current = false
    setAutoDetectRole(false)
    setRole(nextRole)
  }, [])

  const detectRole = useCallback(async (identifier: string, identifierType: LoginIdentifierType): Promise<LoginRole | null> => {
    const trimmed = identifier.trim()
    if (!trimmed || trimmed.length > 254) return null
    if (
      roleDetectionResult.current?.identifier === trimmed
      && roleDetectionResult.current.identifierType === identifierType
      && roleDetectionResult.current.division === division
      && Date.now() - roleDetectionResult.current.checkedAt < 15_000
    ) {
      return roleDetectionResult.current.role
    }
    if (
      roleDetectionPending.current?.identifier === trimmed
      && roleDetectionPending.current.identifierType === identifierType
      && roleDetectionPending.current.division === division
    ) {
      return roleDetectionPending.current.promise
    }

    roleDetectionController.current?.abort()
    const controller = new AbortController()
    roleDetectionController.current = controller
    const requestId = ++roleDetectionSequence.current
    const promise = (async () => {
    try {
      const res = await fetch('/api/auth/detect-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed, identifierType, division }),
        signal: controller.signal,
      })
      if (!res.ok) {
        return null
      }
      const data = await res.json()
      const matchedRole = ['admin', 'teacher', 'parent'].includes(data.role) ? data.role as LoginRole : null
      if (requestId !== roleDetectionSequence.current) return null
      roleDetectionResult.current = { identifier: trimmed, identifierType, division, role: matchedRole, checkedAt: Date.now() }
      if (matchedRole && autoDetectRoleRef.current) {
        setRole(matchedRole)
        if (data.division === 'JUNIOR' || data.division === 'SENIOR') {
          changeDivision(data.division)
        }
      }
      return matchedRole
    } catch {
      return null
    } finally {
      if (requestId === roleDetectionSequence.current) {
        roleDetectionController.current = null
        roleDetectionPending.current = null
      }
    }
    })()
    roleDetectionPending.current = { identifier: trimmed, identifierType, division, promise }
    return promise
  }, [division, changeDivision])

  const handleLogin = async (values: { email: string; password: string }, loginRole: LoginRole, loginIdentifierType: LoginIdentifierType) => {
    setFormError('')
    setLoading(true)
    const loginDivision = divisionRef.current
    try {
      const email = values.email.trim().toLowerCase()
      const result = await signIn('credentials', {
        email, password: values.password, loginRole, identifierType: loginIdentifierType, division: loginDivision, redirect: false,
      })

      if (!result || result.error) {
        const code = result?.code || result?.error || ''
        const fallback = result?.error === 'CredentialsSignin'
          ? ERROR_MESSAGES.CredentialsSignin
          : '登录服务暂时不可用，请检查网络后稍后重试'
        const msg = ERROR_MESSAGES[code] || fallback
        setFormError(msg)
        toast.error(msg, { duration: code === 'LOCKED' || code === 'ACCOUNT_LOCKED' ? 8000 : 5000 })
        setLoading(false)
        return
      }

      const session = await getSession()
      const authenticatedRole = session?.user?.role
      if (!session || (authenticatedRole !== 'admin' && authenticatedRole !== 'teacher' && authenticatedRole !== 'parent')) {
        const msg = '登录成功，但暂时无法确认账号身份，请刷新页面后重试'
        setFormError(msg)
        toast.error(msg, { duration: 6000 })
        return
      }
      if (authenticatedRole !== loginRole) {
        const msg = '账号身份与所选入口不一致，请切换到正确入口登录'
        setFormError(msg)
        toast.error(msg, { duration: 6000 })
        return
      }
      const authenticatedDivision: LoginDivision = session.user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'

      setFormError('')
      if (rememberAccount) {
        writeLoginPreference({ email, role: authenticatedRole, division: authenticatedDivision })
        void offerPasswordManagerSave(email, values.password)
      } else {
        clearLoginPreference()
      }
      toast.success('登录成功，正在跳转...', { duration: 2000 })

      const requestedReturnTo = new URLSearchParams(window.location.search).get('returnTo')
      let safeParentReturnTo: string | null = null
      if (authenticatedRole === 'parent' && requestedReturnTo) {
        try {
          const target = new URL(requestedReturnTo, window.location.origin)
          if (target.origin === window.location.origin && target.pathname.startsWith('/parent/')) {
            safeParentReturnTo = `${target.pathname}${target.search}${target.hash}`
          }
        } catch {
          // Ignore malformed or external return targets and use the normal dashboard.
        }
      }
      const destination = safeParentReturnTo || (authenticatedRole === 'parent'
        ? '/parent/dashboard'
        : authenticatedRole === 'teacher'
          ? `/teacher/dashboard?division=${authenticatedDivision}`
          : `/dashboard?division=${authenticatedDivision}`)
      window.location.replace(destination)
    } catch {
      const msg = '登录请求未完成，请检查网络或稍后重试'
      setFormError(msg)
      toast.error(msg, { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={'login-page login-page--brand-background' + (showSplash ? ' is-splash-open' : '')}>
      <BrandBackground />
      {!splashResolved ? (
        <div className="login-splash-gate" aria-label="正在打开牧哲学堂">
          <span className="sr-only">正在打开牧哲学堂</span>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-background-header-logo brand-background-header-logo--login" src="/brand/logo.png" alt="牧哲学堂" />
          <div className={'login-page-content' + (showSplash ? ' is-splash-covered' : ' is-splash-revealed')}>
            <MobileBrandBar activeSlide={activeSlide} onSlideChange={handleManualSlideChange} onSwipe={handleSwipe} preloadActive={isMobile} deferImage={false} />
            <div className="login-shell" style={{ display: 'flex', minHeight: '100vh' }}>
              <BrandLeft activeSlide={activeSlide} onSlideChange={handleManualSlideChange} onSwipe={handleSwipe} preloadActive={!isMobile} deferImage={false} onHoverChange={setIsPaused} />
              <RightForm
                role={role}
                division={division} setDivision={changeDivision}
                loading={loading}
                formError={formError} setFormError={setFormError}
                onFinish={handleLogin}
                showPwd={showPwd} setShowPwd={setShowPwd}
                autoDetectRole={autoDetectRole}
                onResolveRole={detectRole} onEmailEdit={resetRoleDetection} onManualRoleSelect={selectRoleManually}
                isMobile={isMobile} reason={reason}
                initialEmail={initialEmail}
                rememberAccount={rememberAccount} setRememberAccount={updateRememberAccount}
                identifierType={identifierType} onIdentifierTypeChange={setIdentifierType}
                activeSlide={activeSlide} onSlideChange={handleManualSlideChange}
                onHoverChange={setIsPaused}
              />
            </div>
          </div>
          {showSplash && <SplashScreen onDone={handleSplashDone} duration={7000} />}
        </>
      )}
    </main>
  )
}
