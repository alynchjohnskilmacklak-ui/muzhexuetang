# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
src = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\docs\ui-redesign-preview.html'
dst = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(src, encoding='utf-8').read()
c = c.replace('src="/about-images/', 'src="./about-images/')
open(dst, 'w', encoding='utf-8').write(c)
print('已恢复为第一版并修复路径')
print('剩余绝对路径:', c.count('src="/about-images/'))
