# -*- coding: utf-8 -*-
import paramiko

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20, banner_timeout=20, auth_timeout=20)

def run(cmd, timeout=120):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    code = stdout.channel.recv_exit_status()
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:5000]}\n  {err.strip()[:1000]}")
    return code

# 1) 两个马紫晨的活跃班级
run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT e.studentId, e.groupId, e.status, s.name FROM \\"Enrollment\\" e JOIN \\"Student\\" s ON s.id = e.studentId WHERE e.studentId IN ('cmtmx2rnv0002dddb4ienhctt','cmpamjbfj0006cv8l0w8g9w99') AND e.status = 'ACTIVE';"''', 60)

# 2) 本月(2026-10)考勤记录
run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT a.studentId, s.name, COUNT(*) cnt, COALESCE(SUM(a.\"hoursDeducted\"),0) hrs, MIN(a.\"lessonDate\") mind, MAX(a.\"lessonDate\") maxd FROM \\"Attendance\\" a JOIN \\"Student\\" s ON s.id = a.studentId WHERE a.studentId IN ('cmtmx2rnv0002dddb4ienhctt','cmpamjbfj0006cv8l0w8g9w99') AND a.\"lessonDate\" >= '2026-10-01' AND a.\"lessonDate\" < '2026-11-01' AND a.\"deletedAt\" IS NULL GROUP BY a.studentId, s.name;"''', 60)

# 3) 最近一个月内(9/3~10/3)的考勤
run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT a.studentId, s.name, COUNT(*) cnt, COALESCE(SUM(a.\"hoursDeducted\"),0) hrs, MIN(a.\"lessonDate\") mind, MAX(a.\"lessonDate\") maxd FROM \\"Attendance\\" a JOIN \\"Student\\" s ON s.id = a.studentId WHERE a.studentId IN ('cmtmx2rnv0002dddb4ienhctt','cmpamjbfj0006cv8l0w8g9w99') AND a.\"lessonDate\" >= '2026-09-03' AND a.\"deletedAt\" IS NULL GROUP BY a.studentId, s.name;"''', 60)

cli.close()
print("DONE")
