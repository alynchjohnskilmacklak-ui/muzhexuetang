export type SalaryBucket = 'SMALL_CLASS' | 'INTENSIVE'

export type SalaryBucketContext = {
  lessonIsIntensive?: boolean
  feedbackIsIntensive?: boolean
  description?: string | null
}

const INTENSIVE_DESCRIPTION_PATTERN = /个性化|突击全能|一对一|一对二|一对三/

export function classifySalaryBucket(context: SalaryBucketContext): SalaryBucket {
  if (context.lessonIsIntensive || context.feedbackIsIntensive) return 'INTENSIVE'
  if (INTENSIVE_DESCRIPTION_PATTERN.test(context.description || '')) return 'INTENSIVE'
  return 'SMALL_CLASS'
}

export function salaryBucketLabel(bucket: SalaryBucket) {
  return bucket === 'INTENSIVE' ? '一对一/二/三薪资' : '小班课薪资'
}
