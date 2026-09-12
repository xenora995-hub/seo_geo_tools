#!/bin/bash
set -e

echo "🚀 Memulai sinkronisasi SEO/GEO Tools ke Hostinger..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cari direktori web target untuk seo.baliphonerepair.com
CHOSEN_DIR=""
POSSIBLE_DIRS=(
    "$HOME/domains/seo.baliphonerepair.com/public_html"
    "$HOME/domains/baliphonerepair.com/public_html/seo"
    "$HOME/domains/baliphonerepair.com/public_html"
    "$HOME/public_html"
)

for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        CHOSEN_DIR="$dir"
        break
    fi
done

# Fallback pencarian dinamis jika path spesifik belum ditemukan
if [ -z "$CHOSEN_DIR" ]; then
    CHOSEN_DIR=$(find "$HOME" -maxdepth 4 -type d \( -path "*seo.baliphonerepair.com/public_html*" -o -name "public_html" \) 2>/dev/null | head -n 1)
fi

if [ -z "$CHOSEN_DIR" ]; then
    CHOSEN_DIR="$HOME/public_html"
fi

echo "📁 Target direktori web: $CHOSEN_DIR"
mkdir -p "$CHOSEN_DIR"

# Pastikan folder build out ada
if [ ! -d "$SCRIPT_DIR/apps/dashboard/out" ]; then
    echo "❌ Error: Folder apps/dashboard/out tidak ditemukan!"
    exit 1
fi

# Salin seluruh file frontend yang sudah ter-compile
echo "📦 Menyalin file frontend (Next.js static export)..."
cp -r "$SCRIPT_DIR/apps/dashboard/out/"* "$CHOSEN_DIR"/
cp "$SCRIPT_DIR/apps/dashboard/out/.htaccess" "$CHOSEN_DIR"/.htaccess
cp "$SCRIPT_DIR/apps/dashboard/out/api-bridge.php" "$CHOSEN_DIR"/api-bridge.php

# Pastikan permission file dan folder web benar (755 folder, 644 file)
chmod 755 "$CHOSEN_DIR"
find "$CHOSEN_DIR" -type d -exec chmod 755 {} \;
find "$CHOSEN_DIR" -type f -exec chmod 644 {} \;

# Restart backend service via PM2
echo "🔄 Memastikan backend seogeo-api aktif..."
cd "$SCRIPT_DIR/apps/api"
(pm2 restart seogeo-api 2>/dev/null || pm2 start dist/index.js --name seogeo-api)
pm2 save

echo ""
echo "=========================================================="
echo "✅ BERHASIL! File frontend & konfigurasi telah terpasang."
echo "🔗 Buka web Anda di: https://seo.baliphonerepair.com"
echo "🔗 Halaman Login:   https://seo.baliphonerepair.com/login"
echo "=========================================================="
