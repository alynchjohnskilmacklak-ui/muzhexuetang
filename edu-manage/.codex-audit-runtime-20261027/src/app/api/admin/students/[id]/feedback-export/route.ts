import { NextRequest } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { handleFeedbackExport } from './handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler((request: NextRequest, context: { params: Promise<{ id: string }> }) => (
  handleFeedbackExport(request, context)
))
