'use client'

import { Empty, Table } from 'antd'
import type { TableProps } from 'antd'
import { useIsMobile } from '@/hooks/useIsMobile'

type ResponsiveTableProps<T extends object> = TableProps<T> & {
  mobileEmptyText?: string
  renderMobileItem: (record: T, index: number) => React.ReactNode
}

export function ResponsiveTable<T extends object>({
  dataSource,
  renderMobileItem,
  mobileEmptyText = '暂无记录',
  scroll,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile() ?? false
  const records = Array.isArray(dataSource) ? dataSource : []

  if (isMobile) {
    if (!records.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={mobileEmptyText} />
    }
    return (
      <div className="responsive-card-list">
        {records.map((record, index) => renderMobileItem(record, index))}
      </div>
    )
  }

  return (
    <Table
      {...tableProps}
      dataSource={dataSource}
      scroll={scroll || { x: 720 }}
    />
  )
}
