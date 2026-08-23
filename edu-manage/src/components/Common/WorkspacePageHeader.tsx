import type { ReactNode } from 'react'

export function WorkspacePageHeader({
  title,
  subtitle,
  eyebrow = '牧哲学堂 · 工作台',
  actions,
}: {
  title: string
  subtitle?: ReactNode
  eyebrow?: string
  actions?: ReactNode
}) {
  return (
    <header className="workspace-page-header">
      <div className="workspace-page-header__intro">
        <div className="workspace-page-header__eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {subtitle ? <div className="workspace-page-header__subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="workspace-page-header__actions">{actions}</div> : null}
    </header>
  )
}
