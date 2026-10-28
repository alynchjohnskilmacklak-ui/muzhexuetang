# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
for m in re.finditer(r'.{40}/about-images/.{20}', c):
    x = m.group(0).replace('\n', ' ')
    print(x)
