#!/bin/sh
set -eu

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "Seeding the demo database..."
  node src/scripts/seed.js --reset
fi

exec node src/server.js
