# -*- coding: utf-8 -*-
"""修复神马验证：更新 meta 标签 + 更新验证文件（两者同时到位）"""
import paramiko, hashlib, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
STAMP = "20261003"
LOCAL = r"D:\01muzhexuetang\muzhexuetang\coding"

FILES = [
    ("home.html",                    f"{LOCAL}\\edu-manage\\public\\home.html"),
    ("shenma-site-verification.txt", f"{LOCAL}\\edu-manage\\public\\shenma-site-verification.txt"),
]

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

def lsha16(p):
    with open(p, "rb") as f: return hashlib.sha256(f.read()).hexdigest()[:16]

print("=" * 72); print("步骤 1/3：上传（先校验，后替换）"); print("=" * 72)
for name, local in FILES:
    tmp = f"/tmp/{name}.fix-{STAMP}"
    sftp.put(local, tmp)
    got, _ = run(f"sha256sum '{tmp}' | cut -c1-16")
    if got != lsha16(local):
        print(f"  ✗ {name} 上传校验失败（{got} != {lsha16(local)}），中止")
        sftp.close(); cli.close(); sys.exit(1)
    # 备份（服务器两处）
    run(f"cp -p '{SHARED}/{name}' '{SHARED}/{name}.bak2-{STAMP}' 2>/dev/null")
    run(f"cp -p '{SRC}/public/{name}' '{SRC}/public/{name}.bak2-{STAMP}' 2>/dev/null")
    out, err = run(f"cat '{tmp}' > '{SHARED}/{name}' && cat '{tmp}' > '{SRC}/public/{name}' "
                   f"&& chmod 644 '{SHARED}/{name}' '{SRC}/public/{name}' && rm -f '{tmp}' && stat -c '%s' '{SHARED}/{name}'")
    print(f"  ✓ {name}  本地={lsha16(local)}  →  shared({out} B) + source  {err}")

print(); print("=" * 72); print("步骤 2/3：重建 app 容器"); print("=" * 72)
out, err = run(f"cd '{SRC}' && docker compose -f compose.production.yaml up -d --no-deps app 2>&1 | tail -6")
print(out or err)
for i in range(24):
    time.sleep(5)
    st, _ = run("docker inspect edu-manage-app-1 --format '{{.State.Status}}/{{.State.Health.Status}}'")
    if st == "running/healthy":
        print(f"  容器 {st} ✓（{(i + 1) * 5}s）"); break
    if i % 3 == 2: print(f"    ... {st}")
else:
    print(f"  ✗ 未变 healthy，当前 {st}")

print(); print("=" * 72); print("步骤 3/3：逐项校验"); print("=" * 72)
base = "https://muzhexuetang.xyz"

# 1. 验证文件
out, _ = run(f"curl -s {base}/shenma-site-verification.txt")
exp_file = "shenma-site-verification:3f17ed1785b9a82fd4176b64ecffb169_1791013955"
print(f"  [文件验证] {out!r}")
print(f"             期望 {exp_file!r}  →  {'✓' if out == exp_file else '✗'}")
code, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' {base}/shenma-site-verification.txt")
print(f"             HTTP {code}")

# 2. meta 标签
out, _ = run(f"curl -s {base}/ | grep -o '<meta[^>]*shenma[^>]*>' | head -1")
exp_meta = '<meta name="shenma-site-verification" content="3f17ed1785b9a82fd4176b64ecffb169_1791013602"/>'
print(f"\n  [代码验证] {out}")
print(f"             期望 {exp_meta}")
print(f"             →  {'✓' if out.strip() == exp_meta else '✗'}")

# 3. 容器内一致性
out, _ = run("docker exec edu-manage-app-1 grep -o 'shenma-site-verification\" content=\"[^\"]*\"' /app/public/home.html")
print(f"\n  容器内 home.html meta: {out}")
out, _ = run("docker exec edu-manage-app-1 cat /app/public/shenma-site-verification.txt")
print(f"  容器内 .txt          : {out}")

# 4. 首页回归（确保 meta 改动没破坏别的）
out, _ = run(f"curl -s {base}/ | sha256sum | cut -c1-16")
size, _ = run(f"curl -s {base}/ | wc -c")
title, _ = run(f"curl -s {base}/ | grep -o '<title>[^<]*</title>'")
print(f"\n  首页: sha={out}  {size} B  {title}")
print(f"        （改前 5dd81479b6aa0bfa / 67044 B；只换了 meta 内容，字节数不变）")
for p in ["/about", "/login"]:
    c, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' {base}{p}")
    print(f"  {p:8s} HTTP {c}")

sftp.close(); cli.close()
print("\n★ 完成——现在去神马后台：代码验证 和 文件验证 两个页签都可以点「验证」")
