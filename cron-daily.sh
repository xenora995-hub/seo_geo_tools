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

# 1. Eksekusi runner melalui API internal (zero-thread-overhead via Unix Socket / HTTP)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Memicu artikel via API Runner..."
CRON_RESP=$(curl -s -m 180 --unix-socket "$API_DIR/api.sock" "http://localhost/api/schedules/runner?secret=seogeo-cron-token-secret" 2>/dev/null || curl -s -m 180 "https://seo.baliphonerepair.com/api/schedules/runner?secret=seogeo-cron-token-secret" 2>/dev/null)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Respons API Runner: $CRON_RESP"

if [[ "$CRON_RESP" != *"\"success\":true"* ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] API Runner tidak merespons, fallback ke standalone-runner.js..."
    cd "$API_DIR" || exit 1
    if [ -f "dist/scheduler/standalone-runner.js" ]; then
        "$NODE_BIN" dist/scheduler/standalone-runner.js
        STATUS=$?
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Standalone runner selesai: $STATUS"
    fi
fi

# 2. Pastikan service seogeo-api tetap hidup untuk melayani dashboard web
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Memeriksa status service dashboard..."
bash "$SCRIPT_DIR/keep-alive.sh"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Selesai."


