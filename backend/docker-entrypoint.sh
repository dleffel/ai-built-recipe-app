#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy

# Start the application
exec node dist/index.js