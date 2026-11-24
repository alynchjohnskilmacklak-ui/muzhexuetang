'use client'

import { useEffect, useRef, useState } from 'react'
import { Table } from 'antd'
import type { TableProps } from 'antd'

/** Ant tables keep their own horizontal scroll area; this adds a visible,
 * touch-friendly rail above wide tables so the overflow is easy to discover. */
export function HorizontalScrollTable<T extends object>(props: TableProps<T>) {
  const hostRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [metrics, setMetrics] = useState({ viewport: 0, content: 0 })
  const columnWidth = (props.columns || []).reduce((total, column) => (
    total + (typeof column.width === 'number' ? column.width : 0)
  ), 0)
  const declaredWidth = Math.max(
    typeof props.scroll?.x === 'number' ? props.scroll.x : 0,
    columnWidth,
  )
  const tableScroll = {
    ...props.scroll,
    x: declaredWidth || props.scroll?.x || 'max-content',
  }
  const hasOverflow = metrics.content > metrics.viewport + 2

  useEffect(() => {
    const host = hostRef.current
    const rail = railRef.current
    if (!host) return

    let scrollNodes: HTMLElement[] = []
    let syncing = false

    const maxScroll = (node: HTMLElement) => Math.max(0, node.scrollWidth - node.clientWidth)

    const syncScroll = (source: HTMLElement, left: number) => {
      if (syncing) return
      syncing = true
      const sourceMax = maxScroll(source)
      const progress = sourceMax ? Math.min(1, Math.max(0, left / sourceMax)) : 0
      if (rail && source !== rail) rail.scrollLeft = progress * maxScroll(rail)
      scrollNodes.forEach((node) => {
        if (node === source) return
        const targetLeft = progress * maxScroll(node)
        if (Math.abs(node.scrollLeft - targetLeft) > 1) node.scrollLeft = targetLeft
      })
      window.requestAnimationFrame(() => { syncing = false })
    }

    const onTableScroll = (event: Event) => {
      const source = event.currentTarget as HTMLElement
      syncScroll(source, source.scrollLeft)
    }
    const onRailScroll = () => {
      if (rail) syncScroll(rail, rail.scrollLeft)
    }

    const refresh = () => {
      const nextNodes = Array.from(host.querySelectorAll<HTMLElement>('.ant-table-content, .ant-table-body'))
      scrollNodes.forEach((node) => node.removeEventListener('scroll', onTableScroll))
      scrollNodes = nextNodes
      scrollNodes.forEach((node) => node.addEventListener('scroll', onTableScroll, { passive: true }))

      const viewport = Math.floor(host.getBoundingClientRect().width)
      const content = Math.max(viewport, declaredWidth, ...scrollNodes.map((node) => node.scrollWidth))
      setMetrics((current) => current.viewport === viewport && current.content === content
        ? current
        : { viewport, content })
    }

    rail?.addEventListener('scroll', onRailScroll, { passive: true })
    const resizeObserver = new ResizeObserver(refresh)
    resizeObserver.observe(host)
    const mutationObserver = new MutationObserver(refresh)
    mutationObserver.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] })
    refresh()

    return () => {
      rail?.removeEventListener('scroll', onRailScroll)
      scrollNodes.forEach((node) => node.removeEventListener('scroll', onTableScroll))
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [declaredWidth, hasOverflow])

  return (
    <div ref={hostRef} className="horizontal-table-host">
      {hasOverflow && (
        <div className="horizontal-table-scroll-control">
          <span>← 左右滑动查看更多 →</span>
          <div ref={railRef} className="horizontal-table-scroll-rail" role="region" aria-label="左右滑动查看表格完整内容" tabIndex={0}>
            <div style={{ width: metrics.content, height: 1 }} />
          </div>
        </div>
      )}
      <Table<T> {...props} scroll={tableScroll} />
    </div>
  )
}
