# Panduan Setup & Deploy SEO/GEO Tools

## REQUIREMENT

- Node.js >= 18
- Docker & Docker Compose (untuk database)
- Atau PostgreSQL yang sudah terinstall

---

## LANGKAH 1 — Clone & Install

```bash
# Di folder project
cd seo-geo-tools
npm install
```

---

## LANGKAH 2 — Setup Database

```bash
# Jalankan PostgreSQL via Docker
docker-compose up -d postgres

# Atau jika pakai PostgreSQL lokal, buat database dulu:
# createdb seogeo
```

---

## LANGKAH 3 — Konfigurasi Environment

```bash
# Copy .env
cp apps/api/.env.example apps/api/.env

# Edit .env sesuai kebutuhan
nano apps/api/.env
```

Isi minimal:
```env
DATABASE_URL="postgresql://seogeo:seogeo_pass_2024@localhost:5432/seogeo"
JWT_SECRET="isi-dengan-string-random-panjang-minimal-32-karakter"
SUPERUSER_EMAIL="emailkamu@domain.com"
SUPERUSER_PASSWORD="passwordkuat123!"
```

---

## LANGKAH 4 — Migrasi Database & Seed

```bash
cd apps/api
npx prisma migrate dev --name init
npm run db:seed
```

Output yang diharapkan:
```
✅ Superuser berhasil dibuat:
   Email: emailkamu@domain.com
   Password: passwordkuat123!
```

---

## LANGKAH 5 — Jalankan Development

```bash
# Di root folder, jalankan semua sekaligus:
npm run dev

# Atau terpisah:
cd apps/api && npm run dev      # Backend: http://localhost:4000
cd apps/dashboard && npm run dev # Frontend: http://localhost:3000
```

---

## LANGKAH 6 — Login Pertama

1. Buka `http://localhost:3000`
2. Login dengan email & password superuser dari .env
3. Ganti password di Pengaturan

---

## LANGKAH 7 — Tambah Website Klien

1. Masuk menu **Kelola Website** (hanya superuser)
2. Klik **Tambah Website**
3. Isi:
   - Nama: nama website klien
   - Domain: domain website
   - CMS Type: WordPress atau Laravel
   - CMS URL: URL website
   - CMS API Key:
     - WordPress: `base64(username:application_password)` — buat di WP Admin > Users > Application Passwords
     - Laravel: Bearer token dari Sanctum (lihat packages/laravel-api/README.md)
   - Email Admin: email login untuk klien ini
   - Password Admin: password login klien

---

## LANGKAH 8 — Setup Setting per Website

1. Login sebagai admin klien (atau pakai superuser + pilih tenant)
2. Buka **Pengaturan**
3. Isi:
   - OpenAI API Key: sk-...
   - Telegram Bot Token: dari @BotFather
   - Telegram Chat ID: dari @userinfobot
   - Target Keywords: keyword utama bisnis
   - Kompetitor: domain kompetitor

---

## LANGKAH 9 — Buat Jadwal Otomatis

1. Buka menu **Jadwal**
2. Klik **Buat Jadwal**
3. Isi Cron Expression:
   - `0 8 * * *` = setiap hari jam 08:00
   - `0 8,14 * * *` = dua kali sehari (jam 8 & 14)
   - `0 8 * * 1-5` = Senin-Jumat jam 08:00

---

## DEPLOY KE SUBDOMAIN

### Opsi 1: VPS (Recommended)

```bash
# Build production
npm run build

# Install PM2
npm install -g pm2

# Jalankan API
cd apps/api
pm2 start dist/index.js --name seogeo-api

# Serve frontend (Next.js standalone)
cd apps/dashboard
pm2 start node_modules/.bin/next --name seogeo-dashboard -- start -p 3000
```

Konfigurasi Nginx:
```nginx
# tools.domainmu.com → Next.js dashboard (port 3000)
server {
    listen 80;
    server_name tools.domainmu.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# api.domainmu.com → Express API (port 4000)
server {
    listen 80;
    server_name api.domainmu.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
    }
}
```

### Opsi 2: Docker Full

```bash
docker-compose up -d
```

---

## CARA DAPATKAN WORDPRESS APPLICATION PASSWORD

1. Login WordPress Admin
2. Buka Users > Profile
3. Scroll ke bawah: **Application Passwords**
4. Beri nama (contoh: "SEO Tools"), klik **Add New Application Password**
5. Copy password yang muncul
6. Buat CMS API Key: `base64("username:app_password")`

Di terminal:
```bash
echo -n "adminuser:xxxx xxxx xxxx xxxx xxxx xxxx" | base64
```

---

## CARA DAPATKAN TELEGRAM BOT TOKEN & CHAT ID

1. **Bot Token**: chat @BotFather → /newbot → copy token
2. **Chat ID**: chat @userinfobot → copy Your ID
   - Untuk grup: tambahkan bot ke grup → kirim pesan → gunakan ID grup (biasanya negatif)
