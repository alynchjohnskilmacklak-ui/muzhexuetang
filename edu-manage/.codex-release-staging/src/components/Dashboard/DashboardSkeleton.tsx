export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="正在加载数据总览">
      <div className="dashboard-skeleton-metrics">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="dashboard-skeleton-card" />
        ))}
      </div>
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton-panel dashboard-skeleton-panel-wide" />
        <div className="dashboard-skeleton-panel" />
      </div>
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton-panel" />
        <div className="dashboard-skeleton-panel dashboard-skeleton-panel-wide" />
      </div>
    </div>
  )
}
