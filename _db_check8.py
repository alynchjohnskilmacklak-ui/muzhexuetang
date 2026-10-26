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

sql = r"""SELECT e."studentId", e."groupId", e."status", s.name
FROM "Enrollment" e JOIN "Student" s ON s.id = e."studentId"
WHERE e."studentId" IN ('cmtmx2rnv0002dddb4ienhctt','cmpamjbfj0006cv8l0w8g9w99') AND e."status" = 'ACTIVE';
"""
cmd = "cat > /tmp/q1.sql <<'SQLEOF'\n" + sql + "SQLEOF"
run(cmd, 30)
run("docker exec -i edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -f /tmp/q1.sql 2>&1 || true", 60)

sql2 = r"""SELECT a."studentId", s.name, COUNT(*) cnt, COALESCE(SUM(a."hoursDeducted"),0) hrs,
       MIN(a."lessonDate") mind, MAX(a."lessonDate") maxd
FROM "Attendance" a JOIN "Student" s ON s.id = a."studentId"
WHERE a."studentId" IN ('cmtmx2rnv0002dddb4ienhctt','cmpamjbfj0006cv8l0w8g9w99')
  AND a."lessonDate" >= DATE '2026-10-01' AND a."lessonDate" < DATE '2026-11-01'
  AND a."deletedAt" IS NULL
GROUP BY a."studentId", s.name;
"""
cmd = "cat > /tmp/q2.sql <<'SQLEOF'\n" + sql2 + "SQLEOF"
run(cmd, 30)
run("docker exec -i edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -f /tmp/q2.sql 2>&1 || true", 60)

sql3 = r"""SELECT a."studentId", s.name, COUNT(*) cnt, COALESCE(SUM(a."hoursDeducted"),0) hrs,
       MIN(a."lessonDate") mind, MAX(a."lessonDate") maxd
FROM "Attendance" a JOIN "Student" s ON s.id = a."studentId"
WHERE a."studentId" IN ('cmtmx2rnv0002dddb4ienhctt','cmpamjbfj0006cv8l0w8g9w99')
  AND a."lessonDate" >= DATE '2026-09-03' AND a."deletedAt" IS NULL
GROUP BY a."studentId", s.name;
"""
cmd = "cat > /tmp/q3.sql <<'SQLEOF'\n" + sql3 + "SQLEOF"
run(cmd, 30)
run("docker exec -i edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -f /tmp/q3.sql 2>&1 || true", 60)

cli.close()
print("DONE")
