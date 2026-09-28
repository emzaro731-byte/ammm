#!/bin/sh
set -eu
: "${PORT:=10000}"
exec nginx -g "daemon off;"
