# -*- coding: utf-8 -*-
import io, re, subprocess, json, time, urllib.request

# measure key endpoints with urllib (simple timing)
urls = [
    ('home', 'https://muzhexuetang.xyz/'),
    ('login', 'https://muzhexuetang.xyz/login'),
]
for name, u in urls:
    try:
        t0 = time.time()
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read()
            dt = time.time() - t0
        print('%s: %d bytes, %.2fs, %s' % (name, len(body), dt, r.status))
        if name == 'home':
            t = body.decode('utf-8', errors='ignore')
            js = re.findall(r'src="([^"]*_next[^"]*\.js)"', t)
            css = re.findall(r'href="([^"]*_next[^"]*\.css)"', t)
            print('  next chunks: js=%d css=%d' % (len(js), len(css)))
            # sample chunk sizes
            for c in (js + css)[:6]:
                try:
                    req2 = urllib.request.Request('https://muzhexuetang.xyz' + c, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req2, timeout=30) as r2:
                        b2 = r2.read()
                    print('    %-60s %.0f KB' % (c[-48:], len(b2) / 1024))
                except Exception as e:
                    print('    chunk err', e)
    except Exception as e:
        print(name, 'ERR', e)
