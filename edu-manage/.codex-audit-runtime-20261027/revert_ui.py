# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 回退：服务区舞台高度
c = c.replace('.stage{position:relative;height:470px;perspective:1200px;touch-action:pan-y}',
              '.stage{position:relative;height:340px;perspective:1200px;touch-action:pan-y}')

# 回退：卡片宽度
c = c.replace('.card{position:absolute;left:50%;top:0;width:min(72%,600px);height:100%;padding:20px 26px;overflow:hidden;background:#26363F;border:1px solid rgba(184,149,90,.3);border-radius:6px;transition:transform .8s cubic-bezier(.22,.61,.36,1),opacity .8s;display:flex;flex-direction:column;gap:8px}',
              '.card{position:absolute;left:50%;top:0;width:min(62%,520px);height:100%;padding:22px 28px;overflow:hidden;background:#26363F;border:1px solid rgba(184,149,90,.3);border-radius:6px;transition:transform .8s cubic-bezier(.22,.61,.36,1),opacity .8s;display:flex;flex-direction:column;gap:8px}')

# 回退：卡片图片高度
c = c.replace('.card img{width:100%;height:240px;object-fit:contain;background:#1A2930;border-radius:4px;display:block;flex:none;padding:8px}',
              '.card img{width:100%;height:132px;object-fit:contain;background:#1A2930;border-radius:4px;display:block;flex:none;padding:8px}')

# 回退：学习记录窗口高度（一次3-4条）
c = c.replace('.rwin{height:348px;overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}',
              '.rwin{height:232px;overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent)}')

# 回退：滚动速度
c = c.replace("list.style.setProperty('--rd',(d.length>30?d.length*1.4:d.length*1.9)+'s')",
              "list.style.setProperty('--rd',(d.length>30?d.length*1.8:d.length*2.4)+'s')")

# 回退：手机端服务区
c = c.replace('.stage{height:420px}.card{width:86%;padding:16px 18px}.card img{height:180px}.card h4{font-size:1.15rem}.card p{font-size:.92rem;line-height:1.85}',
              '.stage{height:350px}.card{width:80%;padding:20px}.card img{height:104px}.card h4{font-size:1.15rem}.card p{font-size:.92rem;line-height:1.85}')

# 回退：手机端学习记录不加348
c = c.replace('.rbox{padding:18px 16px 10px}.rstat{gap:28px}.rstat b{font-size:2rem}.rwin{height:348px}',
              '.rbox{padding:18px 16px 10px}.rstat{gap:28px}.rstat b{font-size:2rem}')

open(p, 'w', encoding='utf-8').write(c)
print('回退完成')
