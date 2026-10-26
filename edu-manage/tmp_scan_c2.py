# -*- coding: utf-8 -*-
import os

def dirsize(p, skip_huge=True):
    total = 0
    try:
        for root, dirs, files in os.walk(p):
            # skip junction/very large known dirs to speed up
            for f in files:
                try:
                    total += os.path.getsize(os.path.join(root, f))
                except Exception:
                    pass
    except Exception:
        pass
    return total

targets = [
    r'C:\ProgramData',
    r'C:\Users\Administrator\AppData\Local\Programs',
    r'C:\Users\Administrator\AppData\Roaming',
    r'C:\Users\Administrator\AppData\Local\Doubao',
    r'C:\Users\Administrator\.docker',
]
for p in targets:
    sz = dirsize(p)
    print('%-50s %8.2f GB' % (p, sz / 2**30))

print('--- ProgramData top dirs ---')
pd = r'C:\ProgramData'
try:
    items = []
    for d in os.listdir(pd):
        p = os.path.join(pd, d)
        if os.path.isdir(p):
            items.append((d, dirsize(p)))
    items.sort(key=lambda x: -x[1])
    for d, sz in items[:12]:
        print('%-30s %8.2f GB' % (d, sz / 2**30))
except Exception as e:
    print('err', e)
