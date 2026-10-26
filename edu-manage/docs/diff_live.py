# -*- coding: utf-8 -*-
import io, sys, urllib.request, difflib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

live = urllib.request.urlopen('https://muzhexuetang.xyz/', timeout=30).read().decode('utf-8')
local = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()

# 行级 diff，只显示前 20 处差异
diff = list(difflib.unified_diff(local.splitlines(), live.splitlines(), lineterm='', n=0))
print('差异行数(±):', len([d for d in diff if d.startswith(('+','-')) and not d.startswith(('+++','---'))]))
shown = 0
for d in diff:
    if d.startswith(('+++','---')) or d.startswith('@@'):
        continue
    if d.startswith(('+','-')):
        print(d[:160])
        shown += 1
        if shown >= 30:
            break
print('本地行数:', len(local.splitlines()), '线上行数:', len(live.splitlines()))
