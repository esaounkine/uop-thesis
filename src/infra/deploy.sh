#!/usr/bin/env bash
set -euo pipefail

cd /home/saunkin/opt/uop-thesis
git fetch origin
git reset --hard origin/master

make deploy

echo "Date of last deploy: $(date)"