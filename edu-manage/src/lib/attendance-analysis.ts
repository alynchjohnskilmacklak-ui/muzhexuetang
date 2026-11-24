export type AttendanceAnalysisRecord = { studentId: string; studentName: string; groupName: string; status: string; lessonDate: Date | string }

function weekKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value || 0)
  const shanghaiDate = new Date(Date.UTC(value('year'), value('month') - 1, value('day')))
  const day = (shanghaiDate.getUTCDay() + 6) % 7
  shanghaiDate.setUTCDate(shanghaiDate.getUTCDate() - day)
  return `${shanghaiDate.getUTCFullYear()}-${String(shanghaiDate.getUTCMonth() + 1).padStart(2, '0')}-${String(shanghaiDate.getUTCDate()).padStart(2, '0')}`
}

export function analyzeAttendance(records: AttendanceAnalysisRecord[], now = new Date(), consecutiveThreshold = 2) {
  const weeks = new Map<string, { present: number; absent: number; leave: number; total: number }>()
  const byStudent = new Map<string, AttendanceAnalysisRecord[]>()
  for (const record of records) {
    const date = new Date(record.lessonDate)
    if (Number.isNaN(date.getTime()) || date > now) continue
    const key = weekKey(date)
    const week = weeks.get(key) || { present: 0, absent: 0, leave: 0, total: 0 }
    if (record.status === 'PRESENT' || record.status === 'MAKEUP') week.present += 1
    if (record.status === 'ABSENT') week.absent += 1
    if (record.status === 'LEAVE') week.leave += 1
    if (['PRESENT', 'MAKEUP', 'ABSENT', 'LEAVE'].includes(record.status)) week.total += 1
    weeks.set(key, week)
    const list = byStudent.get(record.studentId) || []
    list.push(record)
    byStudent.set(record.studentId, list)
  }
  const consecutiveAbsences = [...byStudent.entries()].flatMap(([studentId, items]) => {
    const ordered = [...items].sort((a, b) => new Date(b.lessonDate).getTime() - new Date(a.lessonDate).getTime())
    let streak = 0
    for (const item of ordered) {
      if (item.status === 'ABSENT') streak += 1
      else break
    }
    return streak >= consecutiveThreshold ? [{ studentId, studentName: ordered[0].studentName, groupName: ordered[0].groupName, streak, lastAbsentAt: new Date(ordered[0].lessonDate).toISOString() }] : []
  }).sort((a, b) => b.streak - a.streak || a.studentName.localeCompare(b.studentName, 'zh-CN'))
  const trend = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([week, values]) => ({ week, ...values, attendanceRate: values.total ? Math.round((values.present / values.total) * 100) : 0 }))
  return { trend, consecutiveAbsences }
}
