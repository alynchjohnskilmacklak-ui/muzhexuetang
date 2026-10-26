# -*- coding: utf-8 -*-
"""紧急：部署神马新验证文件（4 小时窗口内）"""
import paramiko, hashlib, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
COMPOSE = f"{SRC}/compose.production.yaml"
STAMP = "20261003"
NAME = "shenma-site-verification.txt"
LOCAL = rf"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\{NAME}"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

with open(LOCAL, "rb") as f:
    local_bytes = f.read()
expect = local_bytes.decode("utf-8")
print(f"本地文件: {len(local_bytes)} B  sha256={hashlib.sha256(local_bytes).hexdigest()[:16]}")
print(f"本地内容: {expect!r}")

# ---------- 1. 上传 ----------
print("\n" + "=" * 72); print("步骤 1/4：上传到 shared 与 source"); print("=" * 72)
tmp = f"/tmp/{NAME}.new-{STAMP}"
sftp.put(LOCAL, tmp)
out, _ = run(f"sha256sum '{tmp}' | cut -c1-16")
if out != hashlib.sha256(local_bytes).hexdigest()[:16]:
    print(f"  ✗ 上传校验失败（服务器 {out}），中止"); sftp.close(); cli.close(); sys.exit(1)
print("  ✓ 上传校验通过")
run(f"cp -p '{SHARED}/{NAME}' '{SHARED}/{NAME}.bak-{STAMP}' 2>/dev/null; "
    f"cp -p '{SRC}/public/{NAME}' '{SRC}/public/{NAME}.bak-{STAMP}' 2>/dev/null")
out, err = run(f"cat '{tmp}' > '{SHARED}/{NAME}' && cat '{tmp}' > '{SRC}/public/{NAME}' "
               f"&& chmod 644 '{SHARED}/{NAME}' '{SRC}/public/{NAME}' && rm -f '{tmp}' && stat -c '%s' '{SHARED}/{NAME}'")
print(f"  已写入两处，大小 {out} B（应 68） {err}")

# ---------- 2. compose ----------
print("\n" + "=" * 72); print("步骤 2/4：compose 增加挂载"); print("=" * 72)
out, _ = run(f"cat '{COMPOSE}'")
line = f"      - {SHARED}/{NAME}:/app/public/{NAME}\n"
if f"/app/public/{NAME}" in out:
    print("  该挂载已存在，跳过")
else:
    anchor = f"      - {SHARED}/about.html:/app/public/about.html\n"
    if anchor not in out:
        anchor = f"      - {SHARED}/volunteer/docs:/app/public/volunteer/docs\n"
    if anchor not in out:
        print("  ✗ 找不到插入锚点，中止"); sftp.close(); cli.close(); sys.exit(1)
    run(f"cp -p '{COMPOSE}' '{COMPOSE}.bak-shenma-{STAMP}'")
    with sftp.open(COMPOSE, "w") as f:
        f.write(out.replace(anchor, anchor + line, 1))
    print(f"  已插入挂载，备份为 compose.production.yaml.bak-shenma-{STAMP}")

out, _ = run(f"sed -n '/^  app:/,/^  [a-z]/p' '{COMPOSE}' | grep -A14 'volumes:'")
print("  --- volumes 段 ---"); print(out)
out, err = run(f"cd '{SRC}' && docker compose -f compose.production.yaml config --quiet && echo OK")
print(f"  语法校验: {out or err}")

# ---------- 3. 重建 ----------
print("\n" + "=" * 72); print("步骤 3/4：重建 app 容器"); print("=" * 72)
out, err = run(f"cd '{SRC}' && docker compose -f compose.production.yaml up -d --no-deps app 2>&1 | tail -8")
print(out or err)
for i in range(24):
    time.sleep(5)
    st, _ = run("docker inspect edu-manage-app-1 --format '{{.State.Status}}/{{.State.Health.Status}}'")
    if st == "running/healthy":
        print(f"  容器 {st} ✓（{(i + 1) * 5}s）"); break
    if i % 3 == 2: print(f"    ... {st}")
else:
    print(f"  ✗ 未变 healthy，当前 {st}")

# ---------- 4. 校验 ----------
print("\n" + "=" * 72); print("步骤 4/4：校验"); print("=" * 72)
out, _ = run(f"docker exec edu-manage-app-1 cat /app/public/{NAME}")
print(f"  容器内   : {out!r}  {'✓' if out == expect else '✗'}")
out, _ = run(f"curl -s https://muzhexuetang.xyz/{NAME}")
print(f"  公网返回 : {out!r}  {'✓' if out == expect else '✗'}")
code, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' https://muzhexuetang.xyz/{NAME}")
size, _ = run(f"curl -s https://muzhexuetang.xyz/{NAME} | wc -c")
print(f"  HTTP {code}  {size} B（应 68）")
out, _ = run("docker exec edu-manage-app-1 sh -c \"grep -E ' /app/public/shenma' /proc/self/mountinfo\"")
print(f"  挂载确认 : {out if out else '(未看到)'}")
# 顺带确认首页未受影响
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页未受影响: {out} (应 5dd81479b6aa0bfa)")

sftp.close(); cli.close()
print("\n★ 完成——请立刻回神马后台点「验证」按钮")
