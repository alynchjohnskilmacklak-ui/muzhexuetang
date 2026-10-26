import paramiko
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)
def run(c):
    _,o,e = cli.exec_command(c, timeout=90); return o.read().decode("utf-8","replace").strip()
print("=== 修复后（reload 时间点之后）神马 IP 的访问记录 ===")
print(run("awk '$0 ~ /140\\.205\\.85/ && $4 > \"[03/Oct/2026:16:08\"' /var/log/nginx/access.log | tail -20") or "  (还没有新的访问 —— 等你点验证)")
print()
print("=== 最近 12 条验证文件相关访问 ===")
print(run("grep 'shenma-site-verification' /var/log/nginx/access.log | tail -12"))
print()
print("=== nginx 配置改动确认（80 端口 server 块）===")
print(run("sed -n '20,45p' /etc/nginx/sites-available/edu-manage.conf"))
cli.close()
