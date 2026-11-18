# -*- coding: utf-8 -*-
import io, sys, urllib.request, hashlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

live = urllib.request.urlopen('https://muzhexuetang.xyz/', timeout=30).read().decode('utf-8')
local = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()

print('线上长度:', len(live), '本地长度:', len(local))
print('线上行数:', len(live.splitlines()), '本地行数:', len(local.splitlines()))
print('=== 线上关键词 ===')
for k in ['分数，自己会说话', '关于牧哲学堂', 'MOREJOY EDUCATION·河北·新乐', '进入系统·家长/教师登录',
          'REAL PROGRESS', '学员进步记录', '专注文化课辅导与升学规划', '课程安排', '考勤记录', '课堂反馈', '家校沟通',
          'id="phPauseBtn"', 'id="pauseBtn"', '--primary-deep:#C2541F', '在读硕士授课']:
    print(('有 ' if k in live else '无 '), k, 'x', live.count(k))
print('=== 线上前 600 字符 ===')
print(live[:600])
