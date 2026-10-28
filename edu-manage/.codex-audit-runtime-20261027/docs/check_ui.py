# -*- coding: utf-8 -*-
import io, sys, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
html = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
scripts = re.findall(r'<script>(.*?)</script>', html, re.S)
print('script 块数量:', len(scripts))
paths = []
for i, s in enumerate(scripts):
    p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\_tmp_js_%d.js' % i
    io.open(p, 'w', encoding='utf-8').write(s)
    paths.append(p)
    print('块 %d 长度 %d -> %s' % (i, len(s), p))
print('---')
for pid in ['pauseBtn', 'phPauseBtn', 'statAvg', 'progressGrid', 'scrollBar', 'serviceList', 'stage3d', 'carouselThumbs', 'prevBtn', 'nextBtn', 'progressBar', 'carouselName', 'carouselSub']:
    print(pid, html.count('id="%s"' % pid))
print('---')
print('残留旧占位检查: #EE8B5C 次数 =', html.count('#EE8B5C'))
print('#27a644 次数 =', html.count('#27a644'))
print('高分 次数 =', html.count('高分'))
print('真实记录 次数 =', html.count('真实记录'))
