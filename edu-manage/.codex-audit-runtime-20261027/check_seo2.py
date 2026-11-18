# -*- coding: utf-8 -*-
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()

for i, tag in enumerate(re.findall(r'<img[^>]*>', c, re.I)):
    print('IMG %d:' % i, tag)
print()

md = re.search(r'<meta[^>]*name=["\x27]description["\x27][^>]*content=["\x27]([^"\x27]*)["\x27]', c, re.I)
if md:
    print('DESC_LEN:', len(md.group(1)))
    print('DESC:', md.group(1))
print()

head = c[:c.find('</head>')]
print('HEAD_START:')
print(head[:3000])
