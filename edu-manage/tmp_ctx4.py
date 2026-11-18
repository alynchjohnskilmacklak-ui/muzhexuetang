# -*- coding: utf-8 -*-
import io, os, re

# 1) find student creation submit in students dir
root = 'src/app/(main)/students'
for dp, _, fs in os.walk(root):
    for f in fs:
        if not f.endswith('.tsx'):
            continue
        p = os.path.join(dp, f)
        t = io.open(p, encoding='utf-8', errors='ignore').read()
        for m in re.finditer(r"method:\s*['\"](POST)['\"]", t):
            seg = t[m.start() - 500:m.start() + 300]
            if '/api/students' in seg:
                print('=' * 20, p.replace('src/', ''))
                print(seg[:700])
                break

# 2) upload route POST
t = io.open('src/app/api/upload/route.ts', encoding='utf-8', errors='ignore').read()
i = t.find('export async function POST')
print('=' * 20, 'upload route POST head')
print(t[i:i + 1500])
