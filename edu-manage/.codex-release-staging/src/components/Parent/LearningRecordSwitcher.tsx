'use client'

import { BookOutlined, ReadOutlined } from '@ant-design/icons'
import { Segmented } from 'antd'
import { usePathname, useRouter } from 'next/navigation'

export function LearningRecordSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const value = pathname.startsWith('/parent/study-hall') ? 'study-hall' : 'classroom'

  return (
    <Segmented
      block
      value={value}
      options={[
        { value: 'classroom', label: '课堂反馈', icon: <BookOutlined /> },
        { value: 'study-hall', label: '晚托作业', icon: <ReadOutlined /> },
      ]}
      onChange={(next) => router.push(next === 'study-hall' ? '/parent/study-hall' : '/parent/class-feedback')}
      style={{ marginBottom: 16 }}
    />
  )
}
