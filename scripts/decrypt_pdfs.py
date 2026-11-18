# -*- coding: utf-8 -*-
"""Scan vault PDFs, decrypt password-protected ones with the given password."""
import os
import pikepdf

VAULT = r"D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统"
BASE = os.path.join(VAULT, "资料库")
PASSWORD = "muzhexuetang888"
LOG = r"D:\01muzhexuetang\pdf_decrypt_log.txt"

stats = {"total": 0, "plain": 0, "decrypted": 0, "mismatch": 0, "failed": 0}
lines = []

def log(msg):
    print(msg)
    lines.append(msg)

for root, dirs, files in os.walk(BASE):
    for fn in sorted(files):
        if not fn.lower().endswith(".pdf"):
            continue
        stats["total"] += 1
        path = os.path.join(root, fn)
        rel = path[len(BASE) + 1:]
        tmp = path + ".tmpdec"
        try:
            pdf = pikepdf.open(path)
            if pdf.is_encrypted:
                pdf.save(tmp)
                pdf.close()
                os.replace(tmp, path)
                stats["decrypted"] += 1
                log(f"DECRYPTED(open-pw-empty) {rel}")
            else:
                pdf.close()
                stats["plain"] += 1
        except pikepdf.PasswordError:
            try:
                pdf = pikepdf.open(path, password=PASSWORD)
                pdf.save(tmp)
                pdf.close()
                os.replace(tmp, path)
                stats["decrypted"] += 1
                log(f"DECRYPTED(pw-ok) {rel}")
            except Exception as e:
                stats["mismatch"] += 1
                log(f"MISMATCH {rel} :: {str(e)[:100]}")
        except Exception as e:
            stats["failed"] += 1
            log(f"FAIL {rel} :: {str(e)[:100]}")

log("=" * 50)
log(f"total={stats['total']} plain={stats['plain']} decrypted={stats['decrypted']} mismatch={stats['mismatch']} failed={stats['failed']}")
with open(LOG, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
