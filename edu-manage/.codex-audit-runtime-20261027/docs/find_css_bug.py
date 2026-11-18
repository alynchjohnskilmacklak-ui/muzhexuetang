# -*- coding: utf-8 -*-
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

txt = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
css = re.search(r'<style[^>]*>(.*?)</style>', txt, re.S).group(1)

# 词法扫描：跳过 /* */ 注释与 "..." '...' 字符串，统计括号
stack = []  # (index_of_open_brace, 前面最近的selector起点)
i = 0
n = len(css)
unmatched = []
in_comment = False
while i < n:
    c = css[i]
    if in_comment:
        if c == '*' and i + 1 < n and css[i+1] == '/':
            in_comment = False
            i += 2
            continue
        i += 1
        continue
    if c == '/' and i + 1 < n and css[i+1] == '*':
        in_comment = True
        i += 2
        continue
    if c == '"' or c == "'":
        q = c
        i += 1
        while i < n and css[i] != q:
            if css[i] == '\\':
                i += 2
                continue
            i += 1
        i += 1
        continue
    if c == '{':
        stack.append(i)
    elif c == '}':
        if stack:
            stack.pop()
        else:
            unmatched.append(('extra-}', i))
    i += 1

for kind, pos in unmatched:
    print('多余 } 在', pos, repr(css[max(0,pos-40):pos+20]))
print('未闭合 { 数量:', len(stack))
for pos in stack:
    # 往前找该块的选择器（上一个 } 或开头到 { 之间的文本）
    prev = css.rfind('}', 0, pos)
    sel_start = prev + 1 if prev != -1 else 0
    sel = css[sel_start:pos].strip().replace('\n', ' ')
    print('未闭合 { 位置:', pos)
    print('  选择器:', sel[-120:])
    # 打印其后 300 字符看看吞掉了什么
    after = css[pos:pos+300]
    print('  其后:', after[:200].replace('\n', ' '))
