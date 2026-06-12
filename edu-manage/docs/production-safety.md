# Production Safety Baseline

This file records the operational constraints that must be true before handing edu-manage to production users.

## PostgreSQL backups

Application JSON export is not a database backup. Production must run a full PostgreSQL backup every day.

Install cron on the Aliyun server:

```bash
mkdir -p /data/backups/edu-manage
chmod 700 /data/backups/edu-manage
crontab -e
```

Cron entry:

```cron
0 2 * * * cd /opt/edu-manage && /bin/bash scripts/backup-db.sh >> /var/log/edu-manage-backup.log 2>&1
```

Recommended restore drill command:

```bash
createdb edu_manage_restore_test
pg_restore --dbname=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/edu_manage_restore_test /data/backups/edu-manage/edu_manage_YYYYMMDD_HHMMSS.dump
```

For off-server backup, configure one of these in `/opt/edu-manage/.env` or the crontab environment:

```bash
OSSUTIL_BUCKET=oss://your-bucket/edu-manage/
RSYNC_REMOTE=user@backup-host:/data/backups/edu-manage/
```

## Rate limiting and login lockout

Current rate limiting and login failure counters are process-memory Maps. They are acceptable only while PM2 runs one forked instance.

Required production constraint until Redis is introduced:

```bash
pm2 delete edu-manage || true
pm2 start .next/standalone/server.js --name edu-manage --cwd /opt/edu-manage --instances 1
pm2 save
```

Known limitation: deploying or restarting PM2 clears rate-limit and account-lock counters. If PM2 cluster mode is enabled, these protections become per-process and are not reliable. Redis migration is the long-term fix.

## Uploaded files

Uploads are still stored on the server filesystem under `public/uploads`. Deployment packages must exclude this directory so production images and documents are not overwritten.

Tar command must include:

```bash
--exclude=public/uploads
```

Nginx must not serve `/uploads/` directly. Requests should go through Next middleware and `/api/uploads/*`, which requires login.

Long-term target: move uploads to Aliyun OSS with private bucket and signed URLs.

## Schedule migration risk

The app still has two schedule systems: legacy `Schedule` and new `ClassGroup/ClassLesson`. New statistics must explicitly decide whether they need both sources. Long-term target is to migrate remaining legacy schedules and make `ClassLesson` the only lesson source.