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
    pm2 resurrect >/dev/null 2>&1 || pm2 restart seogeo-api 2>/dev/null || pm2 start dist/index.js --name seogeo-api
    pm2 save >/dev/null 2>&1
    
    # Tunggu sampai port 4000 benar-benar siap (hingga 15 detik)
    for i in {1..15}; do
        sleep 1
        HEALTH=$(curl -s -m 2 http://127.0.0.1:4000/health 2>/dev/null)
        if [[ "$HEALTH" =~ "ok" ]]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Backend siap pada detik ke-$i."
            break
        fi
    done
fi

# 2. Pemicu eksekusi jadwal melalui port internal 4000
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Memanggil pemicu runner port 4000..."
RESPONSE=$(curl -s -m 180 "http://127.0.0.1:4000/api/schedules/runner?secret=seogeo-cron-token-secret")

# 3. Fallback Mandiri jika port 4000 tidak membalas sukses
if [[ ! "$RESPONSE" =~ "success" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] ⚠️ Port 4000 tidak merespons, beralih ke Standalone Runner langsung..."
    NODE_BIN=$(command -v node 2>/dev/null || ls $HOME/.nvm/versions/node/*/bin/node 2>/dev/null | tail -n 1 || echo "/usr/bin/node")
    if [ -f "$API_DIR/dist/scheduler/standalone-runner.js" ]; then
        RESPONSE=$("$NODE_BIN" "$API_DIR/dist/scheduler/standalone-runner.js")
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Hasil eksekusi: $RESPONSE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRON-DAILY] Selesai."
