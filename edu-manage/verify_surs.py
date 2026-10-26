# -*- coding: utf-8 -*-
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
m = re.search(r'const SURS = "([^"]+)"', c)
s = m.group(1) if m else ''
print('末尾15字:', s[-15:])
print('含默:', '默' in s)
