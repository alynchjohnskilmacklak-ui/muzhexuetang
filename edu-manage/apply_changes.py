# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 1. 记录行：提分前置
old_row = '.row{height:58px;display:grid;grid-template-columns:4em 1fr auto 4em;gap:14px;align-items:center;border-bottom:1px solid rgba(255,255,255,.1);font-variant-numeric:tabular-nums}'
new_row = '.row{height:58px;display:grid;grid-template-columns:4.2em 4.5em 1fr auto;gap:12px;align-items:center;border-bottom:1px solid rgba(255,255,255,.1);font-variant-numeric:tabular-nums}'
old_row2 = '.row span{color:#AEB9BD;font-size:.88rem}.row em{font-style:normal;color:#C9D1D4}.row b{font:700 1.3rem var(--serif);color:#F08A7B;text-align:right}'
new_row2 = '.row b{font:700 1.3rem var(--serif);color:#F08A7B;text-align:left}\n.row span{color:#AEB9BD;font-size:.88rem}.row em{font-style:normal;color:#C9D1D4}'
assert old_row in c, 'row1 not found'
assert old_row2 in c, 'row2 not found'
c = c.replace(old_row, new_row).replace(old_row2, new_row2)

# 2. 手机端row列
old_m = '.row{grid-template-columns:3.4em 1fr auto 3.2em;gap:8px}.row b{font-size:1.15rem}'
new_m = '.row{grid-template-columns:3.2em 3.6em 1fr auto;gap:8px}.row b{font-size:1.15rem}'
assert old_m in c, 'mobile row not found'
c = c.replace(old_m, new_m)

# 3. 样本数 16 -> 24
old_n = "const arr=[], n=16;"
new_n = "const arr=[], n=24;"
assert old_n in c, 'n not found'
c = c.replace(old_n, new_n)

# 4. 滚动速度 3s -> 2.4s
old_rd = "list.style.setProperty('--rd',d.length*3+'s')"
new_rd = "list.style.setProperty('--rd',d.length*2.4+'s')"
assert old_rd in c, 'rd not found'
c = c.replace(old_rd, new_rd)

# 5. 行HTML：提分放前面
old_h = "const h=d.map(r=>`<div class=\"row\"><strong>${r[0]}</strong><span>${r[2]} · ${r[1]}</span><em>${r[4]} → ${r[5]}</em><b>+${r[5]-r[4]}</b></div>`).join('');"
new_h = "const h=d.map(r=>`<div class=\"row\"><b>+${r[5]-r[4]}</b><strong>${r[0]}</strong><span>${r[2]} · ${r[1]}</span><em>${r[4]} → ${r[5]}</em></div>`).join('');"
assert old_h in c, 'row html not found'
c = c.replace(old_h, new_h)

open(p, 'w', encoding='utf-8').write(c)
print('全部修改完成')
