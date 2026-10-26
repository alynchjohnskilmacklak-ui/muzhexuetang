# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
txt = io.open(p, encoding='utf-8').read()

anchor = '    .footer{padding:26px 16px 20px}\n\n\n  /* ===== 学员进步对比（深色震撼版） ===== */'
fix = '    .footer{padding:26px 16px 20px}\n  }\n\n  /* ===== 学员进步对比（深色震撼版） ===== */'

cnt = txt.count(anchor)
if cnt != 1:
    print('ERROR: anchor 出现', cnt, '次，未修改')
    sys.exit(1)

txt = txt.replace(anchor, fix)
io.open(p, 'w', encoding='utf-8', newline='\n').write(txt)
print('已补上 @media 768px 块的闭合 }')

# 重新校验括号配对
import re
css = re.search(r'<style[^>]*>(.*?)</style>', txt, re.S).group(1)
print('{ =', css.count('{'), '} =', css.count('}'))
