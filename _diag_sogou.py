# -*- coding: utf-8 -*-
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)
def run(c):
    _, o, e = cli.exec_command(c, timeout=90)
    return o.read().decode("utf-8", "replace").strip()

print("=== 1) /app/public 是否挂载点 ===")
print(run("docker exec edu-manage-app-1 sh -c \"grep -E ' /app/public( |/)' /proc/self/mountinfo\""))
print()
print("=== 2) 容器内 /app/public 现有验证文件 ===")
print(run("docker exec edu-manage-app-1 ls -la /app/public/ | grep -iE 'verify|sogou|shenma|Bing|baidu'"))
print()
print("=== 3) https 取搜狗文件时的真实响应 ===")
print(run("curl -sI https://muzhexuetang.xyz/sogousiteverification.txt | head -8"))
print()
print("=== 4) 三个平台验证文件在 http/https 的实际表现 ===")
FMT = "'%{http_code} %{size_download}'"
for f in ["sogousiteverification.txt", "shenma-site-verification.txt",
          "baidu_verify_codeva-LcCyyIUZRF.html", "BingSiteAuth.xml", "ByteDanceVerify.html"]:
    a = run("curl -s -o /dev/null -w " + FMT + " 'http://muzhexuetang.xyz/" + f + "'")
    b = run("curl -s -o /dev/null -w " + FMT + " 'https://muzhexuetang.xyz/" + f + "'")
    print("  %-38s http=[%s]  https=[%s]" % (f, a, b))
print()
print("=== 5) 当前 80 端口新增的例外 ===")
print(run("grep -n 'location = ' /etc/nginx/sites-available/edu-manage.conf"))
cli.close()
