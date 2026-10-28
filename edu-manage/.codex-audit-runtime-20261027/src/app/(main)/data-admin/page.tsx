import { Suspense } from 'react'
import { DataAdminClient } from './client'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'

export default function DataAdminPage() {
  return (
    <Suspense fallback={<CardSkeleton rows={3} />}>
      <DataAdminClient />
    </Suspense>
  )
}
