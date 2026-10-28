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

# 本月考勤具体挂在哪条 student 记录上
run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT a.\\"studentId\\", s.name AS sname, s.status AS sstatus, s.\\"parentId\\", a.\\"enrollmentId\\", a.status AS att_status, a.\\"hoursDeducted\\" FROM \\"Attendance\\" a JOIN \\"Student\\" s ON s.id=a.\\"studentId\\" JOIN \\"ClassLesson\\" l ON l.id=a.\\"lessonId\\" WHERE l.\\"lessonDate\\" >= '2026-10-01' AND a.\\"deletedAt\\" IS NULL ORDER BY s.name;"''', '本月考勤的studentId归属')

# 账号A(cmpamjbfd)关联的学生
run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT id, name, grade, status, \\"parentId\\", \\"deletedAt\\" FROM \\"Student\\" WHERE \\"parentId\\"='cmpamjbfd0004cv8lwcxwxysf' ORDER BY name;"''', '账号A关联的学生')

# 马子墨所有历史考勤（10月前）挂在哪些记录
run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT a.\\"studentId\\", s.name, COUNT(*) AS cnt, SUM(a.\\"hoursDeducted\\") AS total_h FROM \\"Attendance\\" a JOIN \\"Student\\" s ON s.id=a.\\"studentId\\" WHERE s.name='马子墨' AND a.\\"deletedAt\\" IS NULL GROUP BY a.\\"studentId\\", s.name;"''', '马子墨全部考勤归属')

# 马紫晨所有历史考勤归属
run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "SELECT a.\\"studentId\\", s.name, COUNT(*) AS cnt, SUM(a.\\"hoursDeducted\\") AS total_h FROM \\"Attendance\\" a JOIN \\"Student\\" s ON s.id=a.\\"studentId\\" WHERE s.name='马紫晨' AND a.\\"deletedAt\\" IS NULL GROUP BY a.\\"studentId\\", s.name;"''', '马紫晨全部考勤归属')

ssh.close()
print('DONE')
