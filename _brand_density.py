# -*- coding: utf-8 -*-
"""1) IndexNow 重新推送  2) 分析首页正文本的品牌词密度"""
import paramiko, io, sys, json, re, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

def run(c, t=180):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

print("=" * 74)
print("1) IndexNow 重新推送（含 /about）")
print("=" * 74)
out = run("bash /opt/edu-manage-docker/source/scripts/indexnow-push.sh 2>&1", t=120)
print(out)

print()
print("=" * 74)
print("2) 首页「爬虫可见正文」分析（去掉标签后的纯文本）")
print("=" * 74)
# 把首页存到服务器上分析
run("curl -s https://muzhexuetang.xyz/ -o /tmp/home.html")
analysis = r'''
import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
h = open("/tmp/home.html", encoding="utf-8").read()

# 标题
t = re.search(r"<title>([^<]*)</title>", h)
print("  <title>: " + (t.group(1) if t else "(无)"))
d = re.search(r'name="description" content="([^"]*)"', h)
print("  description: " + (d.group(1) if d else "(无)")[:80] + "...")

# 去掉 script / style，取纯文本
body = re.sub(r"(?s)<script.*?</script>", " ", h)
body = re.sub(r"(?s)<style.*?</style>", " ", body)
body = re.sub(r"(?s)<!--.*?-->", " ", body)
text = re.sub(r"<[^>]+>", " ", body)
text = re.sub(r"\s+", " ", text).strip()

print()
print("  正文纯文本长度: " + str(len(text)) + " 字")
print()
print("  === 品牌词 / 关键词出现次数（正文里）===")
for w in ["牧哲学堂", "新乐牧哲学堂", "新乐", "河北", "文化课", "辅导", "升学规划", "MOREJOY", "牧哲"]:
    print("    %-14s %d 次" % (w, text.count(w)))

print()
print("  === 正文里所有含「牧哲学堂」的句子 ===")
sents = re.split(r"[。！？；]", text)
n = 0
for s in sents:
    s = s.strip()
    if "牧哲学堂" in s and len(s) > 2:
        n += 1
        print("    %d. %s" % (n, s[:110]))

print()
print("  === H1 / H2 标签内容 ===")
for m in re.finditer(r"<h([12])[^>]*>(.*?)</h\1>", h, re.S):
    txt = re.sub(r"<[^>]+>", "", m.group(2))
    txt = re.sub(r"\s+", " ", txt).strip()
    print("    H%s: %s" % (m.group(1), txt[:90]))
'''
with cli.open_sftp().open("/tmp/analyze.py", "w") as f:
    f.write(analysis)
print(run("python3 /tmp/analyze.py 2>&1 || python /tmp/analyze.py 2>&1"))

print()
print("=" * 74)
print("3) /about 页同样分析")
print("=" * 74)
run("curl -s https://muzhexuetang.xyz/about -o /tmp/about.html")
analysis2 = analysis.replace("/tmp/home.html", "/tmp/about.html")
with cli.open_sftp().open("/tmp/analyze2.py", "w") as f:
    f.write(analysis2)
print(run("python3 /tmp/analyze2.py 2>&1 || python /tmp/analyze2.py 2>&1"))

cli.close()
