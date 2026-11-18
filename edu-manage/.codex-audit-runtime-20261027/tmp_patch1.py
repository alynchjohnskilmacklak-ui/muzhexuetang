# -*- coding: utf-8 -*-
import io, sys

path = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\client.tsx'
with io.open(path, encoding='utf-8', newline='') as f:
    t = f.read()

old = """  const weakTopics = useMemo(() => {
    const counts = new Map<string, number>()
    studentPapers.forEach(p => p.questions.filter(q => q.mastery === 'NEEDS_PRACTICE').forEach(q => counts.set(q.topic, (counts.get(q.topic) || 0) + 1)))
    return Array.from(counts.entries()).sort((a, b) => b - a).slice(0, 5)
  }, [studentPapers])"""

new = """  const weakTopics = useMemo(() => {
    const counts = new Map<string, number>()
    studentPapers.forEach(p => p.questions.filter(q => q.mastery === 'NEEDS_PRACTICE').forEach(q => counts.set(q.topic, (counts.get(q.topic) || 0) + 1)))
    return Array.from(counts.entries()).sort((a, b) => b - a).slice(0, 5)
  }, [studentPapers])

  // 概览「学习趋势」迷你折线：按日期聚合各科掌握率平均（无成绩数据时保持原状态卡）
  const overviewTrendSeries = useMemo(() => {
    if (!profile?.record?.trendBySubject?.length) return null
    const byDate = new Map<string, { sum: number; count: number }>()
    profile.record.trendBySubject.forEach((subject) => {
      ;(subject.points || []).forEach((point) => {
        const key = typeof point.date === 'string' ? point.date.slice(0, 10) : ''
        if (!key) return
        const current = byDate.get(key) || { sum: 0, count: 0 }
        current.sum += Number(point.pct) || 0
        current.count += 1
        byDate.set(key, current)
      })
    })
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => [date, Math.round(value.sum / value.count)])
  }, [profile])"""

if old not in t:
    print('OLD NOT FOUND')
    sys.exit(1)
t = t.replace(old, new, 1)
with io.open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(t)
print('weakTopics memo patched OK')
