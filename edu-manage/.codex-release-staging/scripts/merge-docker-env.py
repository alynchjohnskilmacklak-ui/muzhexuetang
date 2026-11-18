#!/usr/bin/env python3
"""Merge protected production secrets into the Docker environment without printing values."""

from pathlib import Path
import os
import sys


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.removeprefix("export ").strip()
        if key:
            values[key] = value.strip()
    return values


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: merge-docker-env.py OLD_ENV GENERATED_ENV OUTPUT_ENV", file=sys.stderr)
        return 2

    old_path, generated_path, output_path = map(Path, sys.argv[1:])
    old = read_env(old_path)
    generated = read_env(generated_path)
    merged = dict(old)

    for key, value in generated.items():
        merged.setdefault(key, value)

    for required in ("POSTGRES_PASSWORD", "CRON_SECRET"):
        if required not in generated:
            raise RuntimeError(f"generated environment is missing {required}")
        merged[required] = generated[required]

    password = generated["POSTGRES_PASSWORD"].strip('"\'')
    base = f"postgresql://edu_admin:{password}@db:5432"
    merged.update(
        {
            "DATABASE_URL": f"{base}/muzhe_chuzhong?schema=public",
            "DATABASE_URL_JUNIOR": f"{base}/muzhe_chuzhong?schema=public",
            "DATABASE_URL_SENIOR": f"{base}/muzhe_gaozhong?schema=public",
            "DUAL_DB": "true",
            "APP_ROOT": "/app",
            "BACKUP_DIR": "/data/backups/edu-manage",
            "BACKUP_SCRIPT": "/app/scripts/backup-now.sh",
            "UPLOAD_DIR": "/app/public/uploads",
            "AUTH_TRUST_HOST": "true",
        }
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("# Generated for the Docker deployment; values are intentionally not logged.\n")
        for key in sorted(merged):
            handle.write(f"{key}={merged[key]}\n")
    os.chmod(temporary, 0o600)
    temporary.replace(output_path)
    os.chmod(output_path, 0o600)
    print(f"Merged {len(merged)} environment keys into {output_path} (mode 600).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
