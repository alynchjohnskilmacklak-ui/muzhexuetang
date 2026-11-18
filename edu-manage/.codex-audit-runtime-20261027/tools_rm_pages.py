# -*- coding: utf-8 -*-
import os, shutil, glob

BASE = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent'

targets = [
    r'performance',
    r'grades',
    r'attendance',
    r'lesson-previews',
    r'hour-records',
    r'students\[id]\growth-report',
    r'students\[id]\archive',
]

for rel in targets:
    full = os.path.join(BASE, rel)
    if os.path.isdir(full):
        shutil.rmtree(full)
        print('removed', rel)
    else:
        print('NOT FOUND', rel)

# verify no remaining refs to removed routes
import re
removed = ['/parent/performance', '/parent/grades', '/parent/attendance', '/parent/lesson-previews',
           '/parent/students/${', 'growth-report']
hits = []
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.next')]
    for f in files:
        if not f.endswith(('.tsx', '.ts')):
            continue
        p = os.path.join(root, f)
        try:
            t = open(p, encoding='utf-8', newline='', errors='ignore').read()
        except Exception:
            continue
        for r in removed:
            if r in t:
                hits.append((os.path.relpath(p, BASE), r))
print('remaining refs:', hits if hits else 'NONE')
