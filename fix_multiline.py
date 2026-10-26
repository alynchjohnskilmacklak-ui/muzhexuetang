# -*- coding: utf-8 -*-
"""修复 chinese-questions.ts 中单引号字符串内的真实换行"""

path = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\data\practice-sets\chinese-questions.ts"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

result = []
i = 0
n = len(content)
in_string = False
fixes = 0

while i < n:
    ch = content[i]
    if not in_string:
        result.append(ch)
        if ch == "'":
            in_string = True
        i += 1
    else:
        # 在单引号字符串内
        if ch == "\\" and i + 1 < n:
            # 转义序列，原样保留两个字符
            result.append(content[i:i+2])
            i += 2
        elif ch == "'":
            result.append(ch)
            in_string = False
            i += 1
        elif ch == "\n":
            # 真实换行 -> 替换为字面 \n（反斜杠+n）
            result.append("\\n")
            fixes += 1
            i += 1
        elif ch == "\r":
            i += 1  # 跳过 \r
        else:
            result.append(ch)
            i += 1

new_content = "".join(result)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"修复跨行字符串数: {fixes}")
print(f"文件大小: {len(new_content)} 字符")
