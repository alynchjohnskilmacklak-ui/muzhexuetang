# 服务器自动备份 Cron 配置指南

## 备份脚本

使用 `scripts/backup-now.sh`（双库强制模式，若 JUNIOR/SENIOR URL 未设置则拒绝执行）。

## 1. 确保脚本有执行权限

```bash
chmod +x /opt/edu-manage/scripts/backup-now.sh
chmod +x /opt/edu-manage/scripts/backup-db.sh
```

## 2. 手动测试一次

```bash
cd /opt/edu-manage
BACKUP_DIR=/tmp/test-backup bash scripts/backup-now.sh
```

## 3. 配置 crontab（每日凌晨 2 点备份）

```bash
crontab -e
```

添加以下行：

```cron
# 牧哲学堂 双库每日备份（每天凌晨 2:00，日志写入 /var/log/edu-manage-backup.log）
0 2 * * * cd /opt/edu-manage && /bin/bash scripts/backup-now.sh >> /var/log/edu-manage-backup.log 2>&1
```

如需 OSS 同步，先设置 `OSSUTIL_BUCKET`：

```cron
0 2 * * * cd /opt/edu-manage && OSSUTIL_BUCKET=oss://muzhe-backup/edu-manage/ /bin/bash scripts/backup-now.sh >> /var/log/edu-manage-backup.log 2>&1
```

## 4. 保留策略

脚本默认保留 14 天本地备份（由 `BACKUP_KEEP_DAYS` 控制）。
如需修改，在 crontab 中传入环境变量：

```cron
0 2 * * * cd /opt/edu-manage && BACKUP_KEEP_DAYS=30 /bin/bash scripts/backup-now.sh >> /var/log/edu-manage-backup.log 2>&1
```

## 5. 日志轮转（防止日志文件无限增长）

创建 `/etc/logrotate.d/edu-manage-backup`：

```
/var/log/edu-manage-backup.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    dateext
}
```

## 6. 验证备份存在

```bash
ls -lh /data/backups/edu-manage/
sha256sum -c /data/backups/edu-manage/*.sha256
```

## 备份文件命名规则

- `edu_manage_chuzhong_YYYYMMDD_HHMMSS.dump` — 初中库
- `edu_manage_gaozhong_YYYYMMDD_HHMMSS.dump` — 高中库
- 同名 `.sha256` — 完整性校验文件

## 恢复单库（谨慎操作）

```bash
# 恢复初中库（替换 YYYYMMDD_HHMMSS 为实际时间戳）
pg_restore --format=custom --clean --no-owner --no-acl \
  --dbname="$DATABASE_URL_JUNIOR" \
  /data/backups/edu-manage/edu_manage_chuzhong_YYYYMMDD_HHMMSS.dump
```
