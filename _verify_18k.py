# -*- coding: utf-8 -*-
"""关键核实：那些 18KB 的首页响应是什么？爬虫到底拿到了哪个版本？"""
import paramiko, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=120):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

LOG = "/var/log/nginx/access.log"

print("=" * 74)
print("1) 今天所有 GET / 的完整解析：IP / 时间 / 状态 / 字节 / UA")
print("=" * 74)
out = run(f"grep -E '\"GET / HTTP' {LOG}")
rows = []
for line in out.split("\n"):
    m = re.match(r'(\S+) - - \[([^\]]+)\] "GET / HTTP/[\d.]+" (\d+) (\d+) "[^"]*" "([^"]*)"', line)
    if m:
        rows.append(m.groups())
for ip, t, code, size, ua in rows:
    print(f"  {ip:18s} {t[13:]} {code} {size:>7}  {ua[:60]}")
sizes = {}
for _, _, _, s, _ in rows:
    sizes[s] = sizes.get(s, 0) + 1
print("\n  字节数分布:", dict(sorted(sizes.items(), key=lambda x: -x[1])))

print()
print("=" * 74)
print("2) 18xxx 和 67xxx 各是什么内容（直接看响应体大小对应的来源）")
print("=" * 74)
for label, args in [
    ("完整首页 (无特殊头)", ""),
    ("带 RSC 头", "-H 'RSC: 1'"),
    ("带 next-router-state-tree", "-H 'Next-Router-State-Tree: %5B%22%22%5D'"),
    ("带 Baiduspider UA", "-A 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)'"),
    ("带 bingbot UA", "-A 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'"),
    ("百度实际那个 UA", "-A 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36'"),
]:
    a = run("curl -s -o /dev/null -w '%{http_code} %{size_download}' " + args + " https://muzhexuetang.xyz/")
    print(f"  {label:30s} {a}")

print()
print("=" * 74)
print("3) 百度那几次抓首页的完整原始日志行（含 Referer 和 UA）")
print("=" * 74)
print(run(f"grep -E '220\\.181\\.108\\.(156|168|102|176|159)' {LOG}"))

print()
print("=" * 74)
print("4) 18,771 字节到底是什么 —— 抓一份下来看开头")
print("=" * 74)
print("  头部内容:")
print(run("curl -s -H 'RSC: 1' https://muzhexuetang.xyz/ | head -c 400"))
print()
print("  长度:", run("curl -s -H 'RSC: 1' https://muzhexuetang.xyz/ | wc -c"))

print()
print("=" * 74)
print("5) 45.198.224.x / 34.78.84.x 这些拿 18KB 的是谁")
print("=" * 74)
print(run(f"grep -E '45\\.198\\.224\\.|34\\.78\\.84\\.' {LOG} | awk '{{print $1, $4, $6, $7, $9, $10, $12, $13, $14}}' | head -20"))

cli.close()
