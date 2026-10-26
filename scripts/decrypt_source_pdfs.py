# -*- coding: utf-8 -*-
"""Decrypt password-protected PDFs in the SOURCE folders (excl. coding/MinerU)."""
import os
import pikepdf

ROOT = r"D:\01muzhexuetang\muzhexuetang"
EXCLUDE = {"coding", "MinerU"}
PASSWORDS = ["muzhexuetang888", "REN031213", "Ren031213"]
LOG = r"D:\01muzhexuetang\pdf_decrypt_source_log.txt"

stats = {"total": 0, "plain": 0, "decrypted": 0, "mismatch": 0, "failed": 0}
lines = []

def log(msg):
    print(msg)
    lines.append(msg)

for root, dirs, files in os.walk(ROOT):
    relroot = os.path.relpath(root, ROOT)
    top = relroot.split(os.sep)[0]
    if top in EXCLUDE:
        continue
    for fn in sorted(files):
        if not fn.lower().endswith(".pdf"):
            continue
        stats["total"] += 1
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, ROOT)
        tmp = path + ".tmpdec"
        try:
            pdf = pikepdf.open(path)
            if pdf.is_encrypted:
                pdf.save(tmp)
                pdf.close()
                os.replace(tmp, path)
                stats["decrypted"] += 1
                log(f"DECRYPTED(owner-only) {rel}")
            else:
                pdf.close()
                stats["plain"] += 1
        except pikepdf.PasswordError:
            done = False
            for pw in PASSWORDS:
                try:
                    pdf = pikepdf.open(path, password=pw)
                    pdf.save(tmp)
                    pdf.close()
                    os.replace(tmp, path)
                    stats["decrypted"] += 1
                    log(f"DECRYPTED(pw={pw}) {rel}")
                    done = True
                    break
                except pikepdf.PasswordError:
                    continue
                except Exception as e:
                    stats["failed"] += 1
                    log(f"FAIL {rel} :: {str(e)[:80]}")
                    done = True
                    break
            if not done:
                stats["mismatch"] += 1
                log(f"MISMATCH {rel}")
        except Exception as e:
            stats["failed"] += 1
            log(f"FAIL {rel} :: {str(e)[:80]}")

log("=" * 50)
log(f"total={stats['total']} plain={stats['plain']} decrypted={stats['decrypted']} mismatch={stats['mismatch']} failed={stats['failed']}")
with open(LOG, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
