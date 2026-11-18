# -*- coding: utf-8 -*-
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
m = re.findall(r'ph-t-gain">([^<]+)<', c)
print('班型提分:', m)
print('随机种子(Date.now):', 'Date.now' in c)
print('固定DATA残留:', ('杜*诺' in c) or ('默*轩' in c))
g = re.search(r'gain = ([^;]+);', c)
print('随机gain:', g.group(1) if g else 'NONE')
print('姓氏池含默:', '"默"' in c)
