# -*- coding: utf-8 -*-
"""调用 IndexNow API 提交 URL（从服务器发起，网络更稳定）"""
import paramiko, io, sys, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

KEY = "680d89b9953946efb802698d25294cf6"
HOSTNAME = "muzhexuetang.xyz"
URLS = ["https://muzhexuetang.xyz/", "https://muzhexuetang.xyz/about"]
KEYLOC = f"https://{HOSTNAME}/{KEY}.txt"

payload = {
    "host": HOSTNAME,
    "key": KEY,
    "keyLocation": KEYLOC,
    "urlList": URLS,
}
body = json.dumps(payload, ensure_ascii=False)
print("=" * 72); print("提交内容"); print("=" * 72)
print(json.dumps(payload, ensure_ascii=False, indent=2))

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print(); print("=" * 72); print("1) 自查：key 文件是否可被外网读取（IndexNow 会核对）"); print("=" * 72)
out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' {KEYLOC}")
print(f"  {KEYLOC}  ->  HTTP {out}")

print(); print("=" * 72); print("2) 调用 IndexNow API（api.indexnow.org）"); print("=" * 72)
# 写 payload 到临时文件避免 shell 转义问题
with cli.open_sftp().open("/tmp/indexnow-payload.json", "w") as f:
    f.write(body)
out, err = run("curl -s -o /tmp/in-resp.txt -w '%{http_code}' -X POST 'https://api.indexnow.org/IndexNow' "
               "-H 'Content-Type: application/json; charset=utf-8' "
               "--data-binary @/tmp/indexnow-payload.json")
print(f"  HTTP 状态码: {out}")
print(f"  响应体: [{run('cat /tmp/in-resp.txt')[0]}]")
print()
print("  状态码含义（来自必应后台文档）：")
print("    200 = URL 提交成功")
print("    400 = 格式无效")
print("    403 = 密钥无效（key 未找到 / 文件里没这个密钥）")
print("    422 = URL 不属于该主机，或密钥与协议中的模式不匹配")
print("    429 = 请求过多")

print(); print("=" * 72); print("3) 备用端点（bing 专用）"); print("=" * 72)
out, err = run("curl -s -o /tmp/in-resp2.txt -w '%{http_code}' -X POST 'https://www.bing.com/indexnow' "
               "-H 'Content-Type: application/json; charset=utf-8' "
               "--data-binary @/tmp/indexnow-payload.json")
print(f"  https://www.bing.com/indexnow  ->  HTTP {out}  [{run('cat /tmp/in-resp2.txt')[0]}]")

print(); print("=" * 72); print("4) 稍等，看引擎是否立刻来抓（查日志）"); print("=" * 72)
print("  提交前最新日志时间:", run("tail -1 /var/log/nginx/access.log | awk '{print $4}'")[0])
time.sleep(45)
print("  45 秒后：")
print(run("tail -15 /var/log/nginx/access.log | awk '{print $1, $4, $7, $9, $12, $13, $14}'")[0])

print(); print("=" * 72); print("5) 找 bingbot / 其他 IndexNow 参与引擎的到访"); print("=" * 72)
r = run("grep -iE 'bingbot|indexnow' /var/log/nginx/access.log | tail -12")[0]
print(r if r else "  （暂无新到访，IndexNow 通常几分钟内来）")

cli.close()
