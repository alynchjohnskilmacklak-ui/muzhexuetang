# -*- coding: utf-8 -*-
"""各搜索引擎爬虫抓取状态完整报告"""
import paramiko, io, sys, re, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=200):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

LOG = "/var/log/nginx/access.log"

print("=" * 78)
print("当前服务器时间:", run("date '+%Y-%m-%d %H:%M:%S %Z'"))
print("日志最新记录:", run(f"tail -1 {LOG} | awk '{{print $4}}'"))
print("=" * 78)

# 各引擎 IP/UA 特征
ENGINES = [
    ("百度 Baiduspider",    r"220\.181\.108\.|116\.179\.37\.|123\.125\.|Baiduspider"),
    ("必应 bingbot",        r"157\.55\.39\.|40\.77\.167\.|52\.167\.144\.|207\.46\.|bingbot"),
    ("搜狗 Sogou",          r"Sogou|49\.234\.4\."),
    ("字节 Bytespider",     r"Bytespider|110\.249\.|111\.225\."),
    ("神马 Shenma/Yisou",   r"ShenmaSpider|140\.205\.85\.|YisouSpider"),
    ("Yandex",              r"95\.108\.|213\.180\.|87\.250\.|YandexBot"),
    ("Google",              r"66\.249\.|Googlebot"),
    ("360",                 r"360Spider|Sophon"),
]

print()
print("一、今天（10/03）各引擎抓取汇总")
print("-" * 78)
print(f"  {'引擎':<20} {'总请求':>7} {'首页':>6} {'/about':>7} {'sitemap':>8} {'robots':>7}  最近时间")
for label, pat in ENGINES:
    total = run(f"grep -cE '{pat}' {LOG} || echo 0")
    home  = run(f"grep -E '{pat}' {LOG} | grep -cE '\"GET / HTTP' || echo 0")
    about = run(f"grep -E '{pat}' {LOG} | grep -c ' /about ' || echo 0")
    sm    = run(f"grep -E '{pat}' {LOG} | grep -c 'sitemap.xml' || echo 0")
    rb    = run(f"grep -E '{pat}' {LOG} | grep -c 'robots.txt' || echo 0")
    last  = run(f"grep -E '{pat}' {LOG} | tail -1 | awk '{{print $4}}' | cut -c14-22")
    def clean(x):
        return x.split("\n")[0] if x else "0"
    print(f"  {label:<20} {clean(total):>7} {clean(home):>6} {clean(about):>7} {clean(sm):>8} {clean(rb):>7}  {clean(last)}")

print()
print("二、最近 3 小时各引擎的实时活动（看谁还在来）")
print("-" * 78)
for label, pat in ENGINES:
    r = run(f"grep -E '{pat}' {LOG} | tail -3 | awk '{{print \"    \", $1, $4, $7, $9}}'")
    print(f"  [{label}]")
    print(r if r else "    (无记录)")

print()
print("三、/about 页面被谁抓过（这是关键空白点）")
print("-" * 78)
r = run(f"grep ' /about ' {LOG} | awk '{{print $1, $4, $9, $12, $13, $14, $15}}' | tail -25")
print(r if r else "  (无)")

print()
print("四、历史对比：各引擎过去 7 天抓首页的次数")
print("-" * 78)
for label, pat in ENGINES:
    r = run(f"zgrep -hE '{pat}' /var/log/nginx/access.log* 2>/dev/null | grep -cE '\"GET / HTTP' || echo 0")
    r = r.split("\n")[0]
    print(f"  {label:<20} 首页累计 {r} 次")

print()
print("五、最新 20 条非本地访问（实时动态）")
print("-" * 78)
r = run(f"grep -vE '^(101\\.200\\.191\\.201|111\\.53\\.198\\.)' {LOG} | tail -20 | awk '{{print $1, $4, $7, $9, $12, $13}}'")
print(r)

print()
print("六、sitemap 抓取情况（谁拿到了新版 lastmod=10/3）")
print("-" * 78)
r = run(f"grep 'sitemap.xml' {LOG} | awk '{{print $1, $4, $9, $10, $13, $14}}' | tail -15")
print(r)

cli.close()
