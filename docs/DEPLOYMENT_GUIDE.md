# 🚀 Panduan Deployment SEO/GEO Tools ke Subdomain Production

Panduan ini menjelaskan langkah demi langkah cara men-deploy **SEO/GEO Tools** ke server production (VPS Ubuntu 22.04 LTS / Debian) dengan konfigurasi subdomain:
- **Frontend Dashboard**: `https://tools.yourdomain.com` (port 3000)
- **Backend API**: `https://api.tools.yourdomain.com` (port 4000)

---

## 1. Persiapan Server VPS

### A. Update Sistem & Install Paket Dasar
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx
```

### B. Install Node.js 20 LTS & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### C. Install & Konfigurasi PostgreSQL 15+
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Buat database dan user
sudo -u postgres psql <<EOF
CREATE DATABASE seogeo;
CREATE USER seogeo WITH ENCRYPTED PASSWORD 'StrongProductionPassword2024!';
GRANT ALL PRIVILEGES ON DATABASE seogeo TO seogeo;
\c seogeo
GRANT ALL ON SCHEMA public TO seogeo;
EOF
```

---

## 2. Clone Repository & Setup Monorepo

```bash
cd /var/www
sudo git clone <URL_REPOSITORY_ANDA> seo-geo-tools
sudo chown -R $USER:$USER /var/www/seo-geo-tools
cd /var/www/seo-geo-tools

# Install seluruh dependencies monorepo
npm install
```

---

## 3. Konfigurasi Environment Variables

### A. Backend API (`apps/api/.env`)
```bash
cat << 'EOF' > apps/api/.env
DATABASE_URL="postgresql://seogeo:StrongProductionPassword2024!@localhost:5432/seogeo"
JWT_SECRET="ganti-dengan-random-string-minimal-32-karakter-yang-sangat-kuat!"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="https://tools.yourdomain.com"

# Superuser default untuk seed
SUPERUSER_EMAIL="admin@yourdomain.com"
SUPERUSER_PASSWORD="GantiPasswordAdminAman123!"

# Opsional: Crawler SERP API
DATAFORSEO_LOGIN=""
DATAFORSEO_PASSWORD=""
EOF
```

### B. Frontend Dashboard (`apps/dashboard/.env.local`)
```bash
cat << 'EOF' > apps/dashboard/.env.local
NEXT_PUBLIC_API_URL="https://api.tools.yourdomain.com"
EOF
```

---

## 4. Migrasi Database & Seed Superuser

```bash
# Push schema & generate Prisma client
cd /var/www/seo-geo-tools/apps/api
npx prisma db push

# Seed akun superuser
npm run db:seed
```

---

## 5. Build Production

```bash
cd /var/www/seo-geo-tools

# Build backend (TypeScript kompilasi ke dist/) dan frontend (Next.js production bundle)
npm run build
```

---

## 6. Jalankan Proses dengan PM2

Buat file konfigurasi PM2 di root project `/var/www/seo-geo-tools/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'seogeo-api',
      cwd: './apps/api',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'seogeo-dashboard',
      cwd: './apps/dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Jalankan PM2 dan aktifkan auto-start saat reboot:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 7. Konfigurasi Nginx Reverse Proxy

### A. Konfigurasi Backend API (`/etc/nginx/sites-available/api.tools.yourdomain.com`)
```nginx
server {
    server_name api.tools.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout upload/generate artikel
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

### B. Konfigurasi Dashboard Frontend (`/etc/nginx/sites-available/tools.yourdomain.com`)
```nginx
server {
    server_name tools.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### C. Aktifkan Konfigurasi & Reload Nginx
```bash
sudo ln -s /etc/nginx/sites-available/api.tools.yourdomain.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/tools.yourdomain.com /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Pasang SSL Gratis (Let's Encrypt Certbot)

```bash
sudo certbot --nginx -d tools.yourdomain.com -d api.tools.yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com
```

---

## 9. Verifikasi Deployment

1. Buka browser: `https://tools.yourdomain.com/login`
2. Masuk menggunakan akun superuser yang sudah di-seed.
3. Buka menu **Kelola Website** dan daftarkan website WordPress / Laravel klien Anda.
4. Buka menu **Pengaturan** dan masukkan OpenAI API key serta Telegram Bot Token milik tenant.
5. Coba generate 1 artikel manual dan pastikan berhasil publish ke CMS klien.
