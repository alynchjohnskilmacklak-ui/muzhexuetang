export function LayoutHydrationFallback() {
  return (
    <div className="layout-hydration-fallback" role="status" aria-live="polite" aria-busy="true">
      <div className="layout-hydration-fallback__card">
        <span className="layout-hydration-fallback__mark" aria-hidden="true">牧</span>
        <span className="layout-hydration-fallback__copy">
          <span className="layout-hydration-fallback__title">牧哲学堂</span>
          <span className="layout-hydration-fallback__status">正在准备页面…</span>
        </span>
      </div>
    </div>
  )
}
