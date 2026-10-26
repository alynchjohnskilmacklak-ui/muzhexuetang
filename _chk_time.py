import paramiko, datetime
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)
def run(c):
    _,o,e = cli.exec_command(c, timeout=60); return o.read().decode("utf-8","replace").strip()
print("服务器 UTC 时间 : " + run("date -u '+%Y-%m-%d %H:%M:%S'"))
print("服务器 本地时间 : " + run("date '+%Y-%m-%d %H:%M:%S %Z'"))
print("服务器 epoch    : " + run("date +%s"))
print()
print("--- 当前线上验证文件内容 ---")
print("  " + run("curl -s https://muzhexuetang.xyz/shenma-site-verification.txt"))
print("--- 当前线上 meta 标签 ---")
print("  " + run("curl -s https://muzhexuetang.xyz/ | grep -o '<meta[^>]*shenma[^>]*>' | head -1"))
cli.close()
