const ICP_RECORD_NUMBER = '冀ICP备2026028285号'

export function SiteFilingFooter() {
  return (
    <footer className="site-filing-footer" aria-label="网站备案信息">
      <span>© 2026 牧哲学堂</span>
      <span className="site-filing-footer__separator" aria-hidden="true">·</span>
      <span className="site-filing-footer__record">{ICP_RECORD_NUMBER}</span>
    </footer>
  )
}
