# -*- coding: utf-8 -*-
import os

def top_size(p, depth=1):
    total = 0
    try:
        for root, dirs, files in os.walk(p):
            rel = os.path.relpath(root, p)
            if rel != '.' and rel.count(os.sep) >= depth:
                dirs[:] = []
                continue
            for f in files:
                try:
                    total += os.path.getsize(os.path.join(root, f))
                except Exception:
                    pass
    except Exception:
        pass
    return total

targets = [
    (r'C:\Users\Administrator\AppData\Local', 1),
    (r'C:\Users\Administrator\AppData\Roaming', 1),
    (r'C:\ProgramData', 1),
]
for base, depth in targets:
    print('===', base)
    items = []
    try:
        for d in os.listdir(base):
            p = os.path.join(base, d)
            if os.path.isdir(p):
                items.append((d, top_size(p, depth)))
    except Exception as e:
        print('err', e)
        continue
    items.sort(key=lambda x: -x[1])
    for d, sz in items[:12]:
        print('%-28s %7.2f GB' % (d, sz / 2**30))
