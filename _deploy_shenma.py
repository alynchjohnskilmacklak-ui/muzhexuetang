# -*- coding: utf-8 -*-
"""部署 20260920-1339（含神马验证文件放行）并验证"""
import paramiko, time

HOST, USER, PASSWORD = "121.43.155.202", "root", "Ren031213!"
PKG = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-runtime-20260920-1339.tar.gz"
REMOTE = "/tmp/edu-manage-runtime-20260920-1339.tar.gz"

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
sftp.put(PKG + ".sha256", REMOTE + ".sha256")
sftp.close()
print("    上传完成 %.0f 秒" % (time.time() - t0))

out, err = run("cd /tmp && sha256sum -c edu-manage-runtime-20260920-1339.tar.gz.sha256 && cd /opt/edu-manage && bash scripts/deploy-prebuilt-tar.sh %s" % REMOTE, timeout=900)
print(out[-1800:])

print("==> 验证线上 ===")
time.sleep(4)

def curl(path, extra=""):
    out, _ = run('curl -s -o /dev/null -w "%%{http_code}" %s https://muzhexuetang.xyz%s' % (extra, path), timeout=30)
    return out.strip()

# 1) 神马验证文件
code = curl("/shenma-site-verification.txt")
out, _ = run('curl -s https://muzhexuetang.xyz/shenma-site-verification.txt', timeout=30)
print("  /shenma-site-verification.txt ->", code, "| 内容:", out.strip())

# 2) 回归检查
print("  /        ->", curl("/"))
out, _ = run('curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -H "Cookie: next-auth.session-token=invalid-test" https://muzhexuetang.xyz/', timeout=30)
print("  带cookie / ->", out.strip())
print("  /about   ->", curl("/about"))
print("  /login   ->", curl("/login"))
print("  /robots.txt ->", curl("/robots.txt"))
print("  /sitemap.xml ->", curl("/sitemap.xml"))
cli.close()
print("==> 完成")
