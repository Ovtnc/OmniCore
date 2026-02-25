#!/bin/sh
set -e
# Production: Veritabanı migration'ları (varsa) uygula, sonra komutu çalıştır
if [ -n "$DATABASE_URL" ] && [ "$1" = "pnpm" ] && [ "$2" = "start" ]; then
  echo "Running Prisma migrate deploy..."
  pnpm exec prisma migrate deploy 2>/dev/null || pnpm exec prisma db push --accept-data-loss 2>/dev/null || true
fi
exec "$@"
