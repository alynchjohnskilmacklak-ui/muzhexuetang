# -*- coding: utf-8 -*-
import paramiko
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect('101.200.191.201', username='root', password='Ren031213', timeout=30)
q = "SELECT id, feedbackCourseType, feedbackGroupId, classLessonId, targetType, status FROM \"ClassroomFeedback\" WHERE id='cmuuw9fnp000pj7fn3igohw9s';"
cmd = 'docker exec edu-manage-db-1 psql -U edu_manage -d edu_manage -t -A -F "|" -c "%s"' % q.replace('"', '\\"')
stdin, stdout, stderr = cli.exec_command(cmd, timeout=60)
print("Q:", cmd)
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode()[:300])
cli.close()
