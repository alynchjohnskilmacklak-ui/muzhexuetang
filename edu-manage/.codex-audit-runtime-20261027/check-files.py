import os

os.chdir(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\data\practice-sets')

print("=== 文件列表 ===")
for f in sorted(os.listdir('.')):
    size = os.path.getsize(f) / 1024
    # 读取文件前几行看看内容
    with open(f, 'r', encoding='utf-8') as file:
        first_line = file.readline().strip()
    print(f"{f}: {size:.1f} KB")
    print(f"  首行: {first_line}")
