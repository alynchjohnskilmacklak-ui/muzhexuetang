# -*- coding: utf-8 -*-
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()

t = re.search(r'<title[^>]*>([\s\S]*?)</title>', c, re.I)
print('TITLE:', t.group(1) if t else 'NONE')

md = re.search(r'<meta[^>]*name=["\']description["\'][^>]*>', c, re.I)
print('META_DESC:', md.group(0) if md else 'NONE')

imgs = re.findall(r'<img[^>]*>', c, re.I)
print('IMG_COUNT:', len(imgs))
for i, tag in enumerate(imgs):
    if not re.search(r'alt=', tag, re.I):
        print('NO_ALT %d:' % i, tag[:180])

h1s = re.findall(r'<h1[^>]*>([\s\S]*?)</h1>', c, re.I)
print('H1_COUNT:', len(h1s))
for h in h1s:
    print('H1:', re.sub(r'\s+', ' ', h)[:100])
