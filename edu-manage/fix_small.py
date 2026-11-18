# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 1. 小班课程全部为四科总分口径
old_c = '"小班":["全科小班（四科）","全科小班（四科）","数学小班","英语小班","语文小班"]'
new_c = '"小班":["全科（四科）","全科（四科）","全科（四科）","全科（四科）","全科（四科）"]'
assert old_c in c, 'small courses not found'
c = c.replace(old_c, new_c)

# 2. 小班考试类型排除地生会考（单科120，不是四科总分）
old_exam = "const exam=EXAMS[Math.floor(Math.random()*EXAMS.length)];"
new_exam = "const exam=(type===\"小班\"?[\"2026 中考\",\"2026 高考\",\"2026 上学期期末\"]:EXAMS)[Math.floor(Math.random()*(type===\"小班\"?3:EXAMS.length))];"
assert old_exam in c, 'exam line not found'
c = c.replace(old_exam, new_exam)

open(p, 'w', encoding='utf-8').write(c)
print('修改完成')
