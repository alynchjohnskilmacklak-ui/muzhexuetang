# -*- coding: utf-8 -*-
import io, sys, urllib.request, hashlib, difflib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

live = urllib.request.urlopen('https://muzhexuetang.xyz/', timeout=30).read().decode('utf-8')
norm_live = live.replace('\r\n', '\n')
local = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()

print('线上行数:', len(norm_live.splitlines()), ' 本地行数:', len(local.splitlines()))
print('MD5 线上:', hashlib.md5(norm_live.encode()).hexdigest()[:16])
print('MD5 本地:', hashlib.md5(local.encode()).hexdigest()[:16])

if norm_live != local:
    a = norm_live.splitlines()
    b = local.splitlines()
    diff = list(difflib.unified_diff(a, b, '线上', '本地', lineterm='', n=2))
    # 只显示带 +/- 的行（前 120 行差异）
    shown = 0
    for line in diff:
        if line.startswith(('+', '-')) and not line.startswith(('+++', '---')):
            print(line[:180])
            shown += 1
            if shown >= 120:
                print('...（差异行过多，截断）')
                break
    print('差异块总数:', diff.count('---') if False else len([l for l in diff if l.startswith(('+','-')) and not l.startswith(('+++','---'))]))
