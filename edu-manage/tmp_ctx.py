# -*- coding: utf-8 -*-
import io, re

def ctx(p, kw, before=800, after=800, maxhits=2):
    t = io.open(p, encoding='utf-8', errors='ignore').read()
    hits = 0
    for m in re.finditer(re.escape(kw), t):
        print('=' * 24, kw, 'IN', p.replace('src/', ''))
        print(t[m.start() - before:m.start() + after])
        hits += 1
        if hits >= maxhits:
            break

ctx('src/app/(main)/courses/page.tsx', '/api/courses')
ctx('src/app/(main)/schedule/intensive/page.tsx', '/api/schedules')
ctx('src/app/(main)/students/[id]/page.tsx', '/api/performance')
ctx('src/app/(main)/classroom-feedback/page.tsx', '/api/admin/classroom-feedback')
ctx('src/app/(main)/teacher-salary/page.tsx', '/api/admin/salary/config')
ctx('src/app/api/upload/route.ts', 'export async function POST')
