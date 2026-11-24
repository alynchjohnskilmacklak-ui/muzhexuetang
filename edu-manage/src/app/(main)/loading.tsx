import { Card, Skeleton } from 'antd'

export default function MainLoading() {
  return (
    <main aria-busy="true" aria-label="页面加载中" style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <Skeleton active title={{ width: 220 }} paragraph={{ rows: 1, width: '38%' }} />
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} style={{ borderRadius: 14, borderColor: 'var(--color-hairline)' }}>
            <Skeleton active title={{ width: '45%' }} paragraph={{ rows: 1, width: '68%' }} />
          </Card>
        ))}
      </div>
      <Card style={{ borderRadius: 14, borderColor: 'var(--color-hairline)' }}>
        <Skeleton active title={{ width: '32%' }} paragraph={{ rows: 4 }} />
      </Card>
    </main>
  )
}
