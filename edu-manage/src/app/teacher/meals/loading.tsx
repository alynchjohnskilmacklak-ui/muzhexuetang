import { Skeleton } from 'antd'

export default function MealsLoading() {
  return (
    <div style={{ padding: 16 }}>
      <Skeleton active paragraph={{ rows: 4 }} style={{ marginBottom: 12 }} />
      <Skeleton active paragraph={{ rows: 3 }} />
    </div>
  )
}
