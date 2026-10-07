#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

if ! swapon --show=NAME --noheadings | grep -qx '/swapfile'; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
fi

if ! grep -qE '^/swapfile[[:space:]]+none[[:space:]]+swap[[:space:]]' /etc/fstab; then
  printf '%s\n' '/swapfile none swap sw 0 0' >> /etc/fstab
fi

printf '%s\n' 'vm.swappiness=10' > /etc/sysctl.d/99-edu-manage.conf
sysctl --system >/dev/null

apt-get update -qq
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  docker.io \
  docker-compose-v2 \
  nginx \
  openssl

systemctl enable --now docker
systemctl enable --now nginx

install -d -m 750 /opt/edu-manage-docker
install -d -m 750 /srv/edu-manage/shared/public/uploads
install -d -m 750 /srv/edu-manage/shared/public/services
install -d -m 750 /srv/edu-manage/shared/public/marketing
install -d -m 750 /srv/edu-manage/shared/public/business-assets
install -d -m 750 /srv/edu-manage/shared/public/volunteer/docs
install -d -m 700 /data/backups/edu-manage
chown -R 1000:1000 /srv/edu-manage/shared/public

docker --version
docker compose version
free -h
df -h /
