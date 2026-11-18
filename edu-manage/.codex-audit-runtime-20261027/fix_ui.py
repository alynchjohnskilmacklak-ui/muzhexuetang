# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 1. 服务区：舞台加高 + 卡片加宽 + 图片放大（桌面）
old1 = '.stage{position:relative;height:340px;perspective:1200px;touch-action:pan-y}'
new1 = '.stage{position:relative;height:430px;perspective:1200px;touch-action:pan-y}'
assert old1 in c
c = c.replace(old1, new1)

old2 = '.card{position:absolute;left:50%;top:0;width:min(62%,520px);height:100%;padding:22px 28px;overflow:hidden;background:#26363F;border:1px solid rgba(184,149,90,.3);border-radius:6px;transition:transform .8s cubic-bezier(.22,.61,.36,1),opacity .8s;display:flex;flex-direction:column;gap:8px}'
new2 = '.card{position:absolute;left:50%;top:0;width:min(72%,600px);height:100%;padding:20px 26px;overflow:hidden;background:#26363F;border:1px solid rgba(184,149,90,.3);border-radius:6px;transition:transform .8s cubic-bezier(.22,.61,.36,1),opacity .8s;display:flex;flex-direction:column;gap:8px}'
assert old2 in c
c = c.replace(old2, new2)

old3 = '.card img{width:100%;height:132px;object-fit:contain;background:#1A2930;border-radius:4px;display:block;flex:none;padding:8px}'
new3 = '.card img{width:100%;height:250px;object-fit:contain;background:#1A2930;border-radius:4px;display:block;flex:none;padding:8px}'
assert old3 in c
c = c.replace(old3, new3)

# 2. 学习记录：一次显示6行（58*6=348）
old4 = '.rwin{height:232px;overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent)}'
new4 = '.rwin{height:348px;overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}'
assert old4 in c
c = c.replace(old4, new4)

# 3. 滚动速度加快：36条时 1.8s -> 1.4s；其余 2.4s -> 1.9s
old5 = "list.style.setProperty('--rd',(d.length>30?d.length*1.8:d.length*2.4)+'s')"
new5 = "list.style.setProperty('--rd',(d.length>30?d.length*1.4:d.length*1.9)+'s')"
assert old5 in c
c = c.replace(old5, new5)

# 4. 手机端：服务图片也放大
old6 = '.stage{height:350px}.card{width:80%;padding:20px}.card img{height:104px}.card h4{font-size:1.15rem}.card p{font-size:.92rem;line-height:1.85}'
new6 = '.stage{height:400px}.card{width:86%;padding:16px 18px}.card img{height:190px}.card h4{font-size:1.15rem}.card p{font-size:.92rem;line-height:1.85}'
assert old6 in c
c = c.replace(old6, new6)

# 5. 手机端学习记录：一次显示6行保持一致
old7 = '.rbox{padding:18px 16px 10px}.rstat{gap:28px}.rstat b{font-size:2rem}'
new7 = '.rbox{padding:18px 16px 10px}.rstat{gap:28px}.rstat b{font-size:2rem}.rwin{height:348px}'
assert old7 in c
c = c.replace(old7, new7)

open(p, 'w', encoding='utf-8').write(c)
print('完成')
