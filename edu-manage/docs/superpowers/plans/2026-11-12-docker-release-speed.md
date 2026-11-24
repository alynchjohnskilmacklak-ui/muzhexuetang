# Docker release speed Implementation Plan

> **For agentic workers:** Follow this plan in order. Keep the production release and rollback flow intact.

**Goal:** Reduce repeat Next.js build time and image upload size in the active Docker Compose deployment workflow.

**Architecture:** Add BuildKit cache mounts to the existing multi-stage Dockerfile. Export the Docker image as a fast gzip stream, hash and upload that exact file, then stream-decompress on the server into `docker load`. Keep compatibility with existing raw tar inputs.

**Tech Stack:** Docker BuildKit, Docker CLI, PowerShell, Bash, gzip.

**Spec:** `docs/superpowers/specs/2026-11-12-docker-release-speed-design.md`

## Global Constraints

- Keep the persistent `mzt-release` builder and its existing layer cache.
- Do not run a production deployment or alter production state.
- Keep the current SHA256, automatic rollback, and health-check gates.
- Preserve database and backup volumes.
- Keep the prebuilt standalone tar workflow unchanged.
- Do not run tests or a production build for this change.

## Review Focus

- Existing cache mounts do not enter the final application image.
- The gzip output is a stream of the original `docker save` archive, not a nested archive.
- SHA256 is calculated over exactly the compressed file uploaded by SCP.
- A damaged gzip stream fails before the Compose cutover.
- Both `.tar` and `.tar.gz` remote inputs remain supported.

---

### Task 1: Persist Docker build caches

**Files:** `Dockerfile`

- [ ] Enable the BuildKit Dockerfile frontend.
- [ ] Add a locked npm cache mount to dependency and runtime npm install steps.
- [ ] Add a locked persistent mount at `/app/.next/cache` for `npm run build`.
- [ ] Preserve all final-stage copy paths and runtime image contents.

### Task 2: Compress and time image transfer

**Files:** `scripts/deploy-compose-image.ps1`, `scripts/deploy-compose-image.sh`

- [ ] Export to a temporary raw Docker-save tar, gzip it with fast lossless compression, fall back to raw tar if gzip is not smaller, hash the exact artifact to upload, and remove temporary files after selection.
- [ ] Log build, export/compression, upload, remote cutover durations and compression ratio.
- [ ] Allow `.tar.gz` and legacy `.tar` on the server; validate gzip and stream-decompress compressed input into `docker load`.
- [ ] Keep rollback, health checks, and success cleanup intact.

### Task 3: Update deployment guidance and review

**Files:** `docs/快速部署指南.md`

- [ ] Explain warm BuildKit Next/npm caches and the compressed image transport.
- [ ] Clarify that the uploaded file is a gzip stream of `docker save` output and must not be wrapped again.
- [x] Review the modified scripts and docs against the spec; PowerShell AST parsing passed. Bash syntax validation was attempted, but this environment's `bash.exe` is a WSL launcher that returns `E_ACCESSDENIED`; no tests, build, upload, or deployment were run.
