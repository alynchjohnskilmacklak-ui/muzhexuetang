from PIL import Image
import os

avatars_dir = "D:/01muzhexuetang/muzhexuetang/coding/edu-manage/public/avatars"

# 压缩教师默认头像
for name in ["teacher-male", "teacher-female"]:
    src = os.path.join(avatars_dir, f"{name}.png")
    dst = os.path.join(avatars_dir, f"{name}.jpg")
    
    img = Image.open(src)
    img.thumbnail((200, 200), Image.Resampling.LANCZOS)
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    img.save(dst, 'JPEG', quality=85, optimize=True)
    
    size_kb = os.path.getsize(dst) / 1024
    print(f"{name}.jpg: {size_kb:.1f}KB")

# 压缩女教师 13 张
f_dir = os.path.join(avatars_dir, "f")
for i in range(1, 14):
    name = f"avatar-f-{i:02d}"
    src = os.path.join(f_dir, f"{name}.png")
    dst = os.path.join(f_dir, f"{name}.jpg")
    
    if not os.path.exists(src):
        continue
    
    img = Image.open(src)
    img.thumbnail((200, 200), Image.Resampling.LANCZOS)
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    img.save(dst, 'JPEG', quality=85, optimize=True)
    
    size_kb = os.path.getsize(dst) / 1024
    print(f"f/{name}.jpg: {size_kb:.1f}KB")

print("\n完成！")
