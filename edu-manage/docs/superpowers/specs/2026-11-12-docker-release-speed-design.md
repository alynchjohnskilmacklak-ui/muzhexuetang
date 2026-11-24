# Docker release speed design

## Intent

Shorten the repository's active Docker image release path. The deployment should reuse Next.js build output caches and send a compressed Docker save archive, while keeping candidate validation, SHA256 verification, rollback, and the production cutover sequence intact.

## Current state

`scripts/deploy-compose-image.ps1` builds with the persistent `mzt-release` Buildx builder, so dependency layers already reuse Docker's layer cache. The Next.js build step has no explicit persistent `.next/cache` mount. The script exports the complete image to an uncompressed tar and uploads it with SCP. The remote helper loads that tar before the existing health-checked Compose switch.

## Approaches

1. **Only tune BuildKit cache.** Improves repeat Next.js builds but leaves the image transfer unchanged.
2. **Only compress image transfer.** Reduces uploaded bytes but leaves build time unchanged.
3. **Apply both in the active release path (chosen).** Add persistent npm and Next.js cache mounts, gzip the Docker save archive using the fastest lossless compression level when it reduces size, and stream-decompress it into `docker load`. This directly addresses both build and upload time without changing image contents or the switch/rollback behavior.

The user approved proceeding with the previously recommended cache-first approach. This design applies to the Docker image workflow documented in `docs/快速部署指南.md`; the alternate prebuilt-tar workflow is unchanged.

## Goals and constraints

- Reuse the existing `mzt-release` Buildx builder and its cache.
- Persist `/app/.next/cache` between builds and cache npm downloads for dependency changes.
- Upload a standard gzip stream of `docker save` output when it is smaller; fall back to the raw Docker tar if compression does not reduce size. Never wrap one archive inside another tar archive.
- Hash the exact compressed file that is uploaded and keep server-side checksum validation.
- Keep the old Docker image rollback and Compose health check behavior unchanged.
- Continue to preserve database containers, volumes, and backups.
- Do not build, upload, or switch production as part of this repository change.
- Do not split public assets into independent deployment in this iteration; mutable URL caching and release consistency need a separate design.

## Success criteria

- On a warm Buildx builder, dependency layers remain cacheable and Next.js can reuse `.next/cache` across changed-source builds.
- The deployment script reports build, export/compression, upload, and remote-switch durations, and reports archive size reduction.
- The remote helper accepts `.tar.gz` archives and existing raw `.tar` archives, streams gzip input into Docker without writing a second uncompressed server-side archive, and blocks the cutover if decompression or image loading fails.
- The existing SHA256, candidate health check, rollback, and cleanup paths remain in place.
