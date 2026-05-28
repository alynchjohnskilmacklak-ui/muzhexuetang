import { Suspense } from 'react'
import { Spin } from 'antd'
import { DataAdminClient } from './client'

export default function DataAdminPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>}>
      <DataAdminClient />
    </Suspense>
  )
}
