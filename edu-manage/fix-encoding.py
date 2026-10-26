import os

# 读取GBK编码的文件
with open('src/data/parent-practice-bank.ts', 'rb') as f:
    content = f.read()

# 尝试用GBK解码
try:
    text = content.decode('gbk')
    print("成功用GBK解码！")
except:
    print("GBK解码失败，尝试GB18030...")
    text = content.decode('gb18030')
    print("成功用GB18030解码！")

# 用UTF-8写回
with open('src/data/parent-practice-bank-utf8.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("已保存为UTF-8编码的文件！")
print(f"文件大小: {len(text)} 字符")
