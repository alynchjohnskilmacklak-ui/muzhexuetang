'use client'

import { Button, Result } from 'antd'
import { useEffect } from 'react'

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Result
        status="error"
        title="页面出错了"
        subTitle="抱歉，加载时遇到问题。可重试，或返回上一页。"
        extra={[
          <Button type="primary" key="retry" onClick={() => reset()} style={{ background: '#E8784A', borderColor: '#E8784A' }}>重试</Button>,
          <Button key="back" onClick={() => history.back()}>返回</Button>,
        ]}
      />
    </div>
  )
}
