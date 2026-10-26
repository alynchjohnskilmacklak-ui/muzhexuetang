# -*- coding: utf-8 -*-
"""正式部署：bind mount 两个静态页 + 重建 app 容器 + 校验"""
import paramiko, hashlib, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
COMPOSE = f"{SRC}/compose.production.yaml"
STAMP = "20261003"
LOCAL = r"D:\01muzhexuetang\muzhexuetang\coding"

FILES = [("home.html", f"{LOCAL}\\_preview\\home-after.html"),
         ("about.html", f"{LOCAL}\\_preview\\about-after.html")]

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

def lsha(p):
    with open(p, "rb") as f: return hashlib.sha256(f.read()).hexdigest()[:16]

def rsha(p):
    out, _ = run(f"sha256sum '{p}' 2>/dev/null | cut -c1-16"); return out

# ---------- 1. 上传新文件到 shared（容器待挂载的位置）----------
print("=" * 72); print("步骤 1/5：上传到 shared 目录"); print("=" * 72)
for name, local in FILES:
    tmp = f"/tmp/{name}.new-{STAMP}"
    sftp.put(local, tmp)
    if lsha(local) != rsha(tmp):
        print(f"  {name} 上传校验失败，中止"); sftp.close(); cli.close(); sys.exit(1)
    out, err = run(f"cat '{tmp}' > '{SHARED}/{name}' && chmod 644 '{SHARED}/{name}' && rm -f '{tmp}' && sha256sum '{SHARED}/{name}' | cut -c1-16")
    print(f"  {name}: {out}  {'✓' if out == lsha(local) else '✗'}  (本地 {lsha(local)})  {err}")

# ---------- 2. 备份并修改 compose ----------
print(); print("=" * 72); print("步骤 2/5：compose 增加两个 bind mount"); print("=" * 72)
sftp.get(COMPOSE, f"{LOCAL}\\_preview\\_compose.production.yaml.orig")
print(f"  已下载原文件到 _preview/_compose.production.yaml.orig")

anchor = "      - /srv/edu-manage/shared/public/volunteer/docs:/app/public/volunteer/docs\n"
add = ("      - /srv/edu-manage/shared/public/home.html:/app/public/home.html\n"
       "      - /srv/edu-manage/shared/public/about.html:/app/public/about.html\n")

out, err = run(f"cat '{COMPOSE}'")
if anchor not in out:
    print("  ✗ 未找到插入锚点，中止（不改动线上配置）"); sftp.close(); cli.close(); sys.exit(1)
if "/app/public/home.html" in out:
    print("  已存在挂载，跳过修改")
    new = out
else:
    new = out.replace(anchor, anchor + add, 1)
    bak = f"{COMPOSE}.bak-seo-{STAMP}"
    run(f"cp -p '{COMPOSE}' '{bak}'")
    print(f"  已备份到 {bak}")
    with sftp.open(COMPOSE, "w") as f:
        f.write(new)
    print("  已写入新 compose")

print("  --- 修改后的 volumes 段 ---")
out2, _ = run(f"sed -n '/^  app:/,/^  [a-z]/p' '{COMPOSE}' | grep -A12 'volumes:'")
print(out2)

print("  --- compose 语法校验 ---")
out3, err3 = run(f"cd '{SRC}' && docker compose -f compose.production.yaml config --quiet && echo 'compose 配置合法 ✓'")
print("  " + (out3 or ("✗ " + err3)))

# ---------- 3. 重建 app 容器 ----------
print(); print("=" * 72); print("步骤 3/5：重建 app 容器（不动 db / redis）"); print("=" * 72)
out, err = run(f"cd '{SRC}' && docker compose -f compose.production.yaml up -d --no-deps app 2>&1 | tail -15")
print(out or err)

print("  等待健康检查...")
for i in range(24):
    time.sleep(5)
    st, _ = run("docker inspect edu-manage-app-1 --format '{{.State.Status}}/{{.State.Health.Status}}'")
    if st == "running/healthy":
        print(f"  容器状态：{st} ✓（等待 {(i+1)*5}s）"); break
    if i % 3 == 2:
        print(f"    ... 当前 {st}")
else:
    print(f"  ✗ 容器未在 120s 内变为 healthy，当前 {st}")
    out, _ = run("docker logs edu-manage-app-1 --tail 30 2>&1")
    print(out)

# ---------- 4. 容器内校验 ----------
print(); print("=" * 72); print("步骤 4/5：容器内文件与挂载校验"); print("=" * 72)
out, _ = run("docker exec edu-manage-app-1 sha256sum /app/public/home.html /app/public/about.html | cut -c1-16,66-200")
print(out)
out, _ = run("docker exec edu-manage-app-1 sh -c \"grep -E ' /app/public/(home|about).html' /proc/self/mountinfo\"")
print("  挂载确认："); print(out if out else "  (未看到挂载记录)")

# ---------- 5. 公网校验 ----------
print(); print("=" * 72); print("步骤 5/5：公网校验"); print("=" * 72)
for path in ["/", "/about", "/login"]:
    code, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' https://muzhexuetang.xyz{path}")
    sha, _ = run(f"curl -s https://muzhexuetang.xyz{path} | sha256sum | cut -c1-16")
    size, _ = run(f"curl -s https://muzhexuetang.xyz{path} | wc -c")
    title, _ = run(f"curl -s https://muzhexuetang.xyz{path} | grep -o '<title>[^<]*</title>' | head -1")
    print(f"  {path:8s} HTTP {code}  sha={sha}  size={size}")
    print(f"           {title}")

sftp.close(); cli.close()
print("\n部署流程结束")
