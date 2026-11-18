import io

p = 'src/lib/classroom-feedback/ai-chat.ts'
s = io.open(p, encoding='utf-8').read()

old = '老师当前的草稿原文如下（S1同学 等代号对应 articles 的 key）：${JSON.stringify(input.drafts)}。可参考当前草稿的已有表述继续润色，但不要照抄未核实的事实。'
new = '【以草稿为基准】以下 JSON 是目标学生当前的草稿原文（S1同学 等代号对应 articles 的 key）：${JSON.stringify(input.drafts)}。修改必须保持草稿的知识点主题（如草稿讲的是“一元二次方程配方法”，修改后仍是这个主题，绝不能换成其他章节知识点）与已确认的事实与结构，只按老师的指令调整详略、语气或建议；草稿就是老师已认可的内容。'
assert old in s, 'old not found'
s = s.replace(old, new)

old2 = '只修改该学生的这篇文章，保持连贯文章风格，按老师的指令调整语气或详略；可参考当前草稿：'
new2 = '只修改该学生的这篇文章，必须以当前草稿为基础：保持草稿的知识点主题与已确认事实不变，只按老师的指令调整语气或详略；当前草稿：'
assert old2 in s, 'old2 not found'
s = s.replace(old2, new2)

io.open(p, 'w', encoding='utf-8').write(s)
print('patched ok')
