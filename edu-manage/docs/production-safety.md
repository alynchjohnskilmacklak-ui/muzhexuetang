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

API rate limits use Redis in production. The production Compose file provides `REDIS_URL` and forces `RATE_LIMIT_DRIVER=redis`. Production `auto` mode also requires Redis and fails closed if it is absent or unavailable; it never falls back to per-process memory. Credential sign-in, role detection, and login precheck use the shared rate limiter for their IP limits. Memory mode is for local development only.

Rate-limit keys use `X-Real-IP`, not the first client-supplied `X-Forwarded-For` value. The repository Nginx config overwrites `X-Real-IP` with `$remote_addr`, and the app port is bound to localhost. If a CDN or load balancer sits in front of Nginx, configure its trusted proxy ranges and real-IP header; otherwise requests will be grouped under the upstream proxy address.

In production, a missing or malformed `X-Real-IP` now fails closed instead of putting all callers into a shared `unknown` rate-limit bucket.

In production, Redis connection or command failures make API requests fail closed and are reported through the normal API error handling. Keep the Redis health check enabled and monitor the container health before restarting or deploying the app.

Account lockout is also checked against persisted login records: five failed attempts within 30 minutes trigger a 30-minute lock. This account lock survives app restarts.

Keep one app process unless Redis and the app's shared session/rate-limit behavior have been verified for the deployment:

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

When `STORAGE_DRIVER=aliyun-oss`, files uploaded through `/api/upload` set the
object ACL to `private` and are served only after application access checks,
through a short-lived signed URL or the authenticated `/api/uploads/*` proxy.
The OSS RAM user needs `oss:PutObjectAcl`; uploads with unavailable OSS config
may use the existing persistent local fallback. This applies to new uploads.
Existing feedback images still need a read-only production bucket/object ACL
audit before any batch ACL changes.

## Daily operations report

Run the administrator WxPusher report at 21:00 every day. Ensure `CRON_SECRET` is available to cron:

```bash
0 21 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "https://muzhexuetang.xyz/api/cron/daily-ops-report"
```

## WeCom parent digest tasks

The retry-notifications route also polls confirmed WeCom group-send tasks and
creates at most one personalized parent digest task per local day after that
parent's notification queue has been quiet for two minutes. There is no
evening-time gate. The task includes the available daily attendance, published
feedback, and family notices, plus a note when teacher updates are still
pending. Each parent receives a separate task so one family's details are not
shared with other families.

Run the route every five minutes so it can collect queued items, create tasks
in the sender's WeCom group-send assistant, and poll the sender's manual
confirmation result. The cron only prepares tasks and checks their status; it
does not send messages to parents. A staff member must confirm sending in
WeCom:

```cron
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "https://muzhexuetang.xyz/api/cron/retry-notifications" >> /var/log/edu-manage-qywx-digest.log 2>&1
```

Install this cron entry on the production host only after the app has the
required WeCom credentials and the matching Prisma schema migration is applied
to both division databases. `add_msg_template` creates a task in the sender's
WeCom group-send assistant; the sender still has to confirm it there. The
existing one-task-per-parent-per-day guard remains in place, so notices added
after that parent's task is created are not added to a second task that day.
This repository change does not install or enable the production cron job.

The admin-only `POST /api/qywx/test-send` route supports
`{ "channel": "parent-mass" }` for a dedicated connectivity check. Configure
`QYWX_TEST_MASS_EXTERNAL_USER_ID` and `QYWX_TEST_MASS_SENDER_USER_ID` with a
test-only WeChat external contact and the employee who owns that contact. The
route verifies the contact belongs to the configured sender and is not bound
to a parent account in either division, then creates a
clearly labeled task through the same `add_msg_template` API used for family
digests. It does not send the task automatically; a staff member must confirm
it in WeCom. Never point these variables at an ordinary parent contact.

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
