# -*- coding: utf-8 -*-
"""查各家爬虫的真实到访记录：这是我能看到的"提交是否起作用"的证据"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=120):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

LOG = "/var/log/nginx/access.log"

print("=" * 74)
print("1) 各引擎爬虫 UA 今日命中次数")
print("=" * 74)
uas = [
    ("Bingbot (必应)",        "bingbot"),
    ("Bytespider (字节)",     "Bytespider"),
    ("Baiduspider (百度)",    "Baiduspider"),
    ("Sogou (搜狗)",          "Sogou"),
    ("360Spider (360)",       "360Spider"),
    ("ShenmaSpider (神马)",   "ShenmaSpider"),
    ("YisouSpider (神马/阿里)","YisouSpider"),
    ("Googlebot",             "Googlebot"),
    ("YandexBot",             "YandexBot"),
    ("Applebot",              "Applebot"),
]
for label, ua in uas:
    n = run(f"grep -ic '{ua}' {LOG} || echo 0")
    print(f"  {label:26s} {n}")

print()
print("=" * 74)
print("2) Bingbot 最近访问记录（含访问的 URL 和状态码）")
print("=" * 74)
r = run(f"grep -i 'bingbot' {LOG} | awk '{{print $1, $4, $7, $9}}' | tail -20")
print(r if r else "  ⚠ 日志里没有 bingbot 记录")

print()
print("=" * 74)
print("3) 字节爬虫最近访问记录")
print("=" * 74)
r = run(f"grep -iE 'bytespider|bytedance|toutiao' {LOG} | awk '{{print $1, $4, $7, $9}}' | tail -20")
print(r if r else "  ⚠ 日志里没有字节爬虫记录")

print()
print("=" * 74)
print("4) 已知爬虫 IP 段（即使 UA 被伪装也能看 IP）")
print("=" * 74)
segments = [
    ("Bingbot 常用段",   "40\\.77\\.|157\\.55\\.|207\\.46\\.|13\\.66\\.|20\\.15\\.|52\\.167\\."),
    ("字节/头条常用段",  "110\\.249\\.|111\\.225\\.|180\\.163\\.|203\\.208\\."),
    ("百度常用段",       "220\\.181\\.|116\\.179\\.|123\\.125\\.|111\\.206\\."),
]
for label, pat in segments:
    r = run(f"grep -E '{pat}' {LOG} | awk '{{print $1, $4, $7, $9}}' | tail -8")
    print(f"  --- {label} ---")
    print(r if r else "    (无)")

print()
print("=" * 74)
print("5) 今天所有访问过 /about 的爬虫（说明爬到内页了）")
print("=" * 74)
r = run(f"grep ' /about ' {LOG} | awk '{{print $1, $4, $9, $12, $13, $14, $15}}' | tail -20")
print(r if r else "  (无)")

print()
print("=" * 74)
print("6) 今天所有访问过 /sitemap.xml 的记录")
print("=" * 74)
r = run(f"grep 'sitemap.xml' {LOG} | awk '{{print $1, $4, $9, $12, $13, $14}}' | tail -20")
print(r if r else "  (无)")

print()
print("=" * 74)
print("7) 日志覆盖范围（确认我看的是完整数据）")
print("=" * 74)
print("  最早:", run(f"head -1 {LOG} | awk '{{print $4}}'"))
print("  最新:", run(f"tail -1 {LOG} | awk '{{print $4}}'"))
print("  总行数:", run(f"wc -l < {LOG}"))
print("  含压缩归档:", run("ls /var/log/nginx/access.log* | wc -l"), "个文件")
cli.close()
