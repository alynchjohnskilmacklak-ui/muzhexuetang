# -*- coding: utf-8 -*-
"""
stdin: 原始 PDF 二进制
stdout: 压缩后 PDF 二进制
仅在文件 > 3MB 时调用。手机端 110 DPI JPEG q60，清晰度足够。
"""
import sys, io
try:
    import pymupdf as fitz
except ImportError:
    import fitz

DPI = 110
JPEG_QUALITY = 60

def main():
    src = sys.stdin.buffer.read()
    if len(src) < 3 * 1024 * 1024:
        sys.stdout.buffer.write(src)
        return
    try:
        doc = fitz.open(stream=src, filetype="pdf")
        out = fitz.open()
        for page in doc:
            mat = fitz.Matrix(DPI / 72, DPI / 72)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = pix.tobytes("jpg", jpg_quality=JPEG_QUALITY)
            np = out.new_page(width=page.rect.width, height=page.rect.height)
            np.insert_image(page.rect, stream=img)
        buf = io.BytesIO()
        out.save(buf, garbage=4, deflate=True)
        out.close(); doc.close()
        data = buf.getvalue()
        # 如果压缩后反而更大（少见），用原文件
        sys.stdout.buffer.write(data if len(data) < len(src) else src)
    except Exception:
        sys.stdout.buffer.write(src)

if __name__ == "__main__":
    main()
