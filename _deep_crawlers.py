# -*- coding: utf-8 -*-
"""深挖：各家爬虫到底抓到了什么内容、有没有报错"""
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
print("1) 百度爬虫今天的完整记录（看它抓了首页几次、什么时候）")
print("=" * 74)
print(run(f"grep -E '220\\.181\\.108\\.|116\\.179\\.37\\.|123\\.125\\.' {LOG} | awk '{{print $1, $4, $7, $9, $10}}'"))

print()
print("=" * 74)
print("2) 百度爬虫拿到的首页，是哪个版本？（16:01 部署新版前后对比）")
print("=" * 74)
r = run(f"grep -E '220\\.181\\.108\\.' {LOG} | grep 'GET / ' | awk '{{print $4, $9, $10}}'")
print("  百度抓首页的记录（时间 / 状态 / 字节数）：")
print(r if r else "  (无)")
print()
print("  参照：旧版首页 66295 B，新版（含新标题）67044 B")

print()
print("=" * 74)
print("3) 字节那个 400 错误的完整上下文")
print("=" * 74)
print(run(f"grep -n '172\\.203\\.208\\.110' {LOG}"))

print()
print("=" * 74)
print("4) 今天所有 4xx / 5xx 错误（排除我们自己测试的）")
print("=" * 74)
print(run(f"awk '$9 ~ /^[45]/ {{print $1, $4, $7, $9}}' {LOG} | grep -vE '^(101\\.200\\.191\\.201|111\\.53\\.198\\.)' | tail -25"))

print()
print("=" * 74)
print("5) 必应爬虫历史（含归档日志，看它平时抓什么）")
print("=" * 74)
print(run("zgrep -h -i 'bingbot' /var/log/nginx/access.log* 2>/dev/null | awk '{print $1, $4, $7, $9}' | tail -20"))

print()
print("=" * 74)
print("6) 字节爬虫历史（含归档）")
print("=" * 74)
print(run("zgrep -h -iE 'bytespider' /var/log/nginx/access.log* 2>/dev/null | awk '{print $1, $4, $7, $9}' | tail -20"))

print()
print("=" * 74)
print("7) 各引擎抓取首页（GET / ）的历史，看谁能读到正文")
print("=" * 74)
print(run(f"grep -E '\"GET / HTTP' {LOG} | awk '{{print $1, $4, $9, $10, $12, $13}}' | tail -25"))

cli.close()
