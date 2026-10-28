# -*- coding: utf-8 -*-
import io, sys, urllib.request, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

live = urllib.request.urlopen('https://muzhexuetang.xyz/', timeout=30).read().decode('utf-8')
local = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()

norm = lambda s: s.replace('\r\n', '\n')
import hashlib
print('规范化MD5一致:', hashlib.md5(norm(live).encode()).hexdigest() == hashlib.md5(norm(local).encode()).hexdigest())

css = re.search(r'<style[^>]*>(.*?)</style>', live, re.S).group(1)
print('线上 CSS { =', css.count('{'), '} =', css.count('}'))
# 关键标记
for k in ['.progress-hero{margin:34px auto 0', '.ph-scroller{display:grid', '@media (max-width:768px){', '.footer{padding:26px 16px 20px}\n  }']:
    print(('OK  ' if k in live else 'MISS'), k[:60])
