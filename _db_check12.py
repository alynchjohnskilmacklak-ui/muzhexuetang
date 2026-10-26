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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:6000]}\n  {err.strip()[:1000]}")
    return code

# 本月(2026-10)两个马紫晨的考勤
sql = r"""SELECT a."studentId", s.name, COUNT(*) cnt, COALESCE(SUM(a."hoursDeducted"),0) hrs,
       MIN(cl."lessonDate")::date mind, MAX(cl."lessonDate")::date maxd
FROM "Attendance" a
JOIN "Student" s ON s.id = a."studentId"
JOIN "ClassLesson" cl ON cl.id = a."lessonId"
WHERE a."studentId" IN ('cmtmx2rnv0002dddb4ienhctt','cmpamjbfj0006cv8l0w8g9w99')
  AND cl."lessonDate" >= DATE '2026-10-01' AND cl."lessonDate" < DATE '2026-11-01'
  AND a."deletedAt" IS NULL AND cl."deletedAt" IS NULL
GROUP BY a."studentId", s.name;
"""
cmd = "cat > /tmp/q4.sql <<'SQLEOF'\n" + sql + "SQLEOF"
run(cmd, 30)
run("docker exec -i edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong < /tmp/q4.sql", 60)

# 同班：活跃班级 enrollment 中所有学生本月课时（与 API 口径一致）
sql2 = r"""SELECT e."groupId", g.name AS group_name, e."studentId", s.name,
       COALESCE(SUM(a."hoursDeducted"),0) hrs
FROM "Enrollment" e
JOIN "ClassGroup" g ON g.id = e."groupId"
JOIN "Student" s ON s.id = e."studentId"
LEFT JOIN "Attendance" a ON a."studentId" = e."studentId"
  AND a."deletedAt" IS NULL
  AND a."lessonId" IN (SELECT cl.id FROM "ClassLesson" cl WHERE cl."lessonDate" >= DATE '2026-10-01' AND cl."lessonDate" < DATE '2026-11-01' AND cl."deletedAt" IS NULL)
WHERE e."groupId" IN ('cmty63nfa00t6bsanvuevv736','cmrc1k1pi02xhnropf6opibvm','cms1w29ht0006yagc4oz01adf')
  AND e."status" = 'ACTIVE'
  AND s."deletedAt" IS NULL
GROUP BY e."groupId", g.name, e."studentId", s.name
ORDER BY e."groupId", hrs DESC;
"""
cmd = "cat > /tmp/q5.sql <<'SQLEOF'\n" + sql2 + "SQLEOF"
run(cmd, 30)
run("docker exec -i edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong < /tmp/q5.sql", 60)

cli.close()
print("DONE")
