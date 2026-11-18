# -*- coding: utf-8 -*-
import io, os, re

def lines(p):
    return io.open(p, encoding='utf-8', errors='ignore').read().split('\n')

def show(p, kw, before=300, after=500, maxh=2):
    t = '\n'.join(lines(p))
    n = 0
    for m in re.finditer(re.escape(kw), t):
        ln = t[:m.start()].count('\n') + 1
        print('-' * 16, p.replace('src/', ''), 'L%d' % ln, '|', kw)
        print(t[m.start() - before:m.start() + after])
        n += 1
        if n >= maxh:
            return

show('src/app/(main)/students/_components/StudentForm.tsx', 'async function handleSubmit', 100, 900)
show('src/app/(main)/students/_components/StudentForm.tsx', 'saving', 60, 120, 1)
show('src/app/(main)/schedule/_components/ScheduleFormModal.tsx', 'async function handleOk', 100, 700)
show('src/app/(main)/schedule/_components/ScheduleDetailPanel.tsx', '取消本次课', 600, 700)
show('src/app/(main)/materials/page.tsx', 'const upload', 100, 700, 1)
