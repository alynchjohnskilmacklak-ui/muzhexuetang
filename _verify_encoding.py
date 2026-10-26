# -*- coding: utf-8 -*-
"""验证 18xxx/21xxx 是否是压缩后的大小：逐种 Accept-Encoding 测试"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=120):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

U = "https://muzhexuetang.xyz/"
print("=" * 74)
print("1) 各种 Accept-Encoding 下的响应大小（关键证据）")
print("=" * 74)
tests = [
    ("不带 Accept-Encoding", ""),
    ("gzip", "gzip"),
    ("deflate", "deflate"),
    ("br", "br"),
    ("gzip, deflate", "gzip, deflate"),
    ("gzip, deflate, br", "gzip, deflate, br"),
    ("gzip, deflate, br, zstd", "gzip, deflate, br, zstd"),
    ("百度移动 UA 完整头", None),   # 特殊处理
]
for label, enc in tests:
    if enc is None:
        cmd = ("curl -s -o /dev/null -w '%{http_code} %{size_download} %{content_type}' "
               "-A 'Mozilla/5.0 (Linux;u;Android 4.2.2;zh-cn;) AppleWebKit/534.46 (KHTML,like Gecko) "
               "Version/5.1 Mobile Safari/10600.6.3 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)' "
               "-H 'Accept-Encoding: gzip, deflate, br' " + U)
    else:
        h = ("-H 'Accept-Encoding: " + enc + "'") if enc else "-H 'Accept-Encoding:'"
        cmd = "curl -s -o /dev/null -w '%{http_code} %{size_download}' " + h + " " + U
    print(f"  {label:26s} {run(cmd)}")

print()
print("=" * 74)
print("2) 响应头里的 Content-Encoding 是什么")
print("=" * 74)
print(run("curl -sI -H 'Accept-Encoding: gzip, deflate, br' " + U + " | grep -iE 'content-encoding|content-length|vary|transfer'"))
print("  --- 不带编码 ---")
print(run("curl -sI -H 'Accept-Encoding:' " + U + " | grep -iE 'content-encoding|content-length|vary|transfer'"))

print()
print("=" * 74)
print("3) gzip 压缩后是不是 18xxx / 21xxx")
print("=" * 74)
print("  服务器上直接压缩对比：")
print(run("docker exec edu-manage-app-1 sh -c 'gzip -c /app/public/home.html | wc -c'"))
print("  (这是容器内 home.html 的 gzip 后大小)")
print()
print(run("curl -s " + U + " | gzip -c | wc -c"))
print("  (这是线上内容 gzip 后大小)")

print()
print("=" * 74)
print("4) 用 curl 模拟百度那次请求，看 nginx 日志记多少")
print("=" * 74)
ua = ("Mozilla/5.0 (Linux;u;Android 4.2.2;zh-cn;) AppleWebKit/534.46 (KHTML,like Gecko) "
      "Version/5.1 Mobile Safari/10600.6.3 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)")
print("  测试请求已发送，稍后看日志最后一行")
run("curl -s -o /dev/null -A '" + ua + "' -H 'Accept-Encoding: gzip, deflate, br' " + U)
import time; time.sleep(1)
print(run("tail -2 /var/log/nginx/access.log"))

print()
print("=" * 74)
print("5) 拿一份 gzip 响应解压，确认内容是完整首页")
print("=" * 74)
print("  解压后字节数:", run("curl -s --compressed " + U + " | wc -c"))
print("  标题:", run("curl -s --compressed " + U + " | grep -o '<title>[^<]*</title>'"))
print("  含 /about 链接:", run("curl -s --compressed " + U + " | grep -c 'href=\"/about\"'"))
print("  含 statAvg=22:", run("curl -s --compressed " + U + " | grep -c 'id=\"statAvg\">22<'"))
cli.close()
