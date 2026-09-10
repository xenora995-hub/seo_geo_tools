#!/usr/bin/env bash
# ==============================================================================
# SEO/GEO Tools - Daily Cron Runner (Pemicu Artikel Jam 08:00 Pagi)
# Menjalankan pembuat artikel secara mandiri & aman dari limit proses Hostinger
# ==============================================================================

# Deteksi direktori project secara absolut
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/apps/api"

# Deteksi Node binary di Hostinger (nvm / standard path)
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$HOME/.npm-global/bin:$HOME/bin"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
fi

if [ -s "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc" >/dev/null 2>&1
fi

NODE_BIN=$(command -v node 2>/dev/null || ls $HOME/.nvm/versions/node/*/bin/node 2>/dev/null | tail -n 1 || echo "/usr/bin/node")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Memulai pemicu artikel harian..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Menggunakan Node: $NODE_BIN"

# 1. Eksekusi generator artikel secara langsung melalui Standalone Runner
cd "$API_DIR" || exit 1

if [ -f "dist/scheduler/standalone-runner.js" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Menjalankan standalone-runner.js..."
    "$NODE_BIN" dist/scheduler/standalone-runner.js
    STATUS=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Standalone runner selesai dengan status exit: $STATUS"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] ⚠️ dist/scheduler/standalone-runner.js tidak ditemukan! Membangun ulang..."
    npm run build
    "$NODE_BIN" dist/scheduler/standalone-runner.js
fi

# 2. Opsional: Jika PM2 terpasang, pastikan seogeo-api tetap hidup untuk melayani dashboard web
if command -v pm2 >/dev/null 2>&1; then
    HEALTH=$(curl -s -m 2 http://127.0.0.1:4000/health 2>/dev/null)
    if [[ ! "$HEALTH" =~ "ok" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Membangunkan dashboard API di port 4000 via PM2..."
        pm2 resurrect >/dev/null 2>&1 || pm2 restart seogeo-api >/dev/null 2>&1 || pm2 start dist/index.js --name seogeo-api >/dev/null 2>&1
        pm2 save >/dev/null 2>&1
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Selesai."

