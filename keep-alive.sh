#!/usr/bin/env bash
# ==============================================================================
# SEO/GEO Tools - Keep Alive & Auto-Recovery Script for Hostinger
# Memastikan service backend API (port 4000) selalu hidup dan responsif.
# ==============================================================================

# Deteksi direktori project secara absolut
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/apps/api"

# Pastikan HOME terdefinisi
if [ -z "$HOME" ]; then
    USER_NAME="$(whoami 2>/dev/null || echo '')"
    if [ -n "$USER_NAME" ] && [ -d "/home/$USER_NAME" ]; then
        export HOME="/home/$USER_NAME"
    elif [[ "$SCRIPT_DIR" =~ ^(/home/[^/]+) ]]; then
        export HOME="${BASH_REMATCH[1]}"
    fi
fi

# Load environment user (NVM / bashrc / profile)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
fi

if [ -s "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc" >/dev/null 2>&1
fi

if [ -s "$HOME/.profile" ]; then
    source "$HOME/.profile" >/dev/null 2>&1
fi

# Susun PATH lengkap agar cron menemukan node, npm, nvm, pm2
LATEST_NVM_NODE="$(ls -d $HOME/.nvm/versions/node/v* 2>/dev/null | tail -n 1)/bin"
export PATH="$LATEST_NVM_NODE:$HOME/.npm-global/bin:$HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# 1. Cek apakah backend API di port 4000 merespons
HEALTH_CHECK=$(curl -s -m 3 http://127.0.0.1:4000/health 2>/dev/null)

if [[ "$HEALTH_CHECK" =~ "ok" ]]; then
    exit 0
fi

# 2. Jika backend mati atau tidak merespons, hidupkan ulang
NOW=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$NOW] [KEEP-ALIVE] Backend seogeo-api di port 4000 mati. Memulai pemulihan..."

NODE_BIN=$(command -v node 2>/dev/null || ls $HOME/.nvm/versions/node/*/bin/node 2>/dev/null | tail -n 1 || echo "/usr/bin/node")
PM2_BIN=$(command -v pm2 2>/dev/null || ls $HOME/.nvm/versions/node/*/bin/pm2 2>/dev/null | tail -n 1 || echo "")

cd "$SCRIPT_DIR" || exit 1

export PORT=4000
export NODE_ENV=production

# Jalankan via PM2 jika tersedia
STARTED=0
if [ -n "$PM2_BIN" ] || command -v pm2 >/dev/null 2>&1; then
    PM2_CMD="${PM2_BIN:-pm2}"
    echo "[$NOW] [KEEP-ALIVE] Menggunakan PM2: $PM2_CMD"
    
    # Coba restart jika proses sudah terdaftar
    if $PM2_CMD describe seogeo-api >/dev/null 2>&1; then
        $PM2_CMD restart seogeo-api >/dev/null 2>&1
    else
        # Jika belum ada di list PM2, start dengan ecosystem file
        if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
            $PM2_CMD start "$SCRIPT_DIR/ecosystem.config.js" >/dev/null 2>&1
        else
            cd "$API_DIR" && $PM2_CMD start dist/index.js --name seogeo-api --max-memory-restart 350M >/dev/null 2>&1
        fi
    fi
    $PM2_CMD save >/dev/null 2>&1
    STARTED=1
fi

# Fallback: jika PM2 gagal atau tidak ada, jalankan dengan nohup node langsung
if [ "$STARTED" -eq 0 ]; then
    echo "[$NOW] [KEEP-ALIVE] Menjalankan dengan node background fallback..."
    cd "$API_DIR" || exit 1
    if [ -f "dist/index.js" ]; then
        nohup "$NODE_BIN" dist/index.js > seogeo-api.log 2>&1 &
    else
        nohup npx tsx src/index.ts > seogeo-api.log 2>&1 &
    fi
fi

# 3. Verifikasi pemulihan setelah 3 detik
sleep 3
NEW_HEALTH=$(curl -s -m 3 http://127.0.0.1:4000/health 2>/dev/null)
if [[ "$NEW_HEALTH" =~ "ok" ]]; then
    echo "[$NOW] [KEEP-ALIVE] ✅ Berhasil! Backend seogeo-api kini aktif dan merespons."
    exit 0
else
    echo "[$NOW] [KEEP-ALIVE] ⚠️ Sedang booting... Backend dipicu dan akan siap dalam beberapa detik."
    exit 1
fi
