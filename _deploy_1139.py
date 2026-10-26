# -*- coding: utf-8 -*-
"""部署 proxy 修复版并验证首页不再被重定向"""
import paramiko, time

HOST = "121.43.155.202"
USER = "root"
PASSWORD = "Ren031213!"
PKG = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-runtime-20260908-1139.tar.gz"
SHA = PKG + ".sha256"
REMOTE = "/tmp/edu-manage-runtime-20260908-1139.tar.gz"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("==> 连接服务器 ...")
cli.connect(HOST, username=USER, password=PASSWORD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, timeout=600):
    _, o, e = cli.exec_command(cmd, timeout=timeout, get_pty=True)
    return o.read().decode("utf-8", "replace"), e.read().decode("utf-8", "replace")

print("==> 上传发布包 ...")
t0 = time.time()
sftp.put(PKG, REMOTE)
sftp.put(SHA, REMOTE + ".sha256")
sftp.close()
print("    上传完成 %.0f 秒" % (time.time() - t0))

print("==> 校验 + 部署 ...")
out, err = run("cd /tmp && sha256sum -c edu-manage-runtime-20260908-1139.tar.gz.sha256 && cd /opt/edu-manage && bash scripts/deploy-prebuilt-tar.sh %s" % REMOTE, timeout=900)
print(out[-2500:])

print("==> 验证：未登录访问 / （应 200 且为新版首页）...")
time.sleep(4)
out, _ = run('curl -s -o /dev/null -w "%{http_code}" https://muzhexuetang.xyz/', timeout=30)
print("  / ->", out.strip())
out, _ = run('curl -s https://muzhexuetang.xyz/ | grep -o "<title>[^<]*</title>" | head -1', timeout=30)
print("  title:", out.strip())

print("==> 验证：带 cookie 访问 / （已登录态也不应被重定向）...")
out, _ = run('curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}" -H "Cookie: next-auth.session-token=invalid-test" https://muzhexuetang.xyz/', timeout=30)
print("  带cookie / ->", out.strip())

print("==> 验证：/login 与 /about ...")
out, _ = run('curl -s -o /dev/null -w "%{http_code}" https://muzhexuetang.xyz/login', timeout=30)
print("  /login ->", out.strip())
out, _ = run('curl -s -o /dev/null -w "%{http_code}" https://muzhexuetang.xyz/about', timeout=30)
print("  /about ->", out.strip())
cli.close()
print("==> 完成")
