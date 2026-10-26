from PIL import Image
import os

avatars_dir = "D:/01muzhexuetang/muzhexuetang/coding/edu-manage/public/avatars"

# 压缩学生默认头像
for name in ["student-male", "student-female"]:
    src = os.path.join(avatars_dir, f"{name}.png")
    dst = os.path.join(avatars_dir, f"{name}.jpg")
    
    img = Image.open(src)
    # 改成 200x200，居中裁剪
    img.thumbnail((200, 200), Image.Resampling.LANCZOS)
    # 转 RGB（去掉 alpha）
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    # 保存为 JPEG，质量 85
    img.save(dst, 'JPEG', quality=85, optimize=True)
    
    size_kb = os.path.getsize(dst) / 1024
    print(f"{name}.jpg: {size_kb:.1f}KB")

print("完成！")
