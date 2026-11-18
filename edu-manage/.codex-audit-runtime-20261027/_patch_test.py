# -*- coding: utf-8 -*-
path = r'src/lib/classroom-feedback/ai-chat.test.ts'
data = open(path, encoding='utf-8').read()
old = '从课堂整体情况看，有同学听讲认真，也有同学能主动举手发言，还有同学上课容易走神。'
new = '从课堂整体情况看，有同学听讲认真，也有同学能主动举手发言，还有同学上课容易走神。' + " + " + "'S1同学听讲认真，能跟上课堂节奏。'"
assert old in data, 'pattern not found'
data = data.replace(old, new, 1)
with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(data)
print('patched ok')
