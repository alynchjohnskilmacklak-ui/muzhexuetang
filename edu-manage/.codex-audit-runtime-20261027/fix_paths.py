# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()
n = c.count('/about-images/')
c = c.replace('src="/about-images/', 'src="./about-images/').replace('"/about-images/', '"./about-images/')
open(p, 'w', encoding='utf-8').write(c)
print('替换前出现次数:', n)
print('剩余绝对路径:', c.count('/about-images/'))
