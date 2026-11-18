'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { Button, Checkbox, Input, Tag, Typography } from 'antd'
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  UserOutlined,
  WarningFilled,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SplashScreen } from '@/components/SplashScreen'
import { toast } from 'sonner'
import {
  clearLoginPreference,
  offerPasswordManagerSave,
  readLoginPreference,
  writeLoginPreference,
} from '@/lib/login-preferences'

const { Text } = Typography

type LoginRole = 'admin' | 'teacher' | 'parent'
type LoginDivision = 'JUNIOR' | 'SENIOR'

const DIVISION_OPTIONS: Array<{ value: LoginDivision; label: string }> = [
  { value: 'JUNIOR', label: '初中部' },
  { value: 'SENIOR', label: '高中部' },
]

const ROLE_OPTIONS: Array<{ value: LoginRole; label: string; hint: string }> = [
  { value: 'admin', label: '管理者', hint: '掌舵全局，服务每一个家庭' },
  { value: 'teacher', label: '教师端', hint: '点燃思想，照亮成长之路' },
  { value: 'parent', label: '家长端', hint: '查看孩子的课程与学习记录' },
]

const PLACEHOLDER_MAP: Record<LoginRole, { email: string; pwd: string }> = {
  admin: { email: '请输入账号', pwd: '请输入密码' },
  teacher: { email: '请输入账号', pwd: '请输入密码' },
  parent: { email: '请输入账号', pwd: '请输入密码' },
}

const BUSINESS_SLIDES = [
  { src: '/services/seasonal-bootcamp/1.png', title: '寒暑假冲刺预备课', kicker: '集中学习 · 系统复习 · 查漏补缺' },
  { src: '/services/one-to-one/1.png', title: '各年级一对一冲刺', kicker: '个性化定制 · 及时反馈 · 学情可视化' },
  { src: '/services/evening-study/1.png', title: '晚间课业辅导营', kicker: '当天问题当天解决，学习过程看得见' },
  { src: '/services/weekend-pioneer/1.png', title: '周末先锋营', kicker: '一周一清，周周领先' },
  { src: '/services/zhongkao-planning/1.png', title: '中考升学规划', kicker: '提前了解 · 科学定位 · 从容选择' },
  { src: '/services/gaokao-consulting/1.png', title: '高考志愿咨询', kicker: '专业规划 · 多重审核 · 家庭放心' },
  { src: '/services/single-enrollment/1.png', title: '单招文化课辅导', kicker: '小班精讲 · 高频考点 · 稳步提升' },
  { src: '/services/postgraduate-public-courses/1.png', title: '考研公共课辅导', kicker: '系统精讲 · 真题训练 · 少走弯路' },
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
}

/* ── Module-level components ── */

function BusinessSlide({ activeSlide, mobile = false, onSwipe }: { activeSlide: number; mobile?: boolean; onSwipe?: (dir: 1 | -1) => void }) {
  const slide = BUSINESS_SLIDES[activeSlide]
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })

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
      <div className="login-business-poster" key={slide.src}>
        <Image
          src={slide.src}
          alt={`${slide.title}业务介绍`}
          fill
          sizes={mobile ? '(max-width: 768px) calc(100vw - 24px), 50vw' : '50vw'}
          className="login-business-image"
          loading="eager"
        />
      </div>
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

function BrandLeft({ activeSlide, onSlideChange, onSwipe }: { activeSlide: number; onSlideChange: (index: number) => void; onSwipe?: (dir: 1 | -1) => void }) {
  const slide = BUSINESS_SLIDES[activeSlide]
  return (
    <section className="login-left login-business-panel" style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      <BusinessSlide activeSlide={activeSlide} onSwipe={onSwipe} />
      <div className="login-business-shade" aria-hidden="true" />
      <div className="login-business-brand">
        <div style={{ width: 196, height: 54, position: 'relative', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.26))' }}>
          <Image src="/images/logo.jpg" alt="牧哲学堂 MOREJOY" fill sizes="220px" style={{ objectFit: 'contain', objectPosition: 'left center', opacity: 0.9 }} priority />
        </div>
        <div className="login-business-eyebrow">八类业务 · 专业教育服务</div>
      </div>
      <div className="login-business-caption">
        <span className="login-business-kicker">当前服务</span>
        <h2>{slide.title}</h2>
        <p>{slide.kicker}</p>
        <SlideControls activeSlide={activeSlide} onChange={onSlideChange} />
      </div>
    </section>
  )
}

