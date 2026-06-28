export type SchoolNameRecord = { id: string; name: string; fullName: string }

const CAMPUS_TOKENS = ['东校区', '西校区', '新华', '未来', '第二实验', '二中实验', '正中实验']

export function normalizeVolunteerSchoolName(value: string) {
  return value
    .normalize('NFKC')
    .replace(/（其他县区）|\(其他县区\)|（新乐）|\(新乐\)/g, '')
    .replace(/石家庄市|石家庄|河北省|河北/g, '')
    .replace(/行唐县/g, '行唐')
    .replace(/新乐市/g, '新乐')
    .replace(/有限责任公司|有限公司/g, '')
    .replace(/[\s·•]/g, '')
    .replace(/高级中学$/, '中学')
    .replace(/第一中学/g, '一中')
    .replace(/第二中学/g, '二中')
    .replace(/第三中学/g, '三中')
    .replace(/第四中学/g, '四中')
    .trim()
}

function campusCompatible(source: string, candidate: string) {
  for (const token of CAMPUS_TOKENS) {
    if (source.includes(token) !== candidate.includes(token)) return false
  }
  return true
}

export function findVolunteerSchoolMatch<T extends SchoolNameRecord>(schoolName: string, schools: T[]) {
  const source = normalizeVolunteerSchoolName(schoolName)
  const matches = schools.filter((school) => {
    const names = [school.name, school.fullName].map(normalizeVolunteerSchoolName)
    return names.some((name) => name === source && campusCompatible(source, name))
  })
  return matches.length === 1 ? matches[0] : null
}
