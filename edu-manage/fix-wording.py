import io

p = r'src\app\teacher\feedback\page.tsx'
s = io.open(p, encoding='utf-8').read()
s = s.replace('AI 生成结果将覆盖这些修改。覆盖前可随时用「撤销本次 AI 修改」恢复原文。',
              '新的扩写结果将覆盖这些修改。覆盖前可随时用「撤销本次修改」恢复原文。')
s = s.replace("throw new Error(data.error || 'AI 生成失败，请稍后重试')",
              "throw new Error(data.error || '反馈生成失败，请稍后重试')")
s = s.replace("const message = errorMessage(error, 'AI 生成失败')",
              "const message = errorMessage(error, '反馈生成失败')")
s = s.replace("toast.error(data.error || 'AI 生成失败')",
              "toast.error(data.error || '反馈生成失败')")
s = s.replace("toast.error(errorMessage(e, 'AI 生成失败'))",
              "toast.error(errorMessage(e, '反馈生成失败'))")
s = s.replace('AI 正在为每位学生扩写反馈…', '正在为每位学生扩写反馈…')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('done')
