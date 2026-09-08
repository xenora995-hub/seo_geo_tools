#!/usr/bin/env bash
# ==============================================================================
# SEO/GEO Tools - Keep Alive & Auto-Recovery Script for Hostinger
# Memastikan service backend API (port 4000) selalu hidup dan responsif.
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

# 1. Cek apakah backend API di port 4000 merespons
HEALTH_CHECK=$(curl -s -m 3 http://127.0.0.1:4000/health 2>/dev/null)

if [[ "$HEALTH_CHECK" =~ "ok" ]]; then
    exit 0
fi

# 2. Jika backend mati atau tidak merespons, hidupkan ulang secara otomatis
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backend seogeo-api mati/tidak merespons. Memulai ulang..."

cd "$API_DIR" || exit 1

export PORT=4000
export NODE_ENV=production

NODE_BIN=$(command -v node 2>/dev/null || ls $HOME/.nvm/versions/node/*/bin/node 2>/dev/null | tail -n 1 || echo "/usr/bin/node")

# Coba restart via PM2 atau jalankan proses baru
if command -v pm2 >/dev/null 2>&1; then
    pm2 resurrect >/dev/null 2>&1 || pm2 restart seogeo-api >/dev/null 2>&1 || pm2 start dist/index.js --name seogeo-api
    pm2 save >/dev/null 2>&1
elif command -v npx >/dev/null 2>&1; then
    npx pm2 resurrect >/dev/null 2>&1 || npx pm2 restart seogeo-api >/dev/null 2>&1 || npx pm2 start dist/index.js --name seogeo-api
    npx pm2 save >/dev/null 2>&1
else
    # Fallback jika pm2 tidak tersedia, gunakan nohup node
    if [ -f "dist/index.js" ]; then
        nohup "$NODE_BIN" dist/index.js > seogeo-api.log 2>&1 &
    else
        nohup npx tsx src/index.ts > seogeo-api.log 2>&1 &
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backend seogeo-api berhasil diaktifkan kembali."
