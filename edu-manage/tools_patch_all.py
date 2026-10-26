# -*- coding: utf-8 -*-
import io, os

ROOT = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src'

def patch(path, pairs, must_all=True):
    full = os.path.join(ROOT, path)
    t = open(full, encoding='utf-8', newline='').read()
    for old, new, count in pairs:
        if old not in t:
            print(f'  [MISS] {path}: {old[:60]!r}')
            if must_all:
                raise SystemExit(1)
            continue
        if count == 0:
            t = t.replace(old, new)
        else:
            assert t.count(old) == count, f'{path}: expected {count} of {old[:50]!r}, got {t.count(old)}'
            t = t.replace(old, new)
    open(full, 'w', encoding='utf-8', newline='').write(t)
    print(f'  [OK] {path}')

# 1. ParentLayout
patch('components/Layout/ParentLayout.tsx', [
    ("  BankOutlined,\n  AppstoreOutlined,",
     "  AccountBookOutlined,\n  BankOutlined,\n  AppstoreOutlined,", 1),
    ("{ key: '/parent/hour-records', icon: <ClockCircleOutlined />, label: '课时明细' },",
     "{ key: '/parent/archive?tab=hours', icon: <ClockCircleOutlined />, label: '课时与考勤' },\n      { key: '/parent/fees', icon: <AccountBookOutlined />, label: '缴费账单' },", 1),
    ("{ refreshInterval: 5_000, revalidateOnFocus: true, revalidateOnReconnect: true },",
     "{ refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true },", 1),
])

# 2. dashboard
patch('app/parent/dashboard/client.tsx', [
    ("router.push(`/parent/students/${activeStudent.id}/growth-report`)",
     "router.push(`/parent/archive?studentId=${activeStudent.id}`)", 1),
    ("    refreshInterval: 5_000,",
     "    refreshInterval: 30_000,", 1),
])

# 3. ParentLessonPreview (2 refs)
patch('components/Parent/ParentLessonPreview.tsx', [
    ("router.push('/parent/lesson-previews')",
     "router.push('/parent/archive?tab=materials')", 2),
])

# 4. ParentLessonPreviewHistory
patch('components/Parent/ParentLessonPreviewHistory.tsx', [
    ("{ refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true })",
     "{ refreshInterval: 30000, revalidateOnFocus: true, revalidateOnReconnect: true })", 1),
])

# 5. profile
patch('app/parent/profile/client.tsx', [
    ("router.push(`/parent/students/${s.id}/archive`)",
     "router.push(`/parent/archive?studentId=${s.id}`)", 1),
])

# 6. performance route link
patch('app/api/performance/route.ts', [
    ("link: '/parent/performance',",
     "link: '/parent/archive',", 1),
])

# 7. TeacherLayout messages polling
patch('components/Layout/TeacherLayout.tsx', [
    ("    refreshInterval: 5_000,\n    revalidateOnFocus: true,\n    revalidateOnReconnect: true,",
     "    refreshInterval: 30_000,\n    revalidateOnFocus: true,\n    revalidateOnReconnect: true,", 1),
])

print('ALL PATCHED')
