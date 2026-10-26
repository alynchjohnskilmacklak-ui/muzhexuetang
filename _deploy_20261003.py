# -*- coding: utf-8 -*-
"""部署：备份 → 上传 → 立即校验（仅两个静态 HTML 文件）"""
import paramiko, hashlib, io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "101.200.191.201"; USER = "root"; PWD = "Ren031213"
SRC = "/opt/edu-manage-docker/source/public"
STAMP = "20261003"
LOCAL = r"D:\01muzhexuetang\muzhexuetang\coding"

FILES = [
    ("home.html",  f"{LOCAL}\\_preview\\home-after.html"),
    ("about.html", f"{LOCAL}\\_preview\\about-after.html"),
]

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()


def run(cmd, t=90):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()


def remote_sha(path):
    out, _ = run(f"sha256sum '{path}' | cut -c1-16")
    return out


def local_sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]


print("=" * 70)
print("步骤 1/4：服务器端备份")
print("=" * 70)
for name, _ in FILES:
    remote = f"{SRC}/{name}"
    bak = f"{remote}.bak-{STAMP}"
    out, err = run(f"cp -p '{remote}' '{bak}' && ls -l '{bak}' | awk '{{print $5, $9}}'")
    print(f"  {name} -> {bak}")
    print(f"    {out if out else err}")

print()
print("=" * 70)
print("步骤 2/4：上传（先传临时文件，校验通过再原子替换）")
print("=" * 70)
for name, local in FILES:
    remote = f"{SRC}/{name}"
    tmp = f"/tmp/{name}.new-{STAMP}"
    sftp.put(local, tmp)
    lh, th = local_sha(local), remote_sha(tmp)
    print(f"  {name}: 本地={lh}  服务器临时={th}  {'一致 ✓' if lh == th else '不一致 ✗'}")
    if lh != th:
        print("     !! 上传校验失败，中止，未替换线上文件")
        sftp.close(); cli.close(); sys.exit(1)
    out, err = run(f"cat '{tmp}' > '{remote}' && rm -f '{tmp}' && stat -c %s '{remote}'")
    print(f"    已替换线上文件，新大小 {out} 字节 {err}")

print()
print("=" * 70)
print("步骤 3/4：服务器端校验")
print("=" * 70)
for name, local in FILES:
    remote = f"{SRC}/{name}"
    print(f"  {name}: 服务器={remote_sha(remote)}  本地={local_sha(local)}")

print()
print("=" * 70)
print("步骤 4/4：公网访问校验")
print("=" * 70)
for path in ["/", "/about"]:
    sha, _ = run(f"curl -s -H 'Cache-Control: no-cache' https://muzhexuetang.xyz{path} | sha256sum | cut -c1-16")
    size, _ = run(f"curl -s https://muzhexuetang.xyz{path} | wc -c")
    title, _ = run(f"curl -s https://muzhexuetang.xyz{path} | grep -o '<title>[^<]*</title>' | head -1")
    code, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' https://muzhexuetang.xyz{path}")
    print(f"  {path:8s} HTTP {code}  sha256={sha}  size={size}")
    print(f"           {title}")

sftp.close(); cli.close()
print("\n部署完成")
