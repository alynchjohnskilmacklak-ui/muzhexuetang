'use client'

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="正在加载内容" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: 'var(--color-surface-1, #fff)', border: '1px solid var(--color-hairline, rgba(0,0,0,.06))', borderRadius: 14, padding: 16 }}>
          <div className="mz-skeleton" style={{ width: '40%', height: 14, borderRadius: 6, marginBottom: 10 }} />
          <div className="mz-skeleton" style={{ width: '100%', height: 12, borderRadius: 6, marginBottom: 8 }} />
          <div className="mz-skeleton" style={{ width: '65%', height: 12, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  )
}
