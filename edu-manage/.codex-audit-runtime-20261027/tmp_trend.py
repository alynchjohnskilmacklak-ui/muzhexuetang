# -*- coding: utf-8 -*-
import io, re
p = 'src/app/api/parent/students/[id]/growth-report/handler.ts'
t = io.open(p, encoding='utf-8').read()
print('len', len(t))
for kw in ['trend', 'points', 'IMPROVING', 'STABLE', 'NEEDS_ATTENTION']:
    idxs = [m.start() for m in re.finditer(re.escape(kw), t)][:12]
    print(kw, idxs)
i = t.find('trend')
print('=== trend ctx ===')
print(t[max(0, i - 500):i + 1200])
