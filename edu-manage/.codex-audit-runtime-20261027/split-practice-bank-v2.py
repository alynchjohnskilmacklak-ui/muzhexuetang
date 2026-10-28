import re
import os

# 设置环境变量确保UTF-8编码
os.environ['PYTHONIOENCODING'] = 'utf-8'

os.chdir(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage')

# 读取原文件（UTF-8编码）
print("正在读取原文件...")
with open('src/data/parent-practice-bank-backup.ts', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'文件总大小: {len(content)/1024/1024:.2f} MB')

# 匹配每个小节的模式
pattern = r"  \{\n    id: '[^']+', grade: '([^']+)', subject: '([^']+)'"

matches = list(re.finditer(pattern, content))
print(f'找到 {len(matches)} 个小节')

# 按学科分组
subject_data = {}
for i, match in enumerate(matches):
    subject = match.group(2)
    start = match.start()
    end = matches[i+1].start() if i+1 < len(matches) else len(content)
    if subject not in subject_data:
        subject_data[subject] = []
    subject_data[subject].append(content[start:end])

print('\n=== 各学科统计 ===')
for subject, items in sorted(subject_data.items()):
    size = sum(len(item) for item in items)
    print(f'{subject}: {len(items)} 节, {size/1024:.1f} KB')

# 创建输出目录
os.makedirs('src/data/practice-sets', exist_ok=True)

# 先删除旧的乱码文件
print('\n=== 清理旧文件 ===')
for f in os.listdir('src/data/practice-sets'):
    os.remove(os.path.join('src/data/practice-sets', f))
    print(f'删除: {f}')

# 写入每个学科的文件（UTF-8编码）
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

print('\n✅ 拆分完成！')
