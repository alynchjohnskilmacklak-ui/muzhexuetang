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

API rate limits use Redis when `REDIS_URL` is configured. The production Compose file provides this URL, and `RATE_LIMIT_DRIVER=auto` selects Redis. Credential sign-in, role detection, and login precheck use the shared rate limiter for their IP limits.

Rate-limit keys use `X-Real-IP`, not the first client-supplied `X-Forwarded-For` value. The repository Nginx config overwrites `X-Real-IP` with `$remote_addr`, and the app port is bound to localhost. If a CDN or load balancer sits in front of Nginx, configure its trusted proxy ranges and real-IP header; otherwise requests will be grouped under the upstream proxy address.

In `auto` mode, Redis connection or command failures fall back to process memory and write a warning to the application log. The fallback is not shared across instances and is cleared on restart. Do not scale the app horizontally unless Redis is healthy; monitor for `[rate-limit] Redis 不可用，降级为内存限流`.

Account lockout is also checked against persisted login records: five failed attempts within 30 minutes trigger a 30-minute lock. This account lock survives app restarts.

Until Redis health is monitored and fallback behavior is addressed, keep one app process:

```bash
pm2 delete edu-manage || true
pm2 start npm --name edu-manage -- start -- -p 3000
pm2 save
```

If deployment logs show `EADDRINUSE: address already in use :::3000`, another Next.js process is already bound to the production port. Check and remove the duplicate process before restarting the single `edu-manage` process:

```bash
pm2 list
lsof -i :3000
pm2 delete 多余进程
pm2 restart edu-manage --update-env
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

## Daily operations report

Run the administrator WxPusher report at 21:00 every day. Ensure `CRON_SECRET` is available to cron:

```bash
0 21 * * * curl -s "https://muzhexuetang.xyz/api/cron/daily-ops-report?token=$CRON_SECRET"
```

## Recycle-bin retention cleanup

Configure `TRASH_CLEANUP_USER_ID` with an existing administrator user id used for cleanup audit logs, then run the recycle-bin purge once per day. The retention period defaults to 30 days and can be changed with `TRASH_RETENTION_DAYS`.

```cron
30 2 * * * curl -fsS "https://muzhexuetang.xyz/api/cron/trash-cleanup?token=$CRON_SECRET" >> /var/log/edu-manage-trash-cleanup.log 2>&1
```

The same cleanup can be triggered from the recycle-bin page for a deployment smoke test. Do not enable the cron entry until the Prisma migration `20260901193000_add_data_correction_trash` has been applied to both division databases.

## Schedule source of truth

`ClassGroup/ClassLesson` is the only scheduling system. Migration
`20260912193000_retire_legacy_schedule` refuses to drop the retired
`Schedule/ScheduleStudent` tables if any legacy rows or dependent references
exist, so every database must pass `npm run audit:legacy-schedules` first.
