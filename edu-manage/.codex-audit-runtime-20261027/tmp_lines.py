# -*- coding: utf-8 -*-
import io, re, os

def lines(p):
    return io.open(p, encoding='utf-8', errors='ignore').read().split('\n')

def find_lines(p, pats, context=0):
    ls = lines(p)
    out = []
    for i, l in enumerate(ls, 1):
        for pat in pats:
            if pat in l:
                out.append((i, l.strip()[:100]))
                break
    return out

print('## 1. admin-nav.tsx (grades/performance/quota/communications 缺失证据=导航清单)')
for i, l in enumerate(lines('src/components/Layout/admin-nav.tsx'), 1):
    if "key:" in l and "/" in l:
        print('  L%-4d %s' % (i, l.strip()))

print()
print('## 2. HoursLeaderboard.tsx (已修复)')
print(find_lines('src/components/Parent/HoursLeaderboard.tsx',
                 ['maskName', 'hours > 0', 'filter(hours', 'hiddenCount', '排名', 'const TIERS', 'pct']))

print()
print('## 3. PdfCanvasViewer.tsx (已修复)')
print(find_lines('src/components/Common/PdfCanvasViewer.tsx',
                 ['自动重试', 'loadError', '下载', 'try again', 'reload', 'retryCount']))

print()
print('## 4. archive/client.tsx (已修复-布局)')
print(find_lines('src/app/parent/archive/client.tsx',
                 ['overviewTrendSeries', 'borderRadius: 999', 'hint', 'miniLine', 'TABS =']))

print()
print('## 5. 固定宽度/Table 无 scroll 行号')
for p in ['src/app/(main)/meals/StudentMealLedger.tsx',
          'src/app/(main)/volunteer-sim/official-form/page.tsx',
          'src/app/(main)/volunteer-sim/rank-query/page.tsx',
          'src/app/(main)/notifications/page.tsx',
          'src/app/(main)/student-archive/page.tsx',
          'src/app/teacher/salary/page.tsx']:
    if not os.path.exists(p):
        print('  MISSING', p); continue
    hits = find_lines(p, ['1120', '1000', 'width:', '<Table'])
    print('  %s -> %s' % (p.replace('src/', ''), hits[:5]))

print()
print('## 6. 大文件行数')
for p in ['src/app/(main)/volunteer-sim/rank-query/page.tsx',
          'src/app/(main)/volunteer-sim/page.tsx',
          'src/app/teacher/feedback/page.tsx',
          'src/app/(main)/courses/page.tsx']:
    ls = lines(p)
    print('  %-45s %d lines' % (p.replace('src/', ''), len(ls)))

print()
print('## 7. 轮询行号')
for p in ['src/app/(main)/courses/[id]/page.tsx',
          'src/app/(main)/schedule/intensive/page.tsx',
          'src/components/Layout/TopNav.tsx']:
    if not os.path.exists(p):
        print('  MISSING', p); continue
    print('  %s' % p.replace('src/', ''))
    for i, l in enumerate(lines(p), 1):
        if 'refreshInterval' in l:
            print('    L%-5d %s' % (i, l.strip()[:80]))

print()
print('## 8. TeacherLayout services 行号')
for i, l in enumerate(lines('src/components/Layout/TeacherLayout.tsx'), 1):
    if '业务总览' in l:
        print('  L%-4d %s' % (i, l.strip()[:80]))

print()
print('## 9. importmodal/copyfriday modal width')
for p in ['src/app/(main)/students/_components/ImportModal.tsx',
          'src/app/(main)/schedule/_components/CopyFridayToSaturdayModal.tsx']:
    print('  %s' % p.replace('src/', ''))
    for i, l in enumerate(lines(p), 1):
        if 'width' in l and ('{' in l or '=' in l) and '720' in l or '640' in l and 'width' in l:
            print('    L%-5d %s' % (i, l.strip()[:90]))
