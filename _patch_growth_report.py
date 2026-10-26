# -*- coding: utf-8 -*-
import io

p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\students\[id]\growth-report\client.tsx'
with io.open(p, 'r', encoding='utf-8', newline='') as f:
    s = f.read()

# 1) import
old_import = "import { useIsMobile } from '@/hooks/useIsMobile'"
new_import = old_import + "\nimport { HoursLeaderboard } from '@/components/Parent/HoursLeaderboard'"
assert s.count(old_import) == 1
s = s.replace(old_import, new_import)

# 2) SWR data fetch after isMobile
old_swr = "const router = useRouter()\n  const isMobile = useIsMobile() ?? false"
new_swr = old_swr + """

  // 课时领先榜：本月课时 vs 同班同学（口径与家长首页一致，随孩子切换刷新）
  const hoursQuery = `/api/parent/hours-leaderboard?studentId=${studentId}`
  const { data: hoursData } = useSWR(hoursQuery, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
  })
  const leaderboardData = hoursData as
    | { studentName: string; mineHours: number; classmates: Array<{ id: string; name: string; hours: number }>; hasData: boolean }
    | undefined"""
assert s.count(old_swr) == 1
s = s.replace(old_swr, new_swr)

# 3) insert component after 学习概况 Row, before hasFeedback empty card
old_anchor = "      </Row>\n\n      {!report.availability.hasFeedback && ("
new_anchor = """      </Row>

      <div style={{ marginBottom: 14 }}>
        <HoursLeaderboard
          studentName={leaderboardData?.studentName || report.student.name || '我的孩子'}
          mineHours={leaderboardData?.mineHours ?? 0}
          classmates={leaderboardData?.classmates ?? []}
          hasData={leaderboardData?.hasData ?? false}
        />
      </div>

      {!report.availability.hasFeedback && ("""
assert s.count(old_anchor) == 1, 'anchor not found'
s = s.replace(old_anchor, new_anchor)

with io.open(p, 'w', encoding='utf-8', newline='') as f:
    f.write(s)

print('growth-report/client.tsx updated')
print('import ok:', "import { HoursLeaderboard } from '@/components/Parent/HoursLeaderboard'" in s)
print('SWR refs:', s.count('hours-leaderboard'))
print('component uses:', s.count('<HoursLeaderboard'))
