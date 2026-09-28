#!/usr/bin/env bash
set -e
test -n "$SUPABASE_PUBLISHABLE_KEY"
sed "s|__SUPABASE_PUBLISHABLE_KEY__|$SUPABASE_PUBLISHABLE_KEY|g" website/app.js > website/app.deploy.js
mv website/app.deploy.js website/app.js
