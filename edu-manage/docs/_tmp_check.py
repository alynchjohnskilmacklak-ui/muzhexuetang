# -*- coding: utf-8 -*-
import io, re

p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\client.tsx'
lines = io.open(p, encoding='utf-8-sig').read().split('\n')

# 简易配对：跟踪 JSX 容器开闭（div/Card/section/article/button/ol/li/span/Text/Paragraph/Select/Space/Tag/Progress/Modal/Image）
stack = []
opens = re.compile(r'<([A-Za-z][\w.]*)((?:\s[^<>]*?)?)(/?)>')
# 只处理行内的标签（粗配，忽略 JSX 表达式内的 <）
for i, ln in enumerate(lines, 1):
    # 去掉字符串/模板里的干扰：粗略用 < > 计数
    # 提取 <tag ...> 与 </tag>
    for m in re.finditer(r'<(/)?([A-Za-z][\w.]*)((?:\s[^<>]*?)?)(/?)>', ln):
        closing, tag, _, selfc = m.group(1), m.group(2), m.group(3), m.group(4)
        if selfc:
            continue
        if not closing:
            stack.append((tag, i))
        else:
            if stack and stack[-1][0] == tag:
                stack.pop()
            else:
                print(f'line {i}: unexpected </{tag}> (top of stack: {stack[-1] if stack else None})')
                # 尝试弹出直到匹配
                found = None
                for j in range(len(stack)-1, -1, -1):
                    if stack[j][0] == tag:
                        found = j
                        break
                if found is not None:
                    for _ in range(len(stack)-1-found):
                        print(f'  ...missing close for {stack.pop()}')
                    stack.pop()
print('--- remaining unclosed ---')
for tag, i in stack:
    print(f'line {i}: <{tag}>')
