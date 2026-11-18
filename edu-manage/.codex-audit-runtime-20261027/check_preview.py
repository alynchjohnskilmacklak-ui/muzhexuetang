# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\docs\ui-redesign-preview.html', encoding='utf-8').read()
print('--- 图片路径 ---')
print('绝对 /about-images/ 出现:', c.count('src="/about-images/') + c.count("src='/about-images/"))
print('相对 ./about-images/ 出现:', c.count('./about-images/'))
print('--- 数据特征 ---')
for k in ['GAIN_TARGET', 'GAIN_MAX', 'EXAMS', 'rN', '人 样本', '2025 中考', '2026 地生会考', 'SURS']:
    print(k, ':', k in c)
print('--- SEO ---')
m = re.search(r'<title>(.*?)</title>', c)
print('title:', m.group(1) if m else None)
m = re.search(r'name="description" content="([^"]*)"', c)
print('desc len:', len(m.group(1)) if m else None)
print('H1 count:', len(re.findall(r'<h1', c)))
print('ICP -1:', '冀ICP备2026028285号-1' in c)
print('sr-only h1:', 'sr-only' in c)
