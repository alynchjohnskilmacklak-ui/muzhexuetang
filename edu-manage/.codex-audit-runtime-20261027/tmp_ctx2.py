# -*- coding: utf-8 -*-
import io, re

def show(p, kw, before=500, after=600, hits=1):
    t = io.open(p, encoding='utf-8', errors='ignore').read()
    n = 0
    for m in re.finditer(re.escape(kw), t):
        print('=' * 22, kw, '|', p.replace('src/', ''))
        print(t[m.start() - before:m.start() + after])
        n += 1
        if n >= hits:
            break

show('src/app/(main)/students/[id]/page.tsx', '/api/performance')
show('src/app/(main)/classroom-feedback/page.tsx', '/api/admin/classroom-feedback')
show('src/app/(main)/teacher-salary/page.tsx', '/api/admin/salary/config')
