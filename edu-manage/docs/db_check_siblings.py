# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', key_filename=r'C:\Users\Administrator\.ssh\id_rsa', timeout=25)

def run(cmd, label):
    print('='*12, label, '='*12)
    _, o, e = ssh.exec_command(cmd, timeout=90)
    out = o.read().decode('utf-8', 'replace').strip()
    err = e.read().decode('utf-8', 'replace').strip()
    print(out if out else '(无输出)')
    if err:
        print('[err]', err[:300])

# 读取 .env 中 POSTGRES_PASSWORD
run("grep POSTGRES_PASSWORD /opt/edu-manage-docker/source/.env | head -1", '.env 密码')

run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT id, name, grade, status, \\"parentId\\", \\"totalHours\\", \\"remainHours\\", \\"mainTeacherId\\" FROM \\"Student\\" WHERE name IN ('马紫晨','马子墨');"''', '学生记录')

run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT s.name, e.status, e.\\"subjects\\", g.name AS group_name, e.\\"totalHours\\", e.\\"remainHours\\" FROM \\"Enrollment\\" e JOIN \\"Student\\" s ON s.id=e.\\"studentId\\" JOIN \\"ClassGroup\\" g ON g.id=e.\\"groupId\\" WHERE s.name IN ('马紫晨','马子墨') AND e.\\"deletedAt\\" IS NULL;"''', '报名/班级')

run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT s.name, a.status, a.\\"hoursDeducted\\", l.\\"lessonDate\\", l.\\"startTime\\", l.\\"endTime\\" FROM \\"Attendance\\" a JOIN \\"Student\\" s ON s.id=a.\\"studentId\\" JOIN \\"ClassLesson\\" l ON l.id=a.\\"lessonId\\" WHERE s.name IN ('马紫晨','马子墨') AND l.\\"lessonDate\\" >= '2026-10-01' AND a.\\"deletedAt\\" IS NULL ORDER BY s.name, l.\\"lessonDate\\";"''', '本月考勤明细')

ssh.close()
print('DONE')
