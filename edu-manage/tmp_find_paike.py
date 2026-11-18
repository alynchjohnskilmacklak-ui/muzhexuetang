# -*- coding: utf-8 -*-
import os, re

base = r'D:\01muzhexuetang\muzhexuetang\coding'
hits = []
for dp, dirs, fs in os.walk(base):
    depth = dp[len(base):].count(os.sep)
    if depth > 3:
        continue
    for d in dirs:
        if re.search(r'排课|schedul|paike', d, re.I):
            hits.append(('DIR', os.path.join(dp, d)))
    for f in fs:
        if re.search(r'排课|schedul|paike|deploy|部署', f, re.I) and f.endswith(('.md', '.txt', '.ps1', '.sh', '.py')):
            hits.append(('FILE', os.path.join(dp, f)))
for h in hits[:40]:
    print(h[0], h[1])
