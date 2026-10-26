# -*- coding: utf-8 -*-
"""辨明真假爬虫：反查 IP 归属"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=200):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

print("=" * 78)
print("1) 可疑 IP 反查（rDNS + 归属）")
print("=" * 78)
ips = ["163.7.13.50", "176.65.144.71", "93.152.209.6", "136.85.85.238",
       "180.153.236.40", "180.153.236.183", "34.169.46.107", "45.198.224.123",
       "59.82.83.133", "51.8.102.211", "119.249.100.175", "111.225.214.210"]
for ip in ips:
    rd = run(f"timeout 5 host {ip} 2>/dev/null | head -1")
    if not rd:
        rd = run(f"timeout 5 nslookup {ip} 2>/dev/null | grep -i 'name =' | head -1")
    print(f"  {ip:18s} {rd if rd else '(无 rDNS)'}")

print()
print("=" * 78)
print("2) 163.7.13.50 那 9976 次到底在干什么")
print("=" * 78)
print("  抓取的路径分布（前 10）:")
print(run("zgrep -h '163\\.7\\.13\\.50' /var/log/nginx/access.log* 2>/dev/null | awk '{print $7}' | sort | uniq -c | sort -rn | head -10"))
print()
print("  时间跨度:")
print(run("zgrep -h '163\\.7\\.13\\.50' /var/log/nginx/access.log* 2>/dev/null | head -1 | awk '{print \"    最早: \" $4}'"))
print(run("zgrep -h '163\\.7\\.13\\.50' /var/log/nginx/access.log* 2>/dev/null | tail -1 | awk '{print \"    最新: \" $4}'"))
print()
print("  完整 UA:")
print(run("zgrep -h '163\\.7\\.13\\.50' /var/log/nginx/access.log* 2>/dev/null | tail -1 | grep -oE '\"[^\"]*\"$' | cut -c1-160"))

print()
print("=" * 78)
print("3) 180.153.236.x（自称 360Spider）真实身份")
print("=" * 78)
print("  抓取路径分布:")
print(run("zgrep -h '180\\.153\\.236\\.' /var/log/nginx/access.log* 2>/dev/null | awk '{print $7}' | sort | uniq -c | sort -rn | head -8"))
print()
print("  完整 UA 原文（看 360Spider 是出现在 UA 还是 Referer 里）:")
print(run("zgrep -h '180\\.153\\.236\\.' /var/log/nginx/access.log* 2>/dev/null | tail -1 | cut -c100-400"))

print()
print("=" * 78)
print("4) 真实搜索引擎爬虫的官方 IP 段核对")
print("=" * 78)
real = [
    ("百度官方段", "220.181.108.|116.179.37.|123.125.71.|111.206."),
    ("必应官方段", "157.55.39.|40.77.167.|52.167.144.|207.46.13.|13.66."),
    ("Google 官方段", "66.249.|192.178.7.|34.64."),
    ("Yandex 官方段", "95.108.|213.180.|87.250.|5.255."),
    ("搜狗官方段", "49.234.|111.202.|106.120."),
]
for label, pat in real:
    n = run(f"zgrep -hE '{pat}' /var/log/nginx/access.log* 2>/dev/null | wc -l").split("\n")[0]
    home = run(f"zgrep -hE '{pat}' /var/log/nginx/access.log* 2>/dev/null | grep -cE '\"GET / HTTP' || echo 0").split("\n")[0]
    print(f"  {label:16s} 总请求 {n:>6}   首页 {home:>4}")

print()
print("=" * 78)
print("5) 结论用数据：过去 7 天真实引擎抓首页的逐日记录")
print("=" * 78)
days = ["03/Oct", "04/Oct", "05/Oct", "06/Oct", "07/Oct", "08/Oct", "09/Oct"]
real2 = [("百度", "220.181.108.|116.179.37.|123.125.71."),
         ("必应", "157.55.39.|40.77.167.|52.167.144."),
         ("Google", "66.249.|192.178.7."),
         ("Yandex", "95.108.|213.180.|87.250."),
         ("搜狗", "49.234.|111.202."),
         ("360(180.153)", "180.153.236.")]
print(f"  {'引擎':<14} " + " ".join(f"{d:>8}" for d in days))
for label, pat in real2:
    row = []
    for d in days:
        n = run(f"zgrep -hE '{pat}' /var/log/nginx/access.log* 2>/dev/null | grep '{d}' | grep -cE '\"GET / HTTP' || echo 0").split("\n")[0]
        row.append(f"{n:>8}")
    print(f"  {label:<14} " + " ".join(row))

cli.close()
