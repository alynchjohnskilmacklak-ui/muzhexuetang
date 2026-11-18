# -*- coding: utf-8 -*-
import io, os, re

links = {}
for root, _, fs in os.walk('src'):
    for f in fs:
        if not f.endswith(('.ts', '.tsx')):
            continue
        p = os.path.join(root, f)
        try:
            t = io.open(p, encoding='utf-8', errors='ignore').read()
        except Exception:
            continue
        for m in re.finditer(r"""['"](/[a-z0-9/\[\]-]{2,60})['"]""", t):
            u = m.group(1)
            if u.startswith('/api/'):
                continue
            links.setdefault(u, set()).add(p)

targets = ['/grades', '/performance', '/communications', '/teacher/services',
           '/volunteer', '/volunteer/quota', '/volunteer/guide', '/teacher/benefits',
           '/teacher/salary', '/fees', '/teacher/intensive', '/teacher/lesson-previews',
           '/teacher/papers', '/materials', '/teacher/materials']
for target in targets:
    srcs = set()
    for u, ps in links.items():
        if u == target or u.startswith(target + '/'):
            srcs |= ps
    srcs = [p.replace('\\', '/') for p in srcs]
    srcs = [s for s in srcs if 'archive' not in s]
    print('%-24s refs=%d' % (target, len(srcs)))
    for s in sorted(srcs)[:6]:
        print('    ', s)
