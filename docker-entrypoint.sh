#!/bin/sh
set -eu

: "${PORT:=10000}"

if [ -n "${SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  sed -i "s|__SUPABASE_PUBLISHABLE_KEY__|${SUPABASE_PUBLISHABLE_KEY}|g" /usr/share/nginx/html/app.js
fi

exec nginx -g "daemon off;"
