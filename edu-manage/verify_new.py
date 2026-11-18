# -*- coding: utf-8 -*-
import re, sys, io, subprocess, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()

# 1. 提取所有script
scripts = re.findall(r'<script(?![^>]*src=)[^>]*>([\s\S]*?)</script>', c)
print('SCRIPT blocks:', len(scripts))
for i, s in enumerate(scripts):
    if not s.strip():
        continue
    # 跳过 JSON-LD
    if '"@context"' in s:
        print('  block %d: JSON-LD (skip)' % i)
        continue
    tmp = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\_tmp_check.js'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(s)
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    print('  block %d JS syntax: %s' % (i, 'OK' if r.returncode == 0 else 'FAIL: ' + r.stderr[:300]))

# 2. SEO
t = re.search(r'<title[^>]*>([\s\S]*?)</title>', c, re.I)
print('TITLE:', t.group(1) if t else 'NONE')
md = re.search(r'<meta[^>]*name=["\x27]description["\x27][^>]*content=["\x27]([^"\x27]*)["\x27]', c, re.I)
print('DESC LEN:', len(md.group(1)) if md else 0)
h1s = re.findall(r'<h1[^>]*>([\s\S]*?)</h1>', c, re.I)
print('H1 count:', len(h1s), [re.sub(r'\s+',' ',h)[:30] for h in h1s])
imgs = re.findall(r'<img[^>]*>', c, re.I)
print('IMG count:', len(imgs))
for i, tag in enumerate(imgs):
    m = re.search(r'alt=["\x27]([^"\x27]*)["\x27]', tag, re.I)
    print('  IMG %d alt=%r' % (i, m.group(1) if m else None))
print('sr-only 残留:', 'sr-only' in c)
print('ICP带-1:', '2026028285号-1' in c)
