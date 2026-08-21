#!/usr/bin/env bash
set -euo pipefail

cd /home/saunkin/opt/uop-thesis
git fetch origin
# if nothing new, then don't rebuild
[ "$(git rev-parse @)" = "$(git rev-parse '@{u}')" ] && exit 0
git reset --hard origin/master
docker compose up -d --build
# clean up build garbage (to reclaim the disk space)
docker system prune -af
