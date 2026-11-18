# -*- coding: utf-8 -*-
path = r'src/lib/classroom-feedback/ai-chat.test.ts'
lines = open(path, encoding='utf-8').read().splitlines()
for i, line in enumerate(lines):
    if '从课堂整体情况看' in line:
        lines[i] = "            + '从课堂整体情况看，有同学听讲认真，也有同学能主动举手发言，还有同学上课容易走神。S1同学听讲认真，能跟上课堂节奏。'"
        break
with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write('\n'.join(lines))
print('fixed line')
for i, line in enumerate(lines):
    if '从课堂整体情况看' in line:
        print('L%d' % (i+1), repr(line))
