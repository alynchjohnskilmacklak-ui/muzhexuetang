export function LayoutHydrationFallback() {
  return (
    <div className="layout-hydration-fallback" role="status" aria-live="polite" aria-busy="true">
      <div className="layout-hydration-fallback__card">
        <div className="layout-hydration-fallback__mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-small-128.webp"
            alt="牧哲学堂"
            className="layout-hydration-fallback__logo"
          />
        </div>
        <span className="layout-hydration-fallback__copy">
          <span className="layout-hydration-fallback__title">牧哲学堂</span>
          <span className="layout-hydration-fallback__status">正在准备页面…</span>
        </span>
      </div>
    </div>
  )
}
