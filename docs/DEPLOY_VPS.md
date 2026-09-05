# Complete VPS Deployment Guide (Ubuntu 22.04 LTS)

Panduan lengkap instalasi dan deployment **SEO/GEO Tools** di Virtual Private Server (VPS) Ubuntu 22.04 LTS menggunakan PM2, Nginx reverse proxy, dan SSL Let's Encrypt.

---

## 1. System Requirements & Dependencies

Pastikan server Anda memiliki spesifikasi minimal:
- **OS:** Ubuntu 22.04 LTS
- **RAM:** Minimal 2 GB (Rekomendasi 4 GB untuk build Next.js)
- **CPU:** 2 vCPU
- **Disk:** Minimal 20 GB SSD

### Langkah 1: Update Server dan Install Paket Dasar
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx postgresql-client
```

### Langkah 2: Install Node.js 20 LTS & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Verifikasi versi instalasi:
```bash
node -v    # v20.x.x
npm -v     # v10.x.x
pm2 -v     # 5.x.x
```

---

## 2. Clone Repository & Install Dependencies

Clone project ke direktori `/var/www/`:

```bash
cd /var/www
sudo git clone <URL_REPOSITORY_ANDA> seo-geo-tools
sudo chown -R $USER:$USER /var/www/seo-geo-tools
cd /var/www/seo-geo-tools

# Install root dependencies
npm install

# Install API dependencies
cd apps/api
npm install

# Install Dashboard dependencies & build Next.js
cd ../dashboard
npm install
npm run build

# Kembali ke root
cd ../../
```

---

## 3. Environment Setup (.env Files)

### A. Backend Configuration (`apps/api/.env`)
Buat file konfigurasi backend:
```bash
nano apps/api/.env
```
Isi dengan nilai konfigurasi produksi Anda:
```ini
# PostgreSQL Connection (Supabase atau Database lokal VPS)
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@[HOST]:6543/postgres?pgbouncer=true&schema=seogeo"
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@[HOST]:5432/postgres?schema=seogeo"

# JWT Security
JWT_SECRET="masukkan-random-string-minimal-32-karakter-keamanan-tinggi!"
JWT_EXPIRES_IN="7d"

# Server Ports
PORT=4000
FRONTEND_URL="https://dashboard.yourdomain.com"

# Superuser Default (untuk seed awal)
SUPERUSER_EMAIL="admin@seogeo.com"
SUPERUSER_PASSWORD="GantiDenganPasswordKuat2026!"

# Google PageSpeed Insights API Key (Opsional / Rekomendasi)
GOOGLE_PSI_API_KEY=""
```

### B. Frontend Configuration (`apps/dashboard/.env.local`)
Buat file konfigurasi frontend:
```bash
nano apps/dashboard/.env.local
```
Isi dengan URL API publik:
```ini
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 4. Database Setup & Prisma Migration

Jalankan sinkronisasi skema database Prisma ke server PostgreSQL:

```bash
cd /var/www/seo-geo-tools/apps/api

# Push skema ke database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed akun Superuser awal
npx tsx src/seed.ts

cd ../../
```

---

## 5. PM2 Ecosystem Configuration

Pastikan file `ecosystem.config.js` di root project (`/var/www/seo-geo-tools/ecosystem.config.js`) sudah siap:

```javascript
module.exports = {
  apps: [
    {
      name: 'seogeo-api',
      cwd: './apps/api',
      script: 'npx',
      args: 'tsx src/index.ts',
      env: { NODE_ENV: 'production', PORT: 4000 }
    },
    {
      name: 'seogeo-dashboard',
      cwd: './apps/dashboard',
      script: 'node',
      args: '.next/server/server.js',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
}
```

> **Catatan:** Jika menggunakan Next.js mode standar tanpa custom standalone server, Anda juga dapat menjalankan dashboard via script: `npm` dengan args: `run start`.

Jalankan aplikasi dengan PM2:
```bash
cd /var/www/seo-geo-tools
pm2 start ecosystem.config.js
pm2 status
```

---

## 6. Nginx Reverse Proxy Configuration

Arahkan subdomain ke masing-masing port internal:
- `api.yourdomain.com` $\rightarrow$ Port 4000
- `dashboard.yourdomain.com` $\rightarrow$ Port 3000

Buat file konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/seogeo
```

Isi dengan konfigurasi berikut (ganti `yourdomain.com` dengan domain Anda):

```nginx
# 1. Backend API (Port 4000)
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. Frontend Dashboard (Port 3000)
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/seogeo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. SSL via Certbot (Let's Encrypt)

Pasang sertifikat SSL gratis otomatis untuk kedua subdomain:

```bash
sudo certbot --nginx -d api.yourdomain.com -d dashboard.yourdomain.com
```

Pilih opsi untuk otomatis redirect traffic HTTP ke HTTPS. Certbot akan memperbarui sertifikat secara otomatis melalui cron internal.

---

## 8. Auto-Restart on Reboot (PM2 Startup)

Simpan state proses PM2 agar otomatis hidup kembali saat server restart:

```bash
pm2 save
pm2 startup
```
Salin dan jalankan perintah `sudo env PATH=...` yang dimunculkan oleh terminal dari perintah `pm2 startup`.

---

## 9. Verification & Health Check

Uji endpoint API secara lokal:
```bash
curl http://localhost:4000/
# Output: {"status":"online","service":"SEO & GEO Content Automation Platform API",...}

curl http://localhost:4000/health
# Output: {"status":"ok","timestamp":"..."}
```

Uji melalui domain publik di browser atau terminal:
```bash
curl https://api.yourdomain.com/health
```

Akses Dashboard melalui browser:
👉 **`https://dashboard.yourdomain.com`**
- **Email:** `admin@seogeo.com`
- **Password:** Password yang Anda atur di `.env` (Default: `Admin@2024!`)
