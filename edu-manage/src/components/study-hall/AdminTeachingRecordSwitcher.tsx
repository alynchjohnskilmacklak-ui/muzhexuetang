'use client'

import { Segmented } from 'antd'
import { usePathname, useRouter } from 'next/navigation'

export function AdminTeachingRecordSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const value = pathname.startsWith('/study-hall') ? 'study-hall' : 'feedback'

  return (
    <Segmented
      block
      value={value}
      onChange={(next) => router.push(next === 'study-hall' ? '/study-hall' : '/classroom-feedback')}
      options={[
        { label: '课堂成长反馈', value: 'feedback' },
        { label: '晚托作业记录', value: 'study-hall' },
      ]}
      style={{ marginBottom: 16, maxWidth: 420 }}
    />
  )
}
