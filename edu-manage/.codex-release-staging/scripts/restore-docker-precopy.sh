#!/usr/bin/env bash
set -Eeuo pipefail

project_dir=/opt/edu-manage-docker/source
backup_dir="${1:-/opt/edu-manage-docker/migration/precopy}"
compose=(docker compose -f compose.production.yaml)
db_volume=edu-manage_postgres_data

for required in muzhe_chuzhong.dump muzhe_gaozhong.dump shared-public.tar.gz; do
  test -s "$backup_dir/$required" || {
    echo "missing backup file: $backup_dir/$required" >&2
    exit 1
  }
done

cd "$project_dir"
"${compose[@]}" config --quiet

actual_volume="$(docker volume inspect "$db_volume" --format '{{.Name}}' 2>/dev/null || true)"
if [[ -n "$actual_volume" && "$actual_volume" != "$db_volume" ]]; then
  echo "refusing unexpected volume: $actual_volume" >&2
  exit 1
fi

"${compose[@]}" down
if [[ "$actual_volume" == "$db_volume" ]]; then
  docker volume rm "$db_volume"
fi

"${compose[@]}" pull db
"${compose[@]}" up -d db

db_container="$("${compose[@]}" ps -q db)"
for _ in $(seq 1 60); do
  status="$(docker inspect "$db_container" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')"
  [[ "$status" == healthy ]] && break
  sleep 2
done
[[ "${status:-}" == healthy ]] || {
  docker logs "$db_container" >&2
  echo "database did not become healthy" >&2
  exit 1
}

for database in muzhe_chuzhong muzhe_gaozhong; do
  docker cp "$backup_dir/${database}.dump" "$db_container:/tmp/${database}.dump"
  docker exec "$db_container" pg_restore \
    --exit-on-error \
    --no-owner \
    --no-privileges \
    --username=edu_admin \
    --dbname="$database" \
    "/tmp/${database}.dump"
  docker exec "$db_container" rm -f "/tmp/${database}.dump"
done

if [[ -d /srv/edu-manage/shared/public ]]; then
  public_rollback="/srv/edu-manage/shared/public.pre-final-$(date +%Y%m%d-%H%M%S)"
  [[ ! -e "$public_rollback" ]] || {
    echo "refusing existing rollback path: $public_rollback" >&2
    exit 1
  }
  mv /srv/edu-manage/shared/public "$public_rollback"
fi
tar --extract --gzip --file="$backup_dir/shared-public.tar.gz" \
  --directory=/srv/edu-manage/shared
chown -R 1000:1000 /srv/edu-manage/shared/public /data/backups/edu-manage
chmod 700 /data/backups/edu-manage

"${compose[@]}" --profile tools run --rm migrate
"${compose[@]}" up -d app

app_container="$("${compose[@]}" ps -q app)"
for _ in $(seq 1 60); do
  status="$(docker inspect "$app_container" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')"
  [[ "$status" == healthy ]] && break
  sleep 2
done
[[ "${status:-}" == healthy ]] || {
  docker logs "$app_container" >&2
  echo "application did not become healthy" >&2
  exit 1
}

curl --fail --silent --show-error --output /dev/null http://127.0.0.1:3000/login
echo 'precopy restore completed and application is healthy'
