# Nginx Static Delivery Implementation Plan

> **For agentic workers:** Follow this plan in order. Keep Docker/Compose routing unchanged and never expose uploads through Nginx.

**Goal:** Serve versioned build assets and selected public media directly from the active prebuilt release.

**Architecture:** Add a prebuilt-only Nginx site configuration rooted at `/opt/edu-manage/current`, matching `deploy-prebuilt-tar.sh`. Use an explicit public path allowlist, named Next.js fallback for missing files, matching cache headers, and gzip only for static build assets.

**Tech Stack:** Nginx, Next.js standalone release layout, Bash deployment script.

**Spec:** `docs/superpowers/specs/2026-11-12-nginx-static-delivery-design.md`

## Global Constraints

- Do not reload or otherwise change the live production host.
- Do not directly serve `/uploads`, APIs, services, marketing, business assets, or volunteer documents.
- Do not apply the prebuilt release root to the Docker/Compose deployment mode.
- Preserve Next.js fallback for missing files and non-static routes.

## Review Focus

- `/_next/static/*` resolves inside the active release's `.next/static` directory.
- Public roots use `/opt/edu-manage/current/public` and an explicit route allowlist.
- Missing files and dynamic routes reach the existing Next.js upstream.
- Cache policies match `next.config.ts` for each allowlisted path.
- Gzip is scoped to static text assets so authenticated dynamic responses retain the existing app compression path.

---

### Task 1: Add the prebuilt static Nginx configuration

**Files:** `deploy/nginx/edu-manage-prebuilt.conf`

- [x] Add direct static routes for `/_next/static`, `/images`, `/teacher-portraits`, `/about-images`, `/videos`, `/people`, and `/stickers`.
- [x] Use `try_files` named fallback to preserve the current Next.js origin for missing files.
- [x] Match static cache policies and scope gzip to `/_next/static`.
- [x] Keep `/uploads` and all other unlisted routes on the Next.js proxy.

### Task 2: Document deployment selection and activation

**Files:** `docs/prebuilt-deployment.md`

- [x] Explain that this config is only for versioned prebuilt releases.
- [x] Keep Docker/Compose deployments on their existing Nginx config.
- [x] Document the target-host `nginx -t` gate before an operator reloads Nginx.

### Task 3: Review the configuration

- [x] Compare filesystem roots and cache policies with the release script and `next.config.ts`.
- [x] Verify forbidden/private prefixes do not match direct-serving locations.
- [x] Check for a local Nginx binary; none is available in this Windows environment, so syntax validation remains a target-host `nginx -t` deployment gate.
