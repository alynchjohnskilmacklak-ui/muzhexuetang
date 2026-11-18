# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
txt = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
lines = txt.splitlines()

# 1. CSS 括号配对
styles = re.findall(r'<style[^>]*>(.*?)</style>', txt, re.S)
print('style 块数:', len(styles))
for i, css in enumerate(styles):
    print(f'  style{i+1}: 长度={len(css)}  {{={css.count("{")}  }}={css.count("}")}  /*={css.count("/*")} */={css.count("*/")}')

# 2. 关键功能标记
print()
print('=== 关键功能标记 ===')
for k in ['phPauseBtn', 'pauseBtn', 'aria-selected', '--primary-deep', '--ink-faint', '在读硕士授课',
          'progress-hero', 'ph-scroller', 'makeRecord', 'bottom-bar', 'text-wrap:balance']:
    print(f'  {"有" if k in txt else "无"}  {k}  x{txt.count(k)}')

# 3. section 完整清单
print()
print('=== 页面区块 ===')
for i, l in enumerate(lines, 1):
    s = l.strip()
    if re.match(r'<(header|footer|main)', s) or re.match(r'<section[^>]*>', s):
        print(f'  {i}: {s[:80]}')
    m = re.search(r'id="([^"]+)"', s)
    if m and re.match(r'<(section|div)', s):
        pass
