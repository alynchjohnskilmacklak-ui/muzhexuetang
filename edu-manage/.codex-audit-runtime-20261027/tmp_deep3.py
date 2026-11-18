# -*- coding: utf-8 -*-
import io, os, re

def read(p):
    try:
        return io.open(p, encoding='utf-8', errors='ignore').read()
    except Exception:
        return ''

def body_head(t, n=500):
    lines = t.split('\n')
    out = []
    for ln in lines:
        if ln.strip().startswith('import') or ln.strip().startswith('use client'):
            continue
        out.append(ln)
    return ' '.join(out)[:n]

def apis(t):
    return ', '.join(sorted(set(re.findall(r'["\'](/api/[a-z0-9/_-]+)["\']', t)))[:8])

items = [
    ('grades page', 'src/app/(main)/grades/page.tsx'),
    ('volunteer page', 'src/app/(main)/volunteer/page.tsx'),
    ('volunteer-sim official-form', 'src/app/(main)/volunteer-sim/official-form/page.tsx'),
    ('teacher dashboard', 'src/app/teacher/dashboard/page.tsx'),
    ('teacher intensive', 'src/app/teacher/intensive/page.tsx'),
    ('parent layout nav', 'src/components/Layout/ParentLayout.tsx'),
]
for label, p in items:
    print('=' * 66)
    print(label, '->', p, os.path.exists(p))
    if not os.path.exists(p):
        continue
    t = read(p)
    print('len', len(t), '| apis:', apis(t))
    print(body_head(t))
