'use client'

import useSWR from 'swr'
import { Spin } from 'antd'
import { TeacherBenefitsClient } from '../benefits/client'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// 福利 Tab：通过 API 拉取服务端配置后渲染（benefits 页面本身是服务端组件，无法被客户端 Tab 直接引入）
export function BenefitsLazyTab() {
  const { data, error, isLoading } = useSWR('/api/teacher/benefits', fetcher)

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
  }
  if (error || !data?.content) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#98A2B3' }}>福利数据加载失败，请稍后重试</div>
  }

  return (
    <TeacherBenefitsClient
      content={data.content}
      teacherName={data.teacherName || '老师'}
      tierLevel={data.tierLevel || ''}
    />
  )
}
