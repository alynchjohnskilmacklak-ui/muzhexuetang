# -*- coding: utf-8 -*-
import io, re

def show(p, kw, before=400, after=700, hits=1):
    t = io.open(p, encoding='utf-8', errors='ignore').read()
    n = 0
    for m in re.finditer(re.escape(kw), t):
        print('=' * 22, kw, '|', p.replace('src/', ''))
        print(t[m.start() - before:m.start() + after])
        n += 1
        if n >= hits:
            break

show('src/app/(main)/classroom-feedback/page.tsx', 'const composeSubmit', 200, 1200)
show('src/app/(main)/classroom-feedback/page.tsx', 'setComposeSaving', 200, 900)
show('src/app/(main)/teacher-salary/page.tsx', 'onFinish={', 300, 1000)
show('src/app/(main)/students/page.tsx', '/api/students', 300, 1000, 2)
