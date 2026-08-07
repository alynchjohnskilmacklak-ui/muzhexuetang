import type { Metadata } from 'next'
import { ResetPasswordClient } from './reset-password-client'

export const metadata: Metadata = {
  title: '重置密码｜牧哲学堂',
  robots: { index: false, follow: false },
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const params = await searchParams
  const token = Array.isArray(params.token) ? params.token[0] : params.token
  return <ResetPasswordClient token={token || ''} />
}

