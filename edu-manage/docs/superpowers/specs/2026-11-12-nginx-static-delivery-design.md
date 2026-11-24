# Nginx static delivery design

## Goal

Reduce Node proxy work for immutable Next.js build assets and public media in the versioned prebuilt deployment.

## Deployment boundary

- This config is for `scripts/deploy-prebuilt-tar.sh`, whose active release is `/opt/edu-manage/current`.
- Docker/Compose deployments keep their existing Nginx configuration because their public assets live inside the app image or Docker mounts.
- Static files are served only from `/opt/edu-manage/current/.next/static` and an explicit allowlist under `/opt/edu-manage/current/public`.
- `/uploads`, `/api`, `/services`, `/marketing`, `/business-assets`, and `/volunteer/docs` continue through Next.js.
- A missing local static file falls back to the existing Next.js upstream.

## Delivery behavior

- `/_next/static/*` gets one-year immutable caching and Nginx gzip for text assets.
- `/images/*` gets the same one-year immutable cache policy already configured in Next.js.
- Teacher portraits, about images, videos, and stickers keep seven-day caching; people images keep one day.
- Other routes preserve their existing Next.js behavior.

## Verification

- Review every direct-serving location against the protected upload and private API paths.
- Confirm the release root matches the prebuilt deployment layout and missing files fall back to Next.js.
- Run `nginx -t` on the target host before reloading the live Nginx service; this repository task does not reload production.
