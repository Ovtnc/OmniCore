#!/bin/sh
# PostgreSQL yedekleme - omnicore_postgres_backup volume'a veya S3'e
# Kullanım: docker compose exec postgres pg_dump -U omnicore omnicore | gzip > backup.sql.gz
# veya: ./scripts/backup-postgres.sh (compose çalışırken)

set -e
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER="${CONTAINER:-omnicore-postgres}"
USER="${POSTGRES_USER:-omnicore}"
DB="${POSTGRES_DB:-omnicore}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/omnicore-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T "$CONTAINER" pg_dump -U "$USER" "$DB" | gzip > "$FILE"
echo "Backup: $FILE"
