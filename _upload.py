# -*- coding: utf-8 -*-
import paramiko, os

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20, banner_timeout=20, auth_timeout=20)
sftp = cli.open_sftp()

BASE = "/opt/edu-manage-docker/source"
LOCAL = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage"
DEPLOY = r"D:\01muzhexuetang\muzhexuetang\coding\_deploy"

files = [
    # (local path, remote relative path, source: local or deploy)
    (DEPLOY + r"\parent-dashboard.ts", "src/lib/parent-dashboard.ts"),
    (DEPLOY + r"\teacher-dashboard.ts", "src/lib/teacher-dashboard.ts"),
    (DEPLOY + r"\teacher-dashboard-page.tsx", "src/app/teacher/dashboard/page.tsx"),
    (LOCAL + r"\src\app\(main)\dashboard\page.tsx", "src/app/(main)/dashboard/page.tsx"),
    (LOCAL + r"\src\app\parent\dashboard\client.tsx", "src/app/parent/dashboard/client.tsx"),
    (LOCAL + r"\src\components\Parent\HoursLeaderboard.tsx", "src/components/Parent/HoursLeaderboard.tsx"),
    (LOCAL + r"\src\components\teacher\TeacherTrendCharts.tsx", "src/components/teacher/TeacherTrendCharts.tsx"),
    (LOCAL + r"\src\components\Dashboard\OperatingOverview.tsx", "src/components/Dashboard/OperatingOverview.tsx"),
    (LOCAL + r"\public\home.html", "public/home.html"),
    (LOCAL + r"\public\shenma-site-verification.txt", "public/shenma-site-verification.txt"),
]

ok = 0
for local_path, remote_rel in files:
    remote = BASE + "/" + remote_rel
    try:
        # backup existing remote file
        try:
            sftp.stat(remote)
            sftp.rename(remote, remote + ".bak-20261002")
            print(f"backed up: {remote_rel}")
        except FileNotFoundError:
            print(f"(no backup needed: {remote_rel})")
        sftp.put(local_path, remote)
        st = sftp.stat(remote)
        print(f"uploaded: {remote_rel} ({st.st_size}B)")
        ok += 1
    except Exception as e:
        print(f"FAILED: {remote_rel}: {e}")

sftp.close()
cli.close()
print(f"done, {ok}/{len(files)} uploaded")
