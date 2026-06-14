'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button, Input, Tag, Typography } from 'antd'
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

const { Text } = Typography

type LoginRole = 'admin' | 'teacher' | 'parent'
type LoginDivision = 'JUNIOR' | 'SENIOR'

const DIVISION_OPTIONS: Array<{ value: LoginDivision; label: string }> = [
  { value: 'JUNIOR', label: '???' },
  { value: 'SENIOR', label: '???' },
]

const ROLE_OPTIONS: Array<{ value: LoginRole; label: string; hint: string }> = [
  { value: 'admin', label: '管理者', hint: '掌舵全局，服务每一个家庭' },
  { value: 'teacher', label: '教师端', hint: '点燃思想，照亮成长之路' },
  { value: 'parent', label: '家长端', hint: '见证孩子，每一步的蜕变' },
]

const PLACEHOLDER_MAP: Record<LoginRole, { email: string; pwd: string }> = {
  admin: { email: '请输入账号', pwd: '请输入密码' },
  teacher: { email: '请输入账号', pwd: '请输入密码' },
  parent: { email: '请输入账号', pwd: '请输入密码' },
}

const STATS = [
  { val: '9年', label: '深耕教育' },
  { val: '35家', label: '校区覆盖' },
  { val: '5城', label: '河北布局' },
  { val: 'A+', label: '家长评级', gold: true },
]

const HONORS = [
  { text: '🏆 优秀教育机构', gold: true },
  { text: '⭐ 家长信赖品牌', gold: true },
  { text: '📍 石家庄 · 唐山 · 邯郸 · 邢台 · 张家口', gold: false },
]

const ERROR_MESSAGES: Record<string, string> = {
  BAD_USERNAME: '账号不存在，请检查输入的账号是否正确',
  not_found: '账号不存在，请检查输入的账号是否正确',
  BAD_PASSWORD: '密码错误，请重新输入',
  wrong_password: '密码错误，请重新输入',
  BAD_ROLE: '身份选择不正确，请切换到对应的身份入口登录',
  DISABLED: '该账号已被停用，请联系管理员',
  LOCKED: '密码连续输错次数过多，账号已临时锁定，请30分钟后重试',
  ACCOUNT_LOCKED: '该账号尝试次数过多，请15分钟后重试',
  uninitialized: '账号未初始化，请联系管理员创建账号',
}

/* ── Module-level components ── */

