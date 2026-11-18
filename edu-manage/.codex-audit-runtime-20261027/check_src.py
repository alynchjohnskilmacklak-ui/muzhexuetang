# -*- coding: utf-8 -*-
import io, sys, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
d = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\about-images'
for f in ['small-logo.jpg', 'new-logo.jpg']:
    print(f, os.path.exists(os.path.join(d, f)))
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\docs\home-optimized.html', encoding='utf-8').read()
print('--- 所有 src= 引用 ---')
for m in set(re.findall(r'src="([^"]+)"', c)):
    if 'about-images' in m:
        print(m)
