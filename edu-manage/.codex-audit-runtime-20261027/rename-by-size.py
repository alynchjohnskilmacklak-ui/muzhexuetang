import os

os.chdir(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\data\practice-sets')

# 按大小匹配（单位KB）
size_map = {
    711: '数学-questions.ts',
    504: '语文-questions.ts',
    248: '英语-questions.ts',
    172: '化学-questions.ts',
}

files = os.listdir('.')
for f in files:
    size_kb = round(os.path.getsize(f) / 1024)
    print(f"{f}: {size_kb} KB")
    
    if size_kb in size_map:
        new_name = size_map[size_kb]
        if f != new_name:
            os.rename(f, new_name)
            print(f"  -> 重命名为: {new_name}")

print("\n最终文件列表:")
for f in sorted(os.listdir('.')):
    size = os.path.getsize(f) / 1024
    print(f"  {f}: {size:.1f} KB")
