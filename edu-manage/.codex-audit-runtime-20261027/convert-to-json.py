import re
import json
import os

os.chdir(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage')

# 读取原文件
print("正在读取原文件...")
with open('src/data/parent-practice-bank.ts', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'文件大小: {len(content)/1024/1024:.2f} MB')

# 提取数组内容
# 找到 export const PARENT_PRACTICE_SETS = [ 开始，到 ]; 结束
start_match = re.search(r'export const PARENT_PRACTICE_SETS = \[', content)
end_match = re.search(r'\n\];\n', content[start_match.end():])

if not start_match or not end_match:
    print("找不到数组边界！")
    exit(1)

array_start = start_match.end()
array_end = start_match.end() + end_match.start()
array_content = content[array_start:array_end]

print(f'数组内容长度: {len(array_content)/1024:.1f} KB')

# 直接保存为TS文件，但是导出为JSON
# 或者，我们直接用eval来解析？不行，太危险了。

# 换个思路：我们直接把整个文件作为JSON导出
# 但是TS文件不是JSON，有类型注解。

# 算了，还是用更简单的方法：
# 我们直接把数组内容提取出来，然后保存成JSON文件
# 但是需要把TS对象字面量转换成JSON。

# 这个太复杂了，换个思路：
# 我们直接把题库数据放到一个JSON文件里，然后在TS里导入JSON。

# 先看看有多少个小节
pattern = r"  \{\n    id: '"
matches = list(re.finditer(pattern, array_content))
print(f'找到 {len(matches)} 个小节')

# 算了，这个方案太复杂了。
# 我们换个思路：直接把大文件拆分成多个小文件，但是用正确的方式拆分。

print("\n❌ 转换太复杂，放弃这个方案")