function RightForm({
  role, setRole, division, setDivision, loading, formError, setFormError, onFinish, showPwd, setShowPwd,
  detectedRole, onEmailBlur, isMobile, reason, initialEmail, rememberAccount, setRememberAccount,
}: {
  role: LoginRole; setRole: (r: LoginRole) => void
  division: LoginDivision; setDivision: (d: LoginDivision) => void
  loading: boolean
  formError: string; setFormError: (msg: string) => void
  onFinish: (values: { email: string; password: string }) => Promise<void>
  showPwd: boolean; setShowPwd: (v: boolean) => void
  detectedRole: LoginRole | null
  onEmailBlur: (email: string) => void
  isMobile: boolean
  reason?: string | null
  initialEmail: string
  rememberAccount: boolean
  setRememberAccount: (remember: boolean) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (initialEmail) setEmail((current) => current || initialEmail)
  }, [initialEmail])

  const handleLogin = async () => {
    setFormError('')
    if (!email.trim() || !password.trim()) {
      setFormError('请填写账号和密码')
      return
    }
    if (loading) return
    await onFinish({ email, password })
  }

  return (
    <section className="login-right" style={{ flex: 1, display: 'grid', placeItems: 'center', padding: isMobile ? '32px 24px' : 40, minHeight: '100vh', width: '100%' }}>
      <div className="login-form-shell" style={{ width: '100%', maxWidth: 440 }}>
        <div className="login-form-brand" style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{ width: 200, height: 62, position: 'relative', margin: '0 auto 10px' }}>
            <Image src="/images/logo.jpg" alt="牧哲学堂" fill sizes="200px" style={{ objectFit: 'contain', objectPosition: 'center' }} priority />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to right, transparent, rgba(232,120,74,.4))' }} />
            <span style={{ fontSize: 12, color: '#9a8e7a', letterSpacing: 4, fontWeight: 400 }}>管理系统</span>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to left, transparent, rgba(232,120,74,.4))' }} />
          </div>
        </div>

        <div className="login-card" style={{ background: 'var(--color-surface-1)', borderRadius: 'var(--radius-xl)', padding: '34px 32px', border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-raised)' }}>
          {reason === 'kicked' && (
            <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#d46b08', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div><div style={{ fontWeight: 600, marginBottom: 2 }}>账号已在其他设备登录</div><div style={{ opacity: 0.85 }}>您的账号在另一台设备上登录，本设备已自动退出。如非本人操作，请立即修改密码。</div></div>
            </div>
          )}
          {reason === 'disabled' && (
            <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#cf1322', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🚫</span>
              <div><div style={{ fontWeight: 600, marginBottom: 2 }}>账号已被停用</div><div style={{ opacity: 0.85 }}>请联系管理员了解详情，电话：15930114500</div></div>
            </div>
          )}
          {/* Role tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 28 }}>
            {ROLE_OPTIONS.map((item) => {
              const active = role === item.value
              return (
                <button key={item.value} type="button" aria-pressed={active} onClick={() => setRole(item.value)} style={{ height: 60, borderRadius: 'var(--radius-interactive)', cursor: 'pointer', border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline-strong)'}`, background: active ? 'var(--color-primary-bg)' : 'var(--color-surface-1)', color: active ? 'var(--color-primary-focus)' : 'var(--color-ink-muted)', boxShadow: active ? '0 1px 2px rgba(26,18,1,.04)' : 'none', transition: 'background-color var(--motion-standard) ease, border-color var(--motion-standard) ease, color var(--motion-standard) ease', padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: active ? 'var(--color-ink-muted)' : 'var(--color-ink-subtle)' }}>{item.hint}</div>
                </button>
              )
            })}
          </div>

          {(role === 'admin' || role === 'teacher') && (
            <div style={{ marginBottom: 20 }}>
              <Text style={{ color: '#9a8e7a', fontSize: 13, display: 'block', marginBottom: 8 }}>选择学部</Text>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {DIVISION_OPTIONS.map((item) => {
                  const active = division === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDivision(item.value)}
                      style={{
                        height: 46,
                        borderRadius: 'var(--radius-interactive)',
                        cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline-strong)'}`,
                        background: active ? 'var(--color-primary-bg)' : 'var(--color-surface-1)',
                        color: active ? 'var(--color-primary-focus)' : 'var(--color-ink-muted)',
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        boxShadow: active ? '0 1px 2px rgba(26,18,1,.04)' : 'none',
                        transition: 'background-color var(--motion-standard) ease, border-color var(--motion-standard) ease, color var(--motion-standard) ease',
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1201', marginBottom: 4 }}>欢迎回来</div>
          <Text style={{ color: '#9a8e7a', display: 'block', marginBottom: 26, fontSize: 14 }}>请选择对应身份入口，再输入账号密码。</Text>

          <form
            autoComplete="on"
            onSubmit={(event) => {
              event.preventDefault()
              void handleLogin()
            }}
          >
          <div style={{ marginBottom: 16 }}>
            <Input
              id="login-username"
              name="username"
              aria-label="登录账号"
              prefix={<UserOutlined style={{ color: '#C5A28A' }} />}
              placeholder={PLACEHOLDER_MAP[role].email}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFormError('') }}
              onBlur={(e) => { const v = e.target.value.trim(); if (v) onEmailBlur(v) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              status={formError ? 'error' : undefined}
              style={{ borderRadius: isMobile ? 12 : 10, height: isMobile ? 48 : 46, background: '#FAFAFA' }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <Input
              id="login-password"
              name="password"
              aria-label="登录密码"
              prefix={<LockOutlined style={{ color: '#C5A28A' }} />}
              type={showPwd ? 'text' : 'password'}
              placeholder={PLACEHOLDER_MAP[role].pwd}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFormError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              status={formError ? 'error' : undefined}
              suffix={(
                <button
                  type="button"
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', margin: -8, padding: 0, border: 0, background: 'transparent', color: '#C5A28A', cursor: 'pointer' }}
                >
                  {showPwd ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </button>
              )}
              style={{ borderRadius: isMobile ? 12 : 10, height: isMobile ? 48 : 46, background: '#FAFAFA' }}
            />
          </div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <Checkbox
              checked={rememberAccount}
              onChange={(event) => setRememberAccount(event.target.checked)}
            >
              记住账号
            </Checkbox>
            <Text style={{ color: '#9a8e7a', fontSize: 12 }}>密码由手机或浏览器安全保存</Text>
          </div>
          {detectedRole && (
            <div style={{ marginBottom: 16, fontSize: 11, color: '#E87545' }}>
              检测到身份：<Tag color="orange" style={{ borderRadius: 9999 }}>{ROLE_OPTIONS.find(r => r.value === detectedRole)?.label || detectedRole}</Tag>
            </div>
          )}
          {/* ── Error banner ── */}
          {formError ? (
            <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: '#fff2f0', border: '1px solid #ffccc7', fontSize: 14, color: '#cf1322', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <WarningFilled style={{ color: '#ff4d4f', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{formError}</span>
            </div>
          ) : null}
          <Button type="primary" htmlType="submit" loading={loading} block style={{ height: isMobile ? 48 : 46, borderRadius: isMobile ? 12 : 10, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #E87545, #F09A5B)', border: 'none', boxShadow: '0 6px 18px rgba(232,117,69,.3)' }}>登录</Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#c8c4be', marginTop: 10 }}>牧哲学堂 · 教学记录与家校沟通平台</p>
      </div>
    </section>
  )
}

function MobileBrandBar({ activeSlide, onSlideChange, onSwipe }: { activeSlide: number; onSlideChange: (index: number) => void; onSwipe?: (dir: 1 | -1) => void }) {
  const slide = BUSINESS_SLIDES[activeSlide]
  return (
    <section className="mobile-brand-bar login-mobile-business">
      <BusinessSlide activeSlide={activeSlide} mobile onSwipe={onSwipe} />
      <div className="login-mobile-business-shade" aria-hidden="true" />
      <div className="login-mobile-brand">
        <div style={{ width: 150, height: 38, position: 'relative', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.2))' }}>
          <Image src="/images/logo.jpg" alt="牧哲学堂" fill sizes="150px" style={{ objectFit: 'contain', objectPosition: 'left center' }} priority />
        </div>
      </div>
      <div className="login-mobile-caption">
        <div>
          <span>八类业务服务</span>
          <h2>{slide.title}</h2>
        </div>
        <SlideControls activeSlide={activeSlide} onChange={onSlideChange} compact />
      </div>
    </section>
  )
}

/* ── Main Page ── */
export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [role, setRole] = useState<LoginRole>('admin')
  const [division, setDivision] = useState<LoginDivision>('JUNIOR')
  const [detectedRole, setDetectedRole] = useState<LoginRole | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [initialEmail, setInitialEmail] = useState('')
  const [rememberAccount, setRememberAccount] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const isMobile = useIsMobile() ?? false

  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
    window.sessionStorage.setItem('splash-shown', '1')
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    setReason(searchParams.get('reason'))
    const preference = readLoginPreference()
    if (preference) {
      setInitialEmail(preference.email)
      setRole(preference.role)
      setDivision(preference.division)
    }
    const errorCode = searchParams.get('error')
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setRole('parent')
      setFormError(ERROR_MESSAGES[errorCode])
    }
    if (!window.sessionStorage.getItem('splash-shown')) setShowSplash(true)
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % BUSINESS_SLIDES.length)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [])

  const handleSwipe = useCallback((dir: 1 | -1) => {
    setActiveSlide((current) => (current + dir + BUSINESS_SLIDES.length) % BUSINESS_SLIDES.length)
  }, [])

  const updateRememberAccount = (remember: boolean) => {
    setRememberAccount(remember)
    if (!remember) clearLoginPreference()
  }

  const detectRole = async (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) return
    try {
      const res = await fetch('/api/auth/detect-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, division }),
      })
      const data = await res.json()
      if (data.role) { setDetectedRole(data.role as LoginRole); setRole(data.role as LoginRole) }
    } catch { /* ignore */ }
  }

  const handleLogin = async (values: { email: string; password: string }) => {
    setFormError('')
    setLoading(true)
    try {
      const email = values.email.trim().toLowerCase()
      const result = await signIn('credentials', {
        email, password: values.password, loginRole: role, division, redirect: false,
      })

      if (!result || result.error) {
        const code = result?.code || ''
        const msg = ERROR_MESSAGES[code] || '账号或密码不正确，请重新尝试'
        setFormError(msg)
        toast.error(msg, { duration: code === 'LOCKED' || code === 'ACCOUNT_LOCKED' ? 8000 : 5000 })
        setLoading(false)
        return
      }

      setFormError('')
      if (rememberAccount) {
        writeLoginPreference({ email, role, division })
        await offerPasswordManagerSave(email, values.password)
      } else {
        clearLoginPreference()
      }
      toast.success('登录成功，正在跳转...', { duration: 2000 })

      const destination = role === 'parent'
        ? '/parent/dashboard'
        : role === 'teacher'
          ? `/teacher/dashboard?division=${division}`
          : `/dashboard?division=${division}`
      window.location.replace(destination)
    } catch {
      const msg = '网络异常，请检查网络连接后重试'
      setFormError(msg)
      toast.error(msg, { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={handleSplashDone} variant="full" duration={4200} />}
      <MobileBrandBar activeSlide={activeSlide} onSlideChange={setActiveSlide} onSwipe={handleSwipe} />
      <div className="login-shell" style={{ display: 'flex', minHeight: '100vh', background: '#faf8f5' }}>
        <BrandLeft activeSlide={activeSlide} onSlideChange={setActiveSlide} onSwipe={handleSwipe} />
        <RightForm
          role={role} setRole={setRole}
          division={division} setDivision={setDivision}
          loading={loading}
          formError={formError} setFormError={setFormError}
          onFinish={handleLogin}
          showPwd={showPwd} setShowPwd={setShowPwd}
          detectedRole={detectedRole} onEmailBlur={detectRole}
          isMobile={isMobile} reason={reason}
          initialEmail={initialEmail}
          rememberAccount={rememberAccount} setRememberAccount={updateRememberAccount}
        />
      </div>
    </>
  )
}
