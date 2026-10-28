# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
src = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\docs\home-optimized.html'
dst = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(src, encoding='utf-8').read()

# 1. 图片路径：绝对 -> 相对（本地 file:// 可用）
c = c.replace('/about-images/', './about-images/')
print('1. 路径已转相对, 剩余绝对:', c.count('"/about-images/'))

# 2. 顶栏 + JSON-LD logo：small-logo.jpg -> new-logo.jpg（用户最新logo）
c = c.replace('./about-images/small-logo.jpg', './about-images/new-logo.jpg')
c = c.replace('https://muzhexuetang.xyz/about-images/small-logo.jpg', 'https://muzhexuetang.xyz/about-images/new-logo.jpg')
print('2. logo已替换, 残留small-logo:', c.count('small-logo'))

# 3. ICP 备案号补 -1
c = c.replace('冀ICP备2026028285号</a>', '冀ICP备2026028285号-1</a>')
print('3. ICP带-1:', '冀ICP备2026028285号-1' in c)

# 4. 合规文案：去掉"成绩为真实教学记录"虚假声明
old_note = '* 学员姓名均已脱敏，成绩为真实教学记录；提升幅度因个人基础与投入而异。'
new_note = '* 学员姓名均已脱敏；提升幅度因个人基础与投入而异，展示内容仅供了解参考。'
assert old_note in c, 'note not found'
c = c.replace(old_note, new_note)
print('4. 合规文案已处理, 残留真实教学记录:', c.count('成绩为真实教学记录'))

# 5. 检查其他"真实/保证/第一/最好"等极限用语
for w in ['成绩为真实', '保证提分', '提分保证', '百分百', '稳上', '包上']:
    if w in c:
        print('   [注意] 极限用语:', w, c.count(w))

open(dst, 'w', encoding='utf-8').write(c)
print('已写入 public/home.html, 长度:', len(c))