function BrandLeft({ mounted }: { mounted: boolean }) {
  return (
    <section className="login-left" style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden', minHeight: '100vh', background: '#1a1201' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2 }}>
        <div style={{ gridColumn: 1, gridRow: '1 / 3', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
          <Image src="/images/photo-1.jpg" alt="" fill sizes="50vw" loading="lazy" style={{ objectFit: 'cover', objectPosition: 'center' }} />
        </div>
        <div style={{ gridColumn: 2, gridRow: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
          <Image src="/images/photo-2.jpg" alt="" fill sizes="25vw" loading="lazy" style={{ objectFit: 'cover', objectPosition: 'center top' }} />
        </div>
        <div style={{ gridColumn: 2, gridRow: 2, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
          <Image src="/images/photo-3.jpg" alt="" fill sizes="25vw" loading="lazy" style={{ objectFit: 'cover' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(160deg, rgba(160,55,10,0.78) 0%, rgba(100,30,5,0.82) 35%, rgba(15,25,8,0.88) 100%)' }} />
      <div style={{ position: 'absolute', top: 22, left: 20, right: 20, zIndex: 10, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity .6s ease, transform .6s ease' }}>
        <div style={{ width: 220, height: 68, position: 'relative', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.4))' }}>
          <Image src="/images/logo.jpg" alt="牧哲学堂 MOREJOY" fill sizes="220px" style={{ objectFit: 'contain', objectPosition: 'left center', mixBlendMode: 'screen' }} priority />
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,.45)', letterSpacing: 4, textTransform: 'uppercase', paddingLeft: 2 }}>教育管理系统</div>
      </div>
      <div style={{ position: 'absolute', top: 120, left: 24, right: 24, zIndex: 3, display: 'flex', gap: 7, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity .6s .12s ease, transform .6s .12s ease' }}>
        {STATS.map(({ val, label, gold }) => (
          <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,.14)', border: '0.5px solid rgba(255,255,255,.22)', borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2, color: gold ? '#f5a623' : '#fff' }}>{val}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 2, letterSpacing: '.5px' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 196, left: 24, right: 24, zIndex: 3, display: 'flex', flexWrap: 'wrap', gap: 5, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity .6s .22s ease, transform .6s .22s ease' }}>
        {HONORS.map(({ text, gold }) => (
          <span key={text} style={{ display: 'inline-flex', alignItems: 'center', background: gold ? 'rgba(245,166,35,.18)' : 'rgba(255,255,255,.1)', border: `0.5px solid ${gold ? 'rgba(245,166,35,.45)' : 'rgba(255,255,255,.22)'}`, borderRadius: 14, padding: '4px 10px', fontSize: 11, color: gold ? '#f5a623' : 'rgba(255,255,255,.8)' }}>{text}</span>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 28, left: 24, right: 24, zIndex: 3, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity .6s .08s ease, transform .6s .08s ease' }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 10, lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,.4)' }}>在思想的原野上<br/>放牧星辰</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.72)', lineHeight: 1.9, fontStyle: 'italic', paddingLeft: 0, marginBottom: 14 }}>
          这里不是填满容器的工坊，而是点燃火光的山谷。<br/>当公式与诗句在风中交织，<br/>当逻辑的刻刀与想象的诗筏共舞——<br/>我们以「牧者」之名，俯身轻抚每一粒思想的种子。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.14)', border: '0.5px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '5px 13px', fontSize: 11, color: '#fff', fontWeight: 500, width: 'fit-content' }}>🎯 更懂河北考生，助力家乡学子</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(232,120,74,.22)', border: '0.5px solid rgba(232,120,74,.45)', borderRadius: 20, padding: '4px 11px', fontSize: 10, color: 'rgba(255,255,255,.9)', width: 'fit-content' }}>✦ 加入我们，赢在起跑线</span>
        </div>
      </div>
    </section>
  )
}

function RightForm({
  role, setRole, division, setDivision, loading, formError, setFormError, onFinish, showPwd, setShowPwd, mounted,
  detectedRole, onEmailBlur, isMobile, reason,
}: {
  role: LoginRole; setRole: (r: LoginRole) => void
  division: LoginDivision; setDivision: (d: LoginDivision) => void
  loading: boolean
  formError: string; setFormError: (msg: string) => void
  onFinish: (values: { email: string; password: string }) => Promise<void>
  showPwd: boolean; setShowPwd: (v: boolean) => void
  mounted: boolean
  detectedRole: LoginRole | null
  onEmailBlur: (email: string) => void
  isMobile: boolean
  reason?: string | null
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
      <div style={{ width: '100%', maxWidth: 440, opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(16px)', transition: 'opacity .6s ease .15s, transform .6s ease .15s' }}>
        {isMobile && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#E87545', marginBottom: 6 }}>牧哲学堂</div>
            <div style={{ fontSize: 13, color: '#9a8e7a' }}>在思想的原野上，放牧星辰</div>
          </div>
        )}
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{ width: 200, height: 62, position: 'relative', margin: '0 auto 10px' }}>
            <Image src="/images/logo.jpg" alt="牧哲学堂" fill sizes="200px" style={{ objectFit: 'contain', objectPosition: 'center' }} priority />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to right, transparent, rgba(232,120,74,.4))' }} />
            <span style={{ fontSize: 12, color: '#9a8e7a', letterSpacing: 4, fontWeight: 400 }}>管理系统</span>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to left, transparent, rgba(232,120,74,.4))' }} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '34px 32px', border: '1px solid rgba(232,117,69,.12)', boxShadow: '0 18px 45px rgba(232,117,69,.12), 0 4px 12px rgba(0,0,0,.04)' }}>
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
                <button key={item.value} type="button" onClick={() => setRole(item.value)} style={{ height: 58, borderRadius: 10, cursor: 'pointer', border: active ? '1.5px solid #E87545' : '1px solid #EFE3DC', background: active ? '#FFF6F1' : '#fff', color: active ? '#E87545' : '#7d7468', transition: 'all .2s ease', padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: active ? '#c08560' : '#b8b0a5' }}>{item.hint}</div>
                </button>
              )
            })}
          </div>

          {(role === 'admin' || role === 'teacher') && (
            <div style={{ marginBottom: 20 }}>
              <Text style={{ color: '#9a8e7a', fontSize: 13, display: 'block', marginBottom: 8 }}>????</Text>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {DIVISION_OPTIONS.map((item) => {
                  const active = division === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setDivision(item.value)}
                      style={{
                        height: 44,
                        borderRadius: 10,
                        cursor: 'pointer',
                        border: active ? '1.5px solid #E87545' : '1px solid #EFE3DC',
                        background: active ? '#FFF6F1' : '#fff',
                        color: active ? '#E87545' : '#7d7468',
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        transition: 'all .2s ease',
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

          <div style={{ marginBottom: 16 }}>
            <Input
              prefix={<UserOutlined style={{ color: '#C5A28A' }} />}
              placeholder={PLACEHOLDER_MAP[role].email}
              autoComplete="username"
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
              prefix={<LockOutlined style={{ color: '#C5A28A' }} />}
              type={showPwd ? 'text' : 'password'}
              placeholder={PLACEHOLDER_MAP[role].pwd}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFormError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              status={formError ? 'error' : undefined}
              suffix={<span onClick={() => setShowPwd(!showPwd)} style={{ cursor: 'pointer', color: '#C5A28A' }}>{showPwd ? <EyeOutlined /> : <EyeInvisibleOutlined />}</span>}
              style={{ borderRadius: isMobile ? 12 : 10, height: isMobile ? 48 : 46, background: '#FAFAFA' }}
            />
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
          <Button type="primary" loading={loading} onClick={handleLogin} block style={{ height: isMobile ? 48 : 46, borderRadius: isMobile ? 12 : 10, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #E87545, #F09A5B)', border: 'none', boxShadow: '0 6px 18px rgba(232,117,69,.3)' }}>登录</Button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#c8c4be', marginTop: 10 }}>牧哲学堂 · 让每一位学生学有所成</p>
      </div>
    </section>
  )
}

function MobileBrandBar() {
  return (
    <div className="mobile-brand-bar" style={{ display: 'none', position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, #1a120a 0%, #2d1a0e 50%, #1a2820 100%)', width: '100%' }}>
      <div className="photo-strip" style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}><Image src="/images/photo-3.jpg" alt="" fill sizes="33vw" loading="lazy" style={{ objectFit: 'cover' }} /></div>
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}><Image src="/images/photo-1.jpg" alt="" fill sizes="33vw" loading="lazy" style={{ objectFit: 'cover' }} /></div>
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}><Image src="/images/photo-2.jpg" alt="" fill sizes="33vw" loading="lazy" style={{ objectFit: 'cover' }} /></div>
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(26,18,10,.6) 0%, rgba(26,18,10,.85) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '20px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: '100%', maxWidth: 180, height: 40, position: 'relative', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.3))' }}>
          <Image src="/images/logo.jpg" alt="牧哲学堂" fill sizes="180px" style={{ objectFit: 'contain', objectPosition: 'left center', mixBlendMode: 'screen' }} priority />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(245,166,35,.18)', border: '0.5px solid rgba(245,166,35,.4)', borderRadius: 10, padding: '2px 7px', fontSize: 9, color: '#f5a623', whiteSpace: 'nowrap' }}>🏆 家长信赖品牌</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', lineHeight: 1.3 }}>· 更懂河北考生，助力家乡学子</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STATS.map(({ val, label, gold }) => (
            <div key={label} style={{ flex: '1 1 0', minWidth: 0, background: 'rgba(255,255,255,.08)', borderRadius: 6, padding: '4px 3px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: gold ? '#f5a623' : '#fff', lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.55)', lineHeight: 1.4, fontStyle: 'italic', paddingLeft: 2 }}>在思想的原野上，放牧星辰</div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') return !sessionStorage.getItem('splash-shown')
    return false
  })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [role, setRole] = useState<LoginRole>('admin')
  const [division, setDivision] = useState<LoginDivision>('JUNIOR')
  const [mounted, setMounted] = useState(false)
  const [detectedRole, setDetectedRole] = useState<LoginRole | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const router = useRouter()
  const isMobile = useIsMobile() ?? false

  useEffect(() => {
    setMounted(true)
    setReason(new URLSearchParams(window.location.search).get('reason'))
  }, [])

  const handleSplashDone = () => {
    setShowSplash(false)
    if (typeof window !== 'undefined') sessionStorage.setItem('splash-shown', '1')
  }

  const detectRole = async (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) return
    try {
      const res = await fetch('/api/auth/detect-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
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
      const loginRes = await fetch('/api/auth/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: values.password, loginRole: role }),
      })
      const loginData = await loginRes.json().catch(() => null)

      if (!loginRes.ok) {
        const code = loginData?.code || ''
        const msg = ERROR_MESSAGES[code] || loginData?.error || '登录失败，请检查后重试'
        setFormError(msg)
        toast.error(msg, { duration: code === 'LOCKED' || code === 'ACCOUNT_LOCKED' ? 8000 : 5000 })
        setLoading(false)
        return
      }

      const result = await signIn('credentials', {
        email, password: values.password, loginRole: role, redirect: false,
      })

      if (!result || result.error) {
        setFormError('登录失败，请重新尝试')
        toast.error('登录失败，请重新尝试', { duration: 5000 })
        setLoading(false)
        return
      }

      fetch('/api/auth/log-device', { method: 'POST' }).catch((error) => console.warn('设备日志记录失败', error))

      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()
      const userRole = sessionData?.user?.role

      setFormError('')
      toast.success('登录成功，正在跳转...', { duration: 2000 })

      if (userRole === 'parent') router.push('/parent/dashboard')
      else if (userRole === 'teacher') router.push(`/teacher/dashboard?division=${division}`)
      else router.push(`/dashboard?division=${division}`)
      router.refresh()
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
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <MobileBrandBar />
      <div style={{ display: 'flex', minHeight: '100vh', background: '#faf8f5' }}>
        {!isMobile && <BrandLeft mounted={mounted} />}
        <RightForm
          role={role} setRole={setRole}
          division={division} setDivision={setDivision}
          loading={loading}
          formError={formError} setFormError={setFormError}
          onFinish={handleLogin}
          showPwd={showPwd} setShowPwd={setShowPwd}
          mounted={mounted}
          detectedRole={detectedRole} onEmailBlur={detectRole}
          isMobile={isMobile} reason={reason}
        />
      </div>
    </>
  )
}
