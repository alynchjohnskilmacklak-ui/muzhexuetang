# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
rel = re.findall(r'\./about-images/[^"\x27]+', c)
print('相对路径数:', len(rel))
abs_left = re.findall(r'(?<!\.)/about-images/', c)
print('绝对路径残留:', len(abs_left))
print('样本数24:', 'n=24' in c)
print('提分行前置:', '<b>+${r[5]-r[4]}</b>' in c)
print('滚动2.4s:', 'd.length*2.4' in c)
print('卡片图contain:', 'object-fit:contain' in c)
