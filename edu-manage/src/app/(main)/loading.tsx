import { Skeleton } from 'antd'

export default function MainLoading() {
  return (
    <main aria-busy="true" aria-label="页面加载中" style={{ padding: 24 }}>
      <Skeleton active title={{ width: 180 }} paragraph={{ rows: 5 }} />
    </main>
  )
}
