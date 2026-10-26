# -*- coding: utf-8 -*-
import paramiko, os, sys

SRC = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-charts-v2-image.tar.gz"
DST = "/tmp/edu-manage-charts-v2-image.tar.gz"

print("local size:", os.path.getsize(SRC))

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20, banner_timeout=20, auth_timeout=20)
sftp = cli.open_sftp()

def progress(done, total):
    pct = done * 100.0 / total
    sys.stdout.write(f"\r{int(pct)}% ({done}/{total})")
    sys.stdout.flush()

try:
    sftp.put(SRC, DST, callback=progress)
    print("\nupload done")
    st = sftp.stat(DST)
    print("remote size:", st.st_size)
except Exception as e:
    print("\nFAILED:", e)
    sys.exit(1)
finally:
    sftp.close()
    cli.close()
print("OK")
