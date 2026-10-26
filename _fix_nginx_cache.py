# -*- coding: utf-8 -*-
import paramiko

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20, banner_timeout=20, auth_timeout=20)

def run(cmd, timeout=60):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    code = stdout.channel.recv_exit_status()
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:3000]}\n  {err.strip()[:800]}")
    return code

# 1) backup
run("cp /etc/nginx/sites-available/edu-manage.conf /etc/nginx/sites-available/edu-manage.conf.bak-20261003", 30)

# 2) write new config via heredoc
conf = r"""server {
    listen 80;
    listen :80;
    server_name 101.200.191.201;

    client_max_body_size 210m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }
}

server {
    listen 80;
    listen :80;
    server_name muzhexuetang.xyz www.muzhexuetang.xyz;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen :443 ssl;
    server_name muzhexuetang.xyz www.muzhexuetang.xyz;

    ssl_certificate /etc/letsencrypt/live/muzhexuetang.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/muzhexuetang.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 210m;

    location ^~ /about-images/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=2592000, immutable" always;
    }

    # Next 构建产物（带内容 hash），保留强缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 页面 HTML / API：禁止缓存，避免微信内核缓存旧版页面
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
        add_header Cache-Control "no-store" always;
    }
}
"""
cmd = "cat > /etc/nginx/sites-available/edu-manage.conf <<'NGINXEOF'\n" + conf + "\nNGINXEOF"
run(cmd, 30)

# 3) test & reload
run("nginx -t", 30)
run("systemctl reload nginx && echo RELOADED", 30)

cli.close()
print("DONE")
