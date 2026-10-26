# -*- coding: utf-8 -*-
"""
压缩 PDF：扫描版课本通常是整页图片。
策略：用 PyMuPDF 把每页渲染为 150 DPI JPEG（手机端清晰可读），再重新打包为 PDF。
31MB 扫描版课本通常能压到 4-8MB。
"""
import fitz  # PyMuPDF
import io, os, time

SRC = r"D:\01muzhexuetang\muzhexuetang\coding\_orig.pdf"
DST = r"D:\01muzhexuetang\muzhexuetang\coding\_compressed.pdf"

# 手机端 150 DPI 足够清晰（屏幕宽度 ~400px，150 DPI ≈ 825px 宽， retina 也够）
DPI = 110
JPEG_QUALITY = 60

t0 = time.time()
doc = fitz.open(SRC)
out = fitz.open()

for i, page in enumerate(doc):
    # 渲染页面为 pixmap
    mat = fitz.Matrix(DPI / 72, DPI / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pix.tobytes("jpg", jpg_quality=JPEG_QUALITY)
    # 新页面尺寸 = 原页面尺寸（保持比例）
    new_page = out.new_page(width=page.rect.width, height=page.rect.height)
    new_page.insert_image(page.rect, stream=img_bytes)
    if (i+1) % 20 == 0:
        print(f"  page {i+1}/{len(doc)}", flush=True)

out.save(DST, garbage=4, deflate=True)
out.close()
doc.close()

orig = os.path.getsize(SRC) / 1024 / 1024
comp = os.path.getsize(DST) / 1024 / 1024
print(f"original: {orig:.1f} MB")
print(f"compressed: {comp:.1f} MB")
print(f"ratio: {comp/orig*100:.0f}%")
print(f"time: {time.time()-t0:.1f}s")
