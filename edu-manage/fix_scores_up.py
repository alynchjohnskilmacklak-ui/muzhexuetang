# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 1. 小班平均提升 23 -> 28
old_t = 'const GAIN_TARGET={"一对一":13,"一对三":10,"小班":23};'
new_t = 'const GAIN_TARGET={"一对一":13,"一对三":10,"小班":28};'
assert old_t in c, 'gain target not found'
c = c.replace(old_t, new_t)

# 2. 小班人数 24 -> 36
old_n = 'const arr=[], n=24;'
new_n = 'const arr=[], n=(type==="小班"?36:24);'
assert old_n in c, 'n not found'
c = c.replace(old_n, new_n)

# 3. from 分数分布：全科按考试类型正态分布（中考中心660）
old_from = """    let from;
    if(full>=600){ from=Math.round(full*0.62)+Math.floor(Math.random()*Math.round(full*0.10)); }
    else if(full>=150){ from=Math.round(full*0.55)+Math.floor(Math.random()*Math.round(full*0.18)); }
    else { from=Math.round(full*0.50)+Math.floor(Math.random()*Math.round(full*0.25)); }"""
new_from = """    const tri=()=>((Math.random()+Math.random())/2);
    let from;
    if(full===800){ from=Math.round(600+tri()*120); }      /* 中考满分800，正态中心660 */
    else if(full===750){ from=Math.round(540+tri()*100); }  /* 高考满分750，中心590 */
    else if(full===600){ from=Math.round(430+tri()*80); }   /* 期末四科600，中心470 */
    else if(full>=150){ from=Math.round(full*0.55)+Math.floor(Math.random()*Math.round(full*0.18)); }
    else { from=Math.round(full*0.50)+Math.floor(Math.random()*Math.round(full*0.25)); }"""
assert old_from in c, 'from logic not found'
c = c.replace(old_from, new_from)

# 4. 滚动速度：条数多时每条缩短，避免一轮太久
old_rd = "list.style.setProperty('--rd',d.length*2.4+'s')"
new_rd = "list.style.setProperty('--rd',(d.length>30?d.length*1.8:d.length*2.4)+'s')"
assert old_rd in c, 'rd not found'
c = c.replace(old_rd, new_rd)

open(p, 'w', encoding='utf-8').write(c)
print('完成')
