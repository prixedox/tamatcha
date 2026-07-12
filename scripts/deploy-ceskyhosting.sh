#!/usr/bin/env bash
# Deploy the site to tamatcha.cz (Český hosting).
# Requires the SSH key ~/.ssh/tamatcha_cz (authorized on the server).
set -euo pipefail
cd "$(dirname "$0")/.."

VITE_BASE=/ npm run build
rsync -az --delete --stats -e "ssh -i ~/.ssh/tamatcha_cz" \
  dist/ tamatcha_cz@www.tamatcha.cz:tamatcha.cz/

echo "Deployed: https://tamatcha.cz"
