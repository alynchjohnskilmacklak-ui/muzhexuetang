'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Form, Input, Result, Typography } from 'antd'
import { CheckCircleFilled, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/password-policy'
import styles from './reset-password.module.css'

const { Paragraph, Text, Title } = Typography

export function ResetPasswordClient({ token }: { token: string }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const password = Form.useWatch('newPassword', form) || ''
  const policy = useMemo(() => validatePassword(password), [password])

  const submit = async ({ newPassword }: { newPassword: string }) => {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '密码重置失败，请重新申请链接')
      setCompleted(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '密码重置失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="reset-password-title">
        <div className={styles.brand}>
          <span className={styles.brandMark}>牧</span>
          <div>
            <Text className={styles.brandName}>牧哲学堂</Text>
            <Text className={styles.brandCaption}>安全账户中心</Text>
          </div>
        </div>

        {!token ? (
          <Result
            status="warning"
            title="重置链接无效"
            subTitle="链接可能不完整或已失效，请返回登录页重新申请。"
            extra={<Link href="/login"><Button type="primary">返回登录</Button></Link>}
          />
        ) : completed ? (
          <Result
            icon={<CheckCircleFilled className={styles.successIcon} />}
            title="密码已重置"
            subTitle="旧设备的登录状态已失效，请使用新密码重新登录。"
            extra={<Link href="/login"><Button type="primary" size="large">使用新密码登录</Button></Link>}
          />
        ) : (
          <>
            <div className={styles.heading}>
              <span className={styles.securityIcon}><SafetyCertificateOutlined /></span>
              <div>
                <Title id="reset-password-title" level={2}>设置新密码</Title>
                <Paragraph>新密码设置成功后，其他设备会自动退出登录。</Paragraph>
              </div>
            </div>

            <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
              <Form.Item
                name="newPassword"
                label="新密码"
                validateFirst
                rules={[
                  { required: true, message: '请输入新密码' },
                  { validator: async (_, value) => {
                    const result = validatePassword(String(value || ''))
                    if (!result.valid) throw new Error(result.errors[0])
                  } },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  size="large"
                  autoComplete="new-password"
                  placeholder={`至少 ${PASSWORD_MIN_LENGTH} 位，包含英文字母`}
                />
              </Form.Item>

              <div className={styles.policy} aria-live="polite">
                <Text strong>安全要求</Text>
                <ul>
                  <li className={password.length >= PASSWORD_MIN_LENGTH ? styles.passed : ''}>至少 {PASSWORD_MIN_LENGTH} 位</li>
                  <li className={/[A-Za-z]/.test(password) ? styles.passed : ''}>包含英文字母</li>
                  <li className={password && !/\s/.test(password) ? styles.passed : ''}>不包含空格或常见弱密码</li>
                </ul>
              </div>

              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请再次输入新密码' },
                  ({ getFieldValue }) => ({
                    validator: async (_, value) => {
                      if (!value || getFieldValue('newPassword') === value) return
                      throw new Error('两次输入的密码不一致')
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  size="large"
                  autoComplete="new-password"
                  placeholder="再次输入新密码"
                />
              </Form.Item>

              {error && <div className={styles.error} role="alert">{error}</div>}

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={submitting}
                disabled={Boolean(password) && !policy.valid}
              >
                确认重置密码
              </Button>
            </Form>

            <div className={styles.footer}>
              <Link href="/login">返回登录</Link>
              <Text>链接有效期为 30 分钟</Text>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

