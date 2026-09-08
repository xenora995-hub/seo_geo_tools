#!/usr/bin/env bash
# ==============================================================================
# SEO/GEO Tools - Daily Cron Runner (Pemicu Artikel Jam 08:00 Pagi)
# Menjalankan generasi artikel otomatis secara mandiri & on-demand
# ==============================================================================

# 1. Muat environment binary
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$HOME/.npm-global/bin:$HOME/bin"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
fi

if [ -s "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc" >/dev/null 2>&1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/apps/api"

NODE_BIN=$(command -v node 2>/dev/null || ls $HOME/.nvm/versions/node/*/bin/node 2>/dev/null | tail -n 1 || echo "/usr/bin/node")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Memulai pemicu artikel harian jam 8 pagi..."

cd "$API_DIR" || exit 1

# 2. Jalankan standalone runner mandiri
if [ -f "$API_DIR/dist/scheduler/standalone-runner.js" ]; then
    "$NODE_BIN" "$API_DIR/dist/scheduler/standalone-runner.js"
else
    npx tsx "$API_DIR/src/scheduler/standalone-runner.ts"
fi

# 3. Pastikan backend API di port 4000 juga hidup untuk dashboard
if [ -f "$SCRIPT_DIR/keep-alive.sh" ]; then
    bash "$SCRIPT_DIR/keep-alive.sh" > /dev/null 2>&1 &
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Eksekusi pemicu artikel harian selesai."
