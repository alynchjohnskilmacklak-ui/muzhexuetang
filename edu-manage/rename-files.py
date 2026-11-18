import os

os.chdir(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\data\practice-sets')

# 列出所有文件
files = os.listdir('.')
print("当前文件:")
for f in files:
    print(f"  {f}")

# 乱码文件名映射
rename_map = {
    '鏁板-questions.ts': '数学-questions.ts',
    '璇枃-questions.ts': '语文-questions.ts',
    '鑻辫-questions.ts': '英语-questions.ts',
    '鍖栧-questions.ts': '化学-questions.ts',
}

# 重命名
for old, new in rename_map.items():
    if os.path.exists(old):
        os.rename(old, new)
        print(f"重命名: {old} -> {new}")

print("\n重命名后:")
for f in sorted(os.listdir('.')):
    size = os.path.getsize(f) / 1024
    print(f"  {f}: {size:.1f} KB")
