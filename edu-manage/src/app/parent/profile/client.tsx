'use client'

import { useState } from 'react'
import { Typography, Image, Button, Form, Input, Empty } from 'antd'
import { useRouter } from 'next/navigation'
import {
  MailOutlined, CalendarOutlined, LockOutlined, RightOutlined,
  TeamOutlined, SafetyCertificateOutlined, BookOutlined,
} from '@ant-design/icons'
import { fmtFull } from '@/lib/format-date'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/password-policy'
import { clearSensitiveBrowserStorage } from '@/lib/client-sensitive-storage'
import { BrandModal } from '@/components/Common/BrandModal'

const { Title, Text } = Typography
type ParentUser = { name: string; role: string; email: string; createdAt: string }
type StudentInfo = { id: string; name: string; grade?: string | null; school?: string | null; gender?: string | null; teachers: string[] }

export function ParentProfileClient({
  user, studentInfo,
}: {
  user: ParentUser
  studentInfo: StudentInfo[]
}) {
  const router = useRouter()
  const [changingPwd, setChangingPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '修改失败'); return }
      toast.success('密码已修改，下次登录请使用新密码')
      setChangingPwd(false)
      form.resetFields()
      clearSensitiveBrowserStorage()
      await signOut({ callbackUrl: `${window.location.origin}/login?reason=password-changed` })
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ padding: '0 0 60px', overflowX: 'clip' }}>
      {/* 品牌头部 */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(150deg,#1B4A3D 0%,#0E5E4E 55%,#123C35 100%)',
        borderRadius: '0 0 26px 26px', padding: '22px 18px 26px', color: '#fff',
        boxShadow: '0 10px 26px rgba(14,94,78,.22)',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.30),transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: -70, left: -40, width: 150, height: 150, borderRadius: 999, background: 'radial-gradient(circle,rgba(255,255,255,.08),transparent 65%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image src="/images/logo-small.png" alt="牧哲学堂" width={52} height={52} style={{ borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} preview={false} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.68)', letterSpacing: .5 }}>家长端 · 个人中心</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: .3, marginTop: 2 }}>{user.name}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.82)', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '2px 10px' }}>
              <SafetyCertificateOutlined style={{ color: '#C9A45C' }} /> {user.role === 'parent' ? '家长' : user.role}
            </div>
          </div>
        </div>
      </div>

      {/* 账号信息 */}
      <div style={{ margin: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 9, borderLeft: '3px solid #0E5E4E' }}>
          <TeamOutlined style={{ color: '#0E5E4E' }} />
          <Text strong style={{ color: '#123C35', fontSize: 15 }}>账号信息</Text>
        </div>
        <div style={{ borderRadius: 16, border: '1px solid #EEE7E1', background: '#fff', overflow: 'hidden', boxShadow: '0 2px 10px rgba(26,18,1,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F3EDE6' }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,rgba(14,94,78,.12),rgba(14,94,78,.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0E5E4E', fontSize: 15 }}>
              <MailOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#9A8E7A' }}>账号邮箱</div>
              <div style={{ fontSize: 13.5, color: '#123C35', fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F3EDE6' }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,rgba(201,164,92,.20),rgba(201,164,92,.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A5823F', fontSize: 15 }}>
              <CalendarOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#9A8E7A' }}>注册时间</div>
              <div style={{ fontSize: 13.5, color: '#123C35', fontWeight: 600, marginTop: 1 }}>{fmtFull(user.createdAt)}</div>
            </div>
          </div>
          <button type="button" onClick={() => setChangingPwd(true)} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,rgba(232,120,74,.14),rgba(232,120,74,.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: 15 }}>
              <LockOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: '#123C35', fontWeight: 600 }}>修改密码</div>
              <div style={{ fontSize: 11, color: '#9A8E7A', marginTop: 1 }}>定期修改密码更安全</div>
            </div>
            <RightOutlined style={{ color: '#C9A45C', fontSize: 13 }} />
          </button>
        </div>
      </div>

      {/* 子女信息 */}
      <div style={{ margin: '18px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingLeft: 9, borderLeft: '3px solid #0E5E4E' }}>
          <BookOutlined style={{ color: '#0E5E4E' }} />
          <Text strong style={{ color: '#123C35', fontSize: 15 }}>子女信息</Text>
          <Text style={{ marginLeft: 'auto', color: '#9A8E7A', fontSize: 11.5 }}>{studentInfo.length} 位学员</Text>
        </div>

        {studentInfo.length === 0 ? (
          <div style={{ borderRadius: 16, border: '1px solid #EEE7E1', background: '#fff', padding: '36px 16px', textAlign: 'center' }}>
            <Empty description="暂无绑定学生" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {studentInfo.map((s, index) => (
              <div key={s.id} style={{ borderRadius: 16, border: '1px solid #EEE7E1', background: '#fff', padding: 14, boxShadow: '0 2px 10px rgba(26,18,1,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <StudentAvatar photoUrl={null} gender={s.gender} name={s.name} size={46} />
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ fontSize: 15.5, color: '#123C35' }}>{s.name}</Text>
                      <div style={{ fontSize: 12, color: '#7A6A55', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[s.grade, s.school].filter(Boolean).join(' · ') || '暂无学校信息'}
                      </div>
                    </div>
                  </div>
                </div>

                {s.teachers.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#9A8E7A', marginBottom: 6 }}>授课老师</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {s.teachers.map((t: string, i: number) => (
                        <span key={t} style={{
                          padding: '3px 10px', borderRadius: 999,
                          background: i % 2 === 0 ? 'rgba(14,94,78,.08)' : 'rgba(232,120,74,.10)',
                          color: i % 2 === 0 ? '#0E5E4E' : '#C2572C',
                          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => router.push(`/parent/archive?studentId=${s.id}`)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 16px', borderRadius: 999,
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 700,
                    boxShadow: '0 4px 10px rgba(232,120,74,.24)',
                  }}>
                    查看学习档案 <RightOutlined style={{ fontSize: 11 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 修改密码弹窗 */}
      <BrandModal
        open={changingPwd}
        onCancel={() => { setChangingPwd(false); form.resetFields() }}
        title={null}
        footer={null}
        width={420}
        destroyOnClose
        className="safe-form-discard-modal"
        styles={{
          mask: { background: 'rgba(18,60,53,.48)', backdropFilter: 'blur(2px)' },
          content: {
            borderRadius: 20, overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(255,255,255,.97) 0%, rgba(251,247,238,.97) 100%), url(/images/logo.jpg) right bottom / 220px auto no-repeat',
          },
        }}
      >
        <div style={{ padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,rgba(232,120,74,.14),rgba(232,120,74,.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E8784A', fontSize: 17 }}>
              <LockOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: '#123C35', fontWeight: 800 }}>修改密码</Title>
              <div style={{ fontSize: 11.5, color: '#9A8E7A', marginTop: 2 }}>修改后需重新登录</div>
            </div>
          </div>
          <Form form={form} layout="vertical" onFinish={handleChangePassword}>
            <Form.Item name="oldPassword" label={<span style={{ color: '#123C35', fontWeight: 600 }}>当前密码</span>} rules={[{ required: true, message: '请输入当前密码' }]}>
              <Input.Password placeholder="输入当前密码" style={{ borderRadius: 10, height: 44 }} />
            </Form.Item>
            <Form.Item name="newPassword" label={<span style={{ color: '#123C35', fontWeight: 600 }}>新密码</span>} rules={[
              { required: true, message: '请输入新密码' },
              {
                validator: async (_rule, value) => {
                  if (!value) return
                  const result = validatePassword(value)
                  if (!result.valid) throw new Error(result.errors[0])
                },
              },
            ]}>
              <Input.Password placeholder={`至少${PASSWORD_MIN_LENGTH}位，包含英文字母`} style={{ borderRadius: 10, height: 44 }} />
            </Form.Item>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button onClick={() => { setChangingPwd(false); form.resetFields() }} style={{ borderRadius: 10, height: 40, padding: '0 20px' }}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}
                style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 10, height: 40, padding: '0 22px', fontWeight: 700, boxShadow: '0 4px 10px rgba(182,79,40,.24)' }}>
                确认修改
              </Button>
            </div>
          </Form>
        </div>
      </BrandModal>
    </div>
  )
}
