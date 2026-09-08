#!/usr/bin/env bash
# ==============================================================================
# SEO/GEO Tools - Daily Cron Runner (Pemicu Artikel Jam 08:00 Pagi)
# Menjalankan pembuat artikel via service backend (Port 4000)
# Menggunakan 1 proses tunggal PM2 agar hemat RAM & aman dari limit thread Hostinger
# ==============================================================================

export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$HOME/.npm-global/bin:$HOME/bin"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
fi

if [ -s "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc" >/dev/null 2>&1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/apps/api"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Memulai pemicu artikel harian jam 8 pagi..."

# 1. Pastikan backend di port 4000 hidup dan responsif
HEALTH=$(curl -s -m 3 http://127.0.0.1:4000/health 2>/dev/null)
if [[ ! "$HEALTH" =~ "ok" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Backend port 4000 belum menyala, menghidupkan via PM2..."
    cd "$API_DIR" || exit 1
    pm2 restart seogeo-api 2>/dev/null || pm2 start dist/index.js --name seogeo-api
    pm2 save >/dev/null 2>&1
    sleep 3
fi

# 2. Pemicu eksekusi jadwal melalui port internal 4000 (tidak membuat proses Node baru)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Memanggil pemicu runner..."
RESPONSE=$(curl -s -m 180 "http://127.0.0.1:4000/api/schedules/runner?secret=seogeo-cron-token-secret")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Hasil eksekusi: $RESPONSE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Selesai."
