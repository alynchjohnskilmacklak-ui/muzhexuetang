# -*- coding: utf-8 -*-
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\live_home.html', encoding='utf-8').read()

t = re.search(r'<title[^>]*>([\s\S]*?)</title>', c, re.I)
print('TITLE:', t.group(1) if t else 'NONE')

md = re.search(r'<meta[^>]*name=["\x27]description["\x27][^>]*content=["\x27]([^"\x27]*)["\x27]', c, re.I)
print('DESC:', md.group(1) if md else 'NONE', '| LEN:', len(md.group(1)) if md else 0)

imgs = re.findall(r'<img[^>]*>', c, re.I)
print('IMG_COUNT:', len(imgs))
for i, tag in enumerate(imgs):
    m = re.search(r'alt=["\x27]([^"\x27]*)["\x27]', tag, re.I)
    print('IMG %d alt=%r' % (i, m.group(1) if m else None), tag[:120])

h1s = re.findall(r'<h1[^>]*>([\s\S]*?)</h1>', c, re.I)
print('H1_COUNT:', len(h1s))
for h in h1s:
    print('H1:', re.sub(r'\s+', ' ', h)[:100])

print('HAS_ROBOTS:', bool(re.search(r'name=["\x27]robots["\x27]', c, re.I)))
