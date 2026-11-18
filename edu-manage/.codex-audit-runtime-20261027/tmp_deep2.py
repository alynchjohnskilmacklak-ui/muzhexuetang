# -*- coding: utf-8 -*-
import io, os, re

def read(p):
    try:
        return io.open(p, encoding='utf-8', errors='ignore').read()
    except Exception:
        return ''

def head(t, n=350):
    lines = t.split('\n')
    body = [ln for ln in lines if not ln.strip().startswith('import')]
    return ' '.join(body)[:n]

def api_list(t):
    return ', '.join(sorted(set(re.findall(r'["\'](/api/[a-z0-9/_-]+)["\']', t)))[:8])

items = [
    ('teacher services comp', 'src/components/Services/ServiceOverviewPage.tsx'),
    ('admin dashboard', 'src/app/(main)/dashboard/page.tsx'),
    ('admin reports', 'src/app/(main)/reports/page.tsx'),
    ('admin data-admin client', 'src/app/(main)/data-admin/client.tsx'),
    ('admin teacher-logs', 'src/app/(main)/teacher-logs/page.tsx'),
    ('admin trash', 'src/app/(main)/trash/page.tsx'),
    ('teacher schedule', 'src/app/teacher/schedule/page.tsx'),
    ('admin study-hall comp', 'src/components/study-hall/StudyHallWorkspace.tsx'),
]
for label, p in items:
    print('=' * 66)
    print(label, '->', p, 'exists:', os.path.exists(p))
    if not os.path.exists(p):
        continue
    t = read(p)
    print('len', len(t))
    print('apis:', api_list(t))
    print('head:', head(t))
