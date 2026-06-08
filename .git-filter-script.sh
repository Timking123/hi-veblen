#!/bin/bash
# Git filter-branch script to remove sensitive data from history
# This script runs on each commit during filter-branch

# ---- Remove files that should never have been committed ----
rm -f .env.development .env.production
rm -f src/.env.development src/.env.production  
rm -f src/admin/frontend/.env.development src/admin/frontend/.env.production
rm -f .eslintrc.cjs.backup.*.cjs
rm -rf .snapshots
rm -f audit-report.json

# ---- Replace hardcoded secrets in source files ----

# JWT secret in config
if [ -f "src/admin/backend/src/config/jwt.ts" ]; then
  sed -i "s/'admin-system-jwt-secret-key-please-change-in-production'/process.env.JWT_SECRET || ''/g" "src/admin/backend/src/config/jwt.ts" 2>/dev/null
fi

# Admin password in database init
if [ -f "src/admin/backend/src/database/init.ts" ]; then
  sed -i "s/password: 'admin123'/password: process.env.ADMIN_PASSWORD || ''/g" "src/admin/backend/src/database/init.ts" 2>/dev/null
fi

# Database init script password
if [ -f "scripts/init-database.sh" ]; then
  sed -i "s/PASSWORD=\"\${ADMIN_PASSWORD:-123456}\"/PASSWORD=\"\${ADMIN_PASSWORD:-changeme}\"/g" "scripts/init-database.sh" 2>/dev/null
fi

# Webhook server secret
if [ -f "scripts/webhook-server.cjs" ]; then
  sed -i "s/secret: 'your-webhook-secret-here'/secret: process.env.WEBHOOK_SECRET || ''/g" "scripts/webhook-server.cjs" 2>/dev/null
fi

# Personal email in .env.development (if not deleted)
if [ -f ".env.development" ]; then
  sed -i "s/1243222867@QQ.com/your-email@example.com/g" ".env.development" 2>/dev/null
  sed -i "s/+86 14775378984/+86 00000000000/g" ".env.development" 2>/dev/null
fi
