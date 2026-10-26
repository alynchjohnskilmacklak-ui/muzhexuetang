# -*- coding: utf-8 -*-
import io, sys, os, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
d = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\about-images'
c = open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\docs\home-optimized.html', encoding='utf-8').read()

# 1. 提取所有引用的图片文件名
refs = set(re.findall(r'/about-images/([^"\s]+)', c))
missing = []
for r in refs:
    if not os.path.exists(os.path.join(d, r)):
        missing.append(r)
print('引用图片数:', len(refs))
print('缺失:', missing if missing else '无')

# 2. thumb 文件存在性
thumbs = glob.glob(os.path.join(d, '*-thumb.webp'))
print('thumb文件数:', len(thumbs))
print('示例:', [os.path.basename(t) for t in thumbs[:3]])

# 3. 海报 png 覆盖
pngs = sorted(glob.glob(os.path.join(d, '0*-*.png')))
print('海报png数:', len(pngs))
