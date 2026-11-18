# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
txt = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
lines = txt.splitlines()
print('总行数:', len(lines))

marks = ['.footer{padding:26px 16px 20px}', '  }', '学员进步对比（深色震撼版）',
         '.progress-hero{', '@media (max-width:768px){']
for m in marks:
    hit = [i for i, l in enumerate(lines, 1) if m in l]
    print(f'标记 {m[:40]!r}: 行 {hit[:5]}')

print()
print('=== 主要区块顺序 ===')
pat = re.compile(r'<section[^>]*\bid="([^"]+)"|<section[^>]*\bclass="([^"]+)"|<header[^>]*>|<footer[^>]*>')
for i, l in enumerate(lines, 1):
    m = pat.search(l)
    if m:
        tag = m.group(1) or m.group(2)
        print(f'  {i}: <{l.strip()[:40]}>')
