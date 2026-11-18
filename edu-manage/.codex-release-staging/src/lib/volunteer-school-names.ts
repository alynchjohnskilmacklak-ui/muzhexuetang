export const SENIOR_SCHOOL_NAME_ALIASES: Readonly<Record<string, string>> = {
  '新乐一中': '新乐市第一中学',
  '辛集中学': '河北辛集中学',
  '正定中学': '河北正定中学',
  '石家庄实验': '石家庄实验中学',
  '石家庄二实验': '石家庄第二实验中学',
  '石家庄金石高级中学有限公司': '石家庄金石高级中学',
  '行唐县启明中学': '行唐启明中学',
  '石家庄卓越中学（东校区）': '石家庄卓越中学东校区',
  '石家庄卓越中学（西校区）': '石家庄卓越中学西校区',
}

export function normalizeSeniorSchoolName(name: string) {
  const trimmed = name.trim()
  return SENIOR_SCHOOL_NAME_ALIASES[trimmed] ?? trimmed
}

export function normalizeSchoolNameWithoutScope(name: string) {
  return name
    .replace(/（[^）]*）|\([^)]*\)|【[^】]*】|\[[^\]]*\]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

export function hasSchoolNameScope(name: string) {
  return /（[^）]*）|\([^)]*\)|【[^】]*】|\[[^\]]*\]/.test(name)
}

export function seniorSchoolNameMatches(dbName: string, dbFullName: string, allocationName: string) {
  const normalizedAllocation = normalizeSeniorSchoolName(allocationName)
  return normalizeSeniorSchoolName(dbName) === normalizedAllocation
    || normalizeSeniorSchoolName(dbFullName) === normalizedAllocation
}
