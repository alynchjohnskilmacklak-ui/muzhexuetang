/* 字节安全部署新的神马验证文件（保住原始字节，不做任何换行转换） */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SRC_FILE = 'C:\\Users\\Administrator\\.dsh\\attachments\\v1\\files\\e0\\e076a26aec41e454b42e317ad06da1f791bebb3f4a79c8c9e4253a845b905927\\shenma-site-verification (2).txt';
const NAME = 'shenma-site-verification.txt';
const LOCAL_DIR = path.join(__dirname, 'edu-manage', 'public');
const LOCAL = path.join(LOCAL_DIR, NAME);

const raw = fs.readFileSync(SRC_FILE);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
console.log('=== 源文件字节级检查 ===');
console.log(`  字节数   : ${raw.length}`);
console.log(`  sha256   : ${sha(raw).slice(0, 16)}`);
console.log(`  尾部字节 : ${[...raw.slice(-4)].map((b) => b.toString(16).padStart(2, '0')).join(' ')}`);
console.log(`  是否以换行结尾: ${raw[raw.length - 1] === 0x0a ? '是' : '否'}`);
console.log(`  内容     : ${JSON.stringify(raw.toString('utf8'))}`);

// 备份旧的本地文件
if (fs.existsSync(LOCAL)) {
  const old = fs.readFileSync(LOCAL);
  fs.writeFileSync(LOCAL + '.bak-20261003b', old);
  console.log(`\n  已备份旧文件 (${old.length} B): ${old.toString('utf8').trim()}`);
}

// 写入本地（二进制，原样）
fs.writeFileSync(LOCAL, raw);
const check = fs.readFileSync(LOCAL);
console.log(`\n  已写入本地: ${check.length} B  sha=${sha(check).slice(0, 16)}`);
console.log(`  字节完全一致: ${sha(check) === sha(raw) ? '✓' : '✗'}`);

// 生成 Python 部署脚本
const py = `# -*- coding: utf-8 -*-
import paramiko, hashlib, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
NAME = "${NAME}"
p = Path(r"${LOCAL}")

raw = p.read_bytes()
local_sha = hashlib.sha256(raw).hexdigest()
print(f"本地: {len(raw)} B  sha={local_sha[:16]}  bytes={raw!r}")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

# 备份服务器两处
run(f"cp -p '{SHARED}/{NAME}' '{SHARED}/{NAME}.bak4-20261003' 2>/dev/null")
run(f"cp -p '{SRC}/public/{NAME}' '{SRC}/public/{NAME}.bak4-20261003' 2>/dev/null")

tmp = "/tmp/shenma.new"
sftp.put(str(p), tmp)
got, _ = run(f"sha256sum '{tmp}' | cut -c1-64")
if got != local_sha:
    print(f"  X 上传校验失败 {got[:16]} != {local_sha[:16]}"); sftp.close(); cli.close(); sys.exit(1)
print(f"  上传校验通过 {got[:16]}")

out, err = run(f"cp -f '{tmp}' '{SHARED}/{NAME}' && cp -f '{tmp}' '{SRC}/public/{NAME}' && chmod 644 '{SHARED}/{NAME}' '{SRC}/public/{NAME}' && rm -f '{tmp}' && stat -c %s '{SHARED}/{NAME}'")
print(f"  已覆盖两处，{out} B {err}")

print()
for label, cmd in [
    ("shared ", f"sha256sum '{SHARED}/{NAME}' | cut -c1-16"),
    ("source ", f"sha256sum '{SRC}/public/{NAME}' | cut -c1-16"),
    ("容器内 ", f"docker exec edu-manage-app-1 sha256sum /app/public/{NAME} | cut -c1-16"),
    ("公网   ", f"curl -s https://muzhexuetang.xyz/{NAME} | sha256sum | cut -c1-16"),
]:
    out, _ = run(cmd)
    print(f"  {label}: {out}  {'OK' if out == local_sha[:16] else 'MISMATCH'}")

out, _ = run(f"curl -s https://muzhexuetang.xyz/{NAME}")
print(f"\\n  公网内容: {out!r}")
print(f"  期望内容: {raw.decode('utf-8')!r}")
print(f"  一致: {'✓' if out == raw.decode('utf-8') else '✗'}")
code, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' https://muzhexuetang.xyz/{NAME}")
print(f"  HTTP {code}")

# 首页未受影响
out, _ = run("curl -s https://muzhexuetang.xyz/ | grep -o '<meta[^>]*shenma[^>]*>'")
print(f"\\n  首页 meta: {out}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha : {out} (应 97e36b12acf9a5cc)")

sftp.close(); cli.close()
print("\\n★★ 现在去神马点「验证」")
`;
fs.writeFileSync(path.join(__dirname, '_deploy_shenma3.py'), py, 'utf8');
console.log('\n已生成 _deploy_shenma3.py');
console.log(`部署命令: python _deploy_shenma3.py`);
