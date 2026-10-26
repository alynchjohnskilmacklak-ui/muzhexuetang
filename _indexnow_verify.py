# -*- coding: utf-8 -*-
"""确认 202 语义 + 完整校验 + 建立可复用的 IndexNow 推送脚本"""
import paramiko, io, sys, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

KEY = "680d89b9953946efb802698d25294cf6"
HN = "muzhexuetang.xyz"
URLS = ["https://muzhexuetang.xyz/", "https://muzhexuetang.xyz/about"]

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("=" * 74)
print("1) 202 vs 200 的语义（查 IndexNow 官方文档说明）")
print("=" * 74)
out, _ = run("curl -s https://www.indexnow.org/documentation 2>/dev/null | grep -oiE '<td[^>]*>[0-9]{3}</td>|<td[^>]*>[^<]{3,60}</td>' | head -30")
print(out if out else "  （未能解析，改用已知文档语义）")
print()
print("  已知语义：200 = OK（同步成功）；202 = Accepted（已接受，异步处理）")
print("  202 属于成功返回，仅表示处理方式为异步。")

print()
print("=" * 74)
print("2) 关键校验：bingbot 拿到的 sitemap 是哪个版本")
print("=" * 74)
out, _ = run("grep 'sitemap.xml' /var/log/nginx/access.log | grep -i bingbot | tail -6 | awk '{print $1, $4, $9, $10}'")
print("  bingbot 抓 sitemap 的记录（IP / 时间 / 状态 / 字节）：")
print(out)
print()
print("  当前线上 sitemap 大小:", run("curl -s https://muzhexuetang.xyz/sitemap.xml | wc -c")[0], "B")
print("  含新 lastmod 2026-10-03:", "是 ✓" if "2026-10-03" in run("curl -s https://muzhexuetang.xyz/sitemap.xml")[0] else "否 ✗")

print()
print("=" * 74)
print("3) IndexNow 参与引擎范围")
print("=" * 74)
out, _ = run("curl -s https://www.indexnow.org/ 2>/dev/null | grep -oiE 'bing|yandex|seznam|naver|yep|searchengine[^<]{0,40}' | sort -u | head -12")
print(f"  官方站点提到的引擎: {out if out else '(未解析到)'}")
print("  → 一次提交可同时通知多家，这是 IndexNow 的主要价值")

print()
print("=" * 74)
print("4) 在服务器上建可复用推送脚本")
print("=" * 74)
SCRIPT = """#!/bin/bash
# IndexNow 推送脚本 —— 内容更新后执行，通知所有参与引擎重新抓取
# 用法: bash /opt/edu-manage-docker/source/scripts/indexnow-push.sh [额外URL...]
KEY="680d89b9953946efb802698d25294cf6"
HOSTNAME="muzhexuetang.xyz"
URLS='["https://muzhexuetang.xyz/","https://muzhexuetang.xyz/about"]'

for extra in "$@"; do
  URLS=$(echo "$URLS" | sed "s|]|,\\"$extra\\"]|")
done

PAYLOAD=$(cat <<EOF
{"host":"$HOSTNAME","key":"$KEY","keyLocation":"https://$HOSTNAME/$KEY.txt","urlList":$URLS}
EOF
)

echo "提交内容: $PAYLOAD"
CODE=$(curl -s -o /tmp/indexnow-resp.txt -w '%{http_code}' -X POST 'https://api.indexnow.org/IndexNow' \\
  -H 'Content-Type: application/json; charset=utf-8' --data-binary "$PAYLOAD")
echo "IndexNow 返回: HTTP $CODE"
case "$CODE" in
  200) echo "  ✓ 提交成功";;
  202) echo "  ✓ 已接受（异步处理）";;
  400) echo "  ✗ 格式无效";;
  403) echo "  ✗ 密钥无效 —— 检查 https://$HOSTNAME/$KEY.txt 是否存在且内容为密钥";;
  422) echo "  ✗ URL 不属于该主机，或密钥不匹配";;
  429) echo "  ✗ 请求过多，稍后再试";;
  *)   echo "  ? 未预期状态码";;
esac
cat /tmp/indexnow-resp.txt
"""
with cli.open_sftp().open("/opt/edu-manage-docker/source/scripts/indexnow-push.sh", "w") as f:
    f.write(SCRIPT)
out, err = run("chmod +x /opt/edu-manage-docker/source/scripts/indexnow-push.sh && ls -l /opt/edu-manage-docker/source/scripts/indexnow-push.sh | awk '{print $1, $5, $9}'")
print(f"  已创建: {out}")

print()
print("=" * 74)
print("5) 用脚本再推一次，验证可复用")
print("=" * 74)
out, _ = run("bash /opt/edu-manage-docker/source/scripts/indexnow-push.sh 2>&1", t=120)
print(out)

print()
print("=" * 74)
print("6) 等待并观察引擎是否来抓首页（关键：这才是目的）")
print("=" * 74)
print("  当前 bingbot 抓首页的记录（历史）:")
print(run("grep -E 'bingbot' /var/log/nginx/access.log | grep -E '\"GET / HTTP' | tail -5 | awk '{print $1, $4, $9, $10}'")[0] or "  （今天没有抓过首页正文）")
time.sleep(60)
print("\n  60 秒后新增的爬虫记录:")
print(run("tail -30 /var/log/nginx/access.log | grep -viE '^(101\\.200\\.191\\.201|111\\.53\\.198\\.)' | awk '{print $1, $4, $7, $9, $12, $13}'")[0] or "  （暂无新记录）")

cli.close()
