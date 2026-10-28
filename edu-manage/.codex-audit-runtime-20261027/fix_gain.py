# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 1. 替换 GAIN_TARGET 为按班型的最大提升
old_t = 'const GAIN_TARGET={"一对一":13,"一对三":10,"小班":28};'
new_t = 'const GAIN_MAX={"一对一":42,"一对三":36,"小班":58};'
assert old_t in c, 'target not found'
c = c.replace(old_t, new_t)

# 2. 替换 gain 生成逻辑：大范围随机 + 保证不超满分
old_g = """    const full=pickFull(exam,course);
    const target=GAIN_TARGET[type];
    const gain=Math.max(3,target-5+Math.floor(Math.random()*11));
    const tri=()=>((Math.random()+Math.random())/2);
    let from;
    if(full===800){ from=Math.round(600+tri()*120); }      /* 中考满分800，正态中心660 */
    else if(full===750){ from=Math.round(540+tri()*100); }  /* 高考满分750，中心590 */
    else if(full===600){ from=Math.round(430+tri()*80); }   /* 期末四科600，中心470 */
    else if(full>=150){ from=Math.round(full*0.55)+Math.floor(Math.random()*Math.round(full*0.18)); }
    else { from=Math.round(full*0.50)+Math.floor(Math.random()*Math.round(full*0.25)); }
    const to=Math.min(full,from+gain);"""
new_g = """    const full=pickFull(exam,course);
    const tri=()=>((Math.random()+Math.random())/2);
    let from;
    if(full===800){ from=Math.round(600+tri()*120); }      /* 中考满分800，正态中心660 */
    else if(full===750){ from=Math.round(540+tri()*100); }  /* 高考满分750，中心590 */
    else if(full===600){ from=Math.round(430+tri()*80); }   /* 期末四科600，中心470 */
    else if(full>=150){ from=Math.round(full*0.55)+Math.floor(Math.random()*Math.round(full*0.18)); }
    else { from=Math.round(full*0.50)+Math.floor(Math.random()*Math.round(full*0.25)); }
    /* 提升分大范围随机：个位数到40/50多都有，且保证不超过满分 */
    const gmin=type==="小班"?4:3, gmax=GAIN_MAX[type];
    const gain=gmin+Math.floor(Math.random()*(gmax-gmin+1));
    if(from+gain>full){ from=Math.max(Math.round(full*0.35),full-gain-2); }
    const to=from+gain;"""
assert old_g in c, 'gain logic not found'
c = c.replace(old_g, new_g)

open(p, 'w', encoding='utf-8').write(c)
print('完成')
