# -*- coding: utf-8 -*-
import os

def dirsize(p):
    total = 0
    try:
        for root, dirs, files in os.walk(p):
            for f in files:
                try:
                    total += os.path.getsize(os.path.join(root, f))
                except Exception:
                    pass
    except Exception:
        pass
    return total

root = 'C:\\'
dirs = []
try:
    for d in os.listdir(root):
        p = os.path.join(root, d)
        if os.path.isdir(p):
            sz = dirsize(p)
            dirs.append((d, sz))
except Exception as e:
    print('listdir err', e)

dirs.sort(key=lambda x: -x[1])
for d, sz in dirs[:15]:
    print('%-24s %8.2f GB' % (d, sz / 2**30))
