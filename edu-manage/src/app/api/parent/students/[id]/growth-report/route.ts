import { apiHandler } from '@/lib/api-handler'
import { handleParentGrowthReport } from './handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(handleParentGrowthReport)

