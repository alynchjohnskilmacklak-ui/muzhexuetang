# -*- coding: utf-8 -*-
"""澄清：360 的 69 次是什么？各引擎过去 7 天逐日趋势"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=200):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

print("=" * 78)
print("1) 「360Spider」这 69 次到底是什么（看 IP 和 UA）")
print("=" * 78)
print(run("zgrep -hE '360Spider|Sophon' /var/log/nginx/access.log* 2>/dev/null | tail -8 | cut -c1-220"))
print()
print("  UA 分布:")
print(run("zgrep -hE '360Spider|Sophon' /var/log/nginx/access.log* 2>/dev/null | grep -oE '\"[^\"]*\"$' | sort | uniq -c | sort -rn | head -5"))

print()
print("=" * 78)
print("2) Google 44 次首页抓取 —— 真实 Googlebot 还是扫描器？")
print("=" * 78)
print(run("zgrep -hE '66\\.249\\.|Googlebot' /var/log/nginx/access.log* 2>/dev/null | grep -E '\"GET / HTTP' | tail -6 | cut -c1-220"))
print()
print("  Google 抓取的 IP 分布:")
print(run("zgrep -hE '66\\.249\\.|Googlebot' /var/log/nginx/access.log* 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn | head -8"))

print()
print("=" * 78)
print("3) 过去 7 天逐日：各引擎抓首页次数")
print("=" * 78)
days = ["03/Oct", "04/Oct", "05/Oct", "06/Oct", "07/Oct", "08/Oct", "09/Oct"]
ENG = [("百度", r"220\.181\.108\.|116\.179\.37\.|Baiduspider"),
       ("必应", r"157\.55\.39\.|40\.77\.167\.|52\.167\.144\.|bingbot"),
       ("搜狗", r"Sogou"),
       ("字节", r"Bytespider"),
       ("神马", r"ShenmaSpider|140\.205\.85\."),
       ("Yandex", r"95\.108\.|213\.180\.|87\.250\."),
       ("Google", r"66\.249\."),
       ("360", r"360Spider|Sophon")]
print(f"  {'引擎':<8} " + " ".join(f"{d:>8}" for d in days))
for label, pat in ENG:
    row = []
    for d in days:
        n = run(f"zgrep -hE '{pat}' /var/log/nginx/access.log* 2>/dev/null | grep '{d}' | grep -cE '\"GET / HTTP' || echo 0").split("\n")[0]
        row.append(f"{n:>8}")
    print(f"  {label:<8} " + " ".join(row))

print()
print("=" * 78)
print("4) 10/09 当天完整活动（各引擎抓了什么）")
print("=" * 78)
for label, pat in ENG:
    r = run(f"grep -E '{pat}' /var/log/nginx/access.log | awk '{{print \"    \", $1, $4, $7, $9}}' | tail -6")
    if r:
        print(f"  [{label}]")
        print(r)
    else:
        print(f"  [{label}]  无活动")

print()
print("=" * 78)
print("5) sitemap / robots 最近被抓记录（全日志）")
print("=" * 78)
r = run("grep -hE 'sitemap.xml|robots.txt' /var/log/nginx/access.log | grep -viE '^(101\\.200\\.191\\.201|111\\.53\\.198\\.)' | awk '{print $1, $4, $7, $9, $12, $13}' | tail -15")
print(r if r else "  (无外部抓取)")

print()
print("=" * 78)
print("6) /about 页面被真实爬虫抓取的时间线（排除我们自己的 IP）")
print("=" * 78)
r = run("zgrep -h ' /about ' /var/log/nginx/access.log* 2>/dev/null | grep -viE '^(101\\.200\\.191\\.201|111\\.53\\.198\\.)' | awk '{print $1, $4, $9, $15, $16, $17}' | tail -20")
print(r if r else "  (无)")

cli.close()
