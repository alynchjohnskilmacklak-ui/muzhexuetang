import os

os.chdir(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\data\practice-sets')

# 按大小映射到英文文件名
size_map = {
    711: 'math-questions.ts',      # 数学
    504: 'chinese-questions.ts',   # 语文
    248: 'english-questions.ts',  # 英语
    573: 'physics-questions.ts',  # 物理
    172: 'chemistry-questions.ts',# 化学
    752: 'history-questions.ts',  # 历史
    529: 'geography-questions.ts',# 地理
    442: 'biology-questions.ts',  # 生物
    494: 'politics-questions.ts', # 政治
}

files = os.listdir('.')
print("重命名:")
for f in files:
    size_kb = round(os.path.getsize(f) / 1024)
    if size_kb in size_map:
        new_name = size_map[size_kb]
        if f != new_name:
            os.rename(f, new_name)
            print(f"  {f} -> {new_name}")

print("\n最终文件:")
for f in sorted(os.listdir('.')):
    size = os.path.getsize(f) / 1024
    print(f"  {f}: {size:.1f} KB")
