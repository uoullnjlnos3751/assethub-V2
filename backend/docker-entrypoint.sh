#!/bin/sh
set -e

# Apply Prisma migration history, then start the server.
#
# Replaces the previous `prisma db push`, which synced the schema with no
# history and could silently drop columns/data on a breaking schema change.
#
# An existing production database already has all the tables but no
# _prisma_migrations table, so the first `migrate deploy` fails with P3005
# ("database schema is not empty"). In that case we mark the baseline
# migration as already applied — it describes the schema that is already
# there — and retry. This runs once; later boots go straight through.

BASELINE_MIGRATION="0_baseline"

echo "Applying database migrations..."

if npx prisma migrate deploy; then
  echo "Migrations applied."
else
  echo "migrate deploy failed — assuming an un-baselined existing database."
  echo "Marking ${BASELINE_MIGRATION} as already applied..."
  npx prisma migrate resolve --applied "${BASELINE_MIGRATION}"
  echo "Retrying migrate deploy..."
  npx prisma migrate deploy
  echo "Migrations applied (database baselined)."
fi

exec node dist/index.js
