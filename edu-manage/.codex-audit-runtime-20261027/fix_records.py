# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 1. HTML：去掉样本数显示
old_rstat = '<div class="rstat"><div><b id="rAvg">0</b><small>分 平均提升</small></div><div><b id="rN">0</b><small>人 样本</small></div></div>'
new_rstat = '<div class="rstat"><div><b id="rAvg">0</b><small>分 平均提升</small></div></div>'
assert old_rstat in c, 'rstat html not found'
c = c.replace(old_rstat, new_rstat)

# 2. JS：show() 里删掉样本数更新
old_show = "$('rAvg').textContent='+'+Math.round(d.reduce((a,r)=>a+r[5]-r[4],0)/d.length);$('rN').textContent=d.length;"
new_show = "$('rAvg').textContent='+'+Math.round(d.reduce((a,r)=>a+r[5]-r[4],0)/d.length);"
assert old_show in c, 'show rN not found'
c = c.replace(old_show, new_show)

# 3. JS：randRecs 重新设计合理分数（按考试类型定满分）
old_gen = """function randRecs(type){
  const arr=[], n=24;
  for(let i=0;i<n;i++){
    const name=SURS[Math.floor(Math.random()*SURS.length)]+"*"+NAME_TAILS[Math.floor(Math.random()*NAME_TAILS.length)].slice(-1);
    const exam=EXAMS[Math.floor(Math.random()*EXAMS.length)];
    const course=COURSES[type][Math.floor(Math.random()*COURSES[type].length)];
    const target=GAIN_TARGET[type];
    const gain=Math.max(3,target-5+Math.floor(Math.random()*11));
    let from,full;
    if(type==="小班"){ full=480; from=300+Math.floor(Math.random()*80); }
    else{ full=120; from=55+Math.floor(Math.random()*40); }
    const to=Math.min(full,from+gain);
    arr.push([name,exam,course,type,from,to]);
  }
  return arr;
}"""
new_gen = """function pickFull(exam,course){
  if(course.indexOf("全科")>=0){
    if(exam.indexOf("中考")>=0)return 800;   /* 石家庄中考满分 800 */
    if(exam.indexOf("高考")>=0)return 750;   /* 高考满分 750 */
    return 600;                              /* 期末四科合计 */
  }
  if(exam.indexOf("高考")>=0)return /数学|语文|英语/.test(course)?150:100; /* 高考单科 */
  return 120;                                /* 中考/期末/地生会考单科 */
}
function randRecs(type){
  const arr=[], n=24;
  for(let i=0;i<n;i++){
    const name=SURS[Math.floor(Math.random()*SURS.length)]+"*"+NAME_TAILS[Math.floor(Math.random()*NAME_TAILS.length)].slice(-1);
    const exam=EXAMS[Math.floor(Math.random()*EXAMS.length)];
    const course=COURSES[type][Math.floor(Math.random()*COURSES[type].length)];
    const full=pickFull(exam,course);
    const target=GAIN_TARGET[type];
    const gain=Math.max(3,target-5+Math.floor(Math.random()*11));
    let from;
    if(full>=600){ from=Math.round(full*0.62)+Math.floor(Math.random()*Math.round(full*0.10)); }
    else if(full>=150){ from=Math.round(full*0.55)+Math.floor(Math.random()*Math.round(full*0.18)); }
    else { from=Math.round(full*0.50)+Math.floor(Math.random()*Math.round(full*0.25)); }
    const to=Math.min(full,from+gain);
    arr.push([name,exam,course,type,from,to]);
  }
  return arr;
}"""
assert old_gen in c, 'randRecs not found'
c = c.replace(old_gen, new_gen)

open(p, 'w', encoding='utf-8').write(c)
print('修改完成')
