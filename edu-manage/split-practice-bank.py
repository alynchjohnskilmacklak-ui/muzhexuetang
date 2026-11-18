import re
import os

os.chdir(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage')

# 读取原文件
print("正在读取原文件...")
with open('src/data/parent-practice-bank.ts', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'文件总大小: {len(content)/1024/1024:.2f} MB')

# 找到文件开头和结尾的部分
# 开头部分：import语句和数组开头
# 结尾部分：数组结尾和export语句

# 匹配每个小节的模式
pattern = r"  \{\n    id: '[^']+', grade: '([^']+)', subject: '([^']+)'"

matches = list(re.finditer(pattern, content))
print(f'找到 {len(matches)} 个小节')

# 找到第一个小节开始的位置
first_match_start = matches[0].start()

# 开头部分（第一个小节之前的内容）
header = content[:first_match_start]
print(f'开头部分长度: {len(header)} 字符')

# 找到最后一个小节结束的位置（到文件末尾）
# 找最后的 ]  和 export
footer_match = re.search(r'\n\];\n\nexport', content)
if footer_match:
    footer_start = footer_match.start()
    footer = content[footer_start:]
    print(f'结尾部分长度: {len(footer)} 字符')
else:
    footer_start = len(content)
    footer = '\n];\n\nexport const PARENT_PRACTICE_SETS = PARENT_PRACTICE_SETS;'
    print('使用默认结尾')

# 按学科分组
subject_data = {}
for i, match in enumerate(matches):
    subject = match.group(2)
    start = match.start()
    end = matches[i+1].start() if i+1 < len(matches) else footer_start
    if subject not in subject_data:
        subject_data[subject] = []
    subject_data[subject].append(content[start:end])

print('\n=== 各学科统计 ===')
for subject, items in sorted(subject_data.items()):
    size = sum(len(item) for item in items)
    print(f'{subject}: {len(items)} 节, {size/1024:.1f} KB')

# 创建输出目录
os.makedirs('src/data/practice-sets', exist_ok=True)

# 写入每个学科的文件
print('\n=== 正在写入拆分文件 ===')
for subject, items in subject_data.items():
    filename = f'src/data/practice-sets/{subject}-questions.ts'
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f'// {subject}题库\n')
        f.write(f'export const {subject}Questions = [\n')
        for item in items:
            f.write(item)
        f.write('];\n')
    size = os.path.getsize(filename) / 1024
    print(f'写入 {filename}: {size:.1f} KB')

# 创建新的主文件
print('\n=== 创建新的主文件 ===')
new_main = '''import { 数学Questions } from './practice-sets/数学-questions';
import { 语文Questions } from './practice-sets/语文-questions';
import { 英语Questions } from './practice-sets/英语-questions';
import { 物理Questions } from './practice-sets/物理-questions';
import { 化学Questions } from './practice-sets/化学-questions';
import { 历史Questions } from './practice-sets/历史-questions';
import { 地理Questions } from './practice-sets/地理-questions';
import { 生物Questions } from './practice-sets/生物-questions';
import { 政治Questions } from './practice-sets/政治-questions';

export const PARENT_PRACTICE_SETS = [
  ...数学Questions,
  ...语文Questions,
  ...英语Questions,
  ...物理Questions,
  ...化学Questions,
  ...历史Questions,
  ...地理Questions,
  ...生物Questions,
  ...政治Questions,
];
'''

with open('src/data/parent-practice-bank-new.ts', 'w', encoding='utf-8') as f:
    f.write(new_main)

print('新主文件已创建: src/data/parent-practice-bank-new.ts')
print('\n✅ 拆分完成！')
