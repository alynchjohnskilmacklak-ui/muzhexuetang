# -*- coding: utf-8 -*-
"""paramiko 执行远端 psql 查询（供排查用）"""
import sys
import paramiko

HOST = "101.200.191.201"
USER = "root"

def main():
    db = sys.argv[1]
    sql = sys.stdin.read().strip()
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, username=USER, timeout=30, look_for_keys=True, allow_agent=True)
    cmd = "docker exec edu-manage-db-1 psql -U edu_admin -d %s -c '%s'" % (db, sql.replace("'", "'\\''"))
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=120)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    print("EXIT", code)
    if out.strip():
        print(out)
    if err.strip():
        print("ERR:", err[-2000:])
    cli.close()

if __name__ == "__main__":
    main()
