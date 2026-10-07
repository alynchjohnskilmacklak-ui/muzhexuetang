import { Skeleton } from 'antd'

export default function ParentLoading() {
  return (
    <main aria-busy="true" aria-label="页面加载中" style={{ padding: 16 }}>
      <Skeleton active title={{ width: 160 }} paragraph={{ rows: 4 }} />
    </main>
  )
}
