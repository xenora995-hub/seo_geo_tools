# SEO/GEO TOOLS — OTAK SISTEM (CLAUDE.md)
> Dibaca dan dieksekusi oleh Antigravity IDE

## OVERVIEW PROYEK

Sistem otomasi SEO & GEO (Generative Engine Optimization) berbasis web yang:
- Membuat artikel otomatis menggunakan OpenAI GPT-4o
- Membuat gambar otomatis menggunakan DALL-E 3
- Mempublikasikan ke WordPress (REST API) dan Laravel (custom API)
- Multi-tenant: setiap klien (web) terisolasi, tidak bisa melihat data klien lain
- Mengirim laporan harian & mingguan ke Telegram
- Superuser bisa kelola semua tenant

---

## ARSITEKTUR SISTEM

```
seo-geo-tools/
├── CLAUDE.md                        ← file ini (otak Antigravity)
├── apps/
│   ├── dashboard/                   ← Frontend Next.js (port 3000)
│   │   ├── src/
│   │   │   ├── app/                 ← Next.js App Router
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── package.json
│   │   └── next.config.js
│   └── api/                         ← Backend Express.js (port 4000)
│       ├── src/
│       │   ├── auth/                ← JWT login, multi-tenant, superuser
│       │   ├── generator/           ← OpenAI artikel + DALL-E gambar
│       │   ├── scheduler/           ← node-cron jobs
│       │   ├── publisher/           ← kirim ke WP & Laravel
│       │   ├── reporter/            ← laporan Telegram
│       │   └── crawler/             ← cek ranking Google & ChatGPT
│       ├── prisma/
│       │   └── schema.prisma        ← database schema
│       └── package.json
├── packages/
│   └── laravel-api/                 ← Laravel package untuk klien
│       ├── src/
│       │   ├── Http/Controllers/
│       │   └── routes/
│       └── composer.json
├── docker-compose.yml
└── .env.example
```

---

## DATABASE SCHEMA (PostgreSQL via Prisma)

### Tabel Utama:

```prisma
// Tenant = setiap website klien
model Tenant {
  id          String   @id @default(cuid())
  name        String   // "Web A", "Web B"
  domain      String   @unique
  cmsType     CmsType  // WORDPRESS | LARAVEL
  cmsUrl      String   // URL website klien
  cmsApiKey   String   // WP Application Password atau Laravel token
  language    String   @default("id") // "id" atau "en"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  users       User[]
  articles    Article[]
  schedules   Schedule[]
  reports     Report[]
  settings    TenantSetting?
}

// User per tenant (isolated)
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String   // bcrypt hash
  role        Role     // SUPERUSER | ADMIN | VIEWER
  tenantId    String?  // null = superuser (akses semua)
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  createdAt   DateTime @default(now())
}

// Artikel yang digenerate
model Article {
  id          String        @id @default(cuid())
  tenantId    String
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  title       String
  content     String        @db.Text
  excerpt     String
  keywords    String[]
  imageUrl    String?       // hasil DALL-E atau URL upload
  imagePrompt String?
  status      ArticleStatus // DRAFT | PUBLISHED | FAILED
  publishedAt DateTime?
  cmsPostId   String?       // ID post di WP/Laravel setelah publish
  createdAt   DateTime      @default(now())
}

// Jadwal posting
model Schedule {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  cronExpr    String   // "0 8 * * *" = setiap hari jam 8 pagi
  topic       String?  // topik khusus, null = auto dari keywords
  isActive    Boolean  @default(true)
  lastRun     DateTime?
  nextRun     DateTime?
}

// Laporan (harian & mingguan)
model Report {
  id          String     @id @default(cuid())
  tenantId    String
  tenant      Tenant     @relation(fields: [tenantId], references: [id])
  type        ReportType // DAILY | WEEKLY
  data        Json       // data laporan lengkap
  sentAt      DateTime   @default(now())
}

// Setting per tenant
model TenantSetting {
  id              String  @id @default(cuid())
  tenantId        String  @unique
  tenant          Tenant  @relation(fields: [tenantId], references: [id])
  telegramChatId  String  // chat ID telegram klien
  telegramBotToken String // bot token telegram
  openaiApiKey    String  // API key OpenAI klien
  articlesPerDay  Int     @default(1)
  imageStyle      String  @default("professional photography")
  targetKeywords  String[] // keyword utama untuk GEO
}

enum CmsType     { WORDPRESS LARAVEL }
enum Role        { SUPERUSER ADMIN VIEWER }
enum ArticleStatus { DRAFT PUBLISHED FAILED PENDING }
enum ReportType  { DAILY WEEKLY }
```

---

## LANGKAH EKSEKUSI (Urutan Build)

### FASE 1 — Setup & Database
```
Langkah 1: Install dependencies semua apps
Langkah 2: Setup PostgreSQL via Docker
Langkah 3: Jalankan prisma migrate
Langkah 4: Seed superuser default
Langkah 5: Verifikasi koneksi DB
```

### FASE 2 — Backend API
```
Langkah 6:  Auth system (login, JWT, middleware tenant isolation)
Langkah 7:  CRUD Tenant (superuser only)
Langkah 8:  CRUD User per tenant
Langkah 9:  Generator artikel (OpenAI GPT-4o)
Langkah 10: Generator gambar (DALL-E 3)
Langkah 11: Publisher WordPress (WP REST API)
Langkah 12: Publisher Laravel (kirim ke endpoint laravel-api package)
Langkah 13: Scheduler (node-cron, baca Schedule dari DB)
Langkah 14: Reporter Telegram (harian)
Langkah 15: Reporter Telegram (mingguan + ranking + kompetitor)
Langkah 16: Crawler cek ranking Google (DataForSEO API)
Langkah 17: Crawler cek visibilitas ChatGPT
```

### FASE 3 — Frontend Dashboard
```
Langkah 18: Layout dashboard + navigasi
Langkah 19: Halaman login (superuser & tenant)
Langkah 20: Halaman manajemen tenant (superuser)
Langkah 21: Halaman artikel (list, preview, status)
Langkah 22: Halaman generate artikel manual
Langkah 23: Halaman jadwal (buat/edit/hapus schedule)
Langkah 24: Halaman setting tenant (API keys, Telegram, dll)
Langkah 25: Halaman laporan & analitik
```

### FASE 4 — Laravel Package
```
Langkah 26: Buat Laravel package seo-geo-receiver
Langkah 27: Endpoint POST /api/seo/posts (terima artikel dari tools)
Langkah 28: Endpoint GET /api/seo/status (health check)
Langkah 29: Dokumentasi instalasi untuk klien Laravel
```

### FASE 5 — Finalisasi
```
Langkah 30: Testing end-to-end
Langkah 31: Build production
Langkah 32: Panduan deploy ke subdomain
```

---

## ENVIRONMENT VARIABLES

```env
# apps/api/.env

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/seogeo"

# JWT
JWT_SECRET="ganti-dengan-string-random-panjang"
JWT_EXPIRES_IN="7d"

# Superuser default (seed)
SUPERUSER_EMAIL="admin@yourdomain.com"
SUPERUSER_PASSWORD="ganti-password-kuat"

# Server
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

> CATATAN: API key OpenAI dan Telegram disimpan per-tenant di database (TenantSetting),
> bukan di .env global. Ini agar setiap klien pakai key mereka sendiri.

---

## ATURAN PENTING SISTEM

### Tenant Isolation (WAJIB)
- Setiap request dari user tenant harus difilter by `tenantId`
- User dengan role ADMIN/VIEWER TIDAK BOLEH akses data tenant lain
- Middleware `requireTenant` harus dipasang di semua route tenant
- Superuser bisa akses semua tanpa filter tenantId

### Format API Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operasi berhasil",
  "pagination": { "page": 1, "limit": 10, "total": 100 }
}
```

### Format Error Response
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Kamu tidak memiliki akses ke resource ini"
}
```

---

## ALUR GENERATE ARTIKEL

```
1. Scheduler/Manual trigger
2. Ambil TenantSetting (keywords, bahasa, style)
3. Kirim ke GPT-4o dengan prompt template:
   - Topik berdasarkan keyword
   - Bahasa: id/en
   - Format: judul + konten HTML + excerpt + saran keyword
   - Panjang: 1500-2500 kata
   - Struktur SEO: H2, H3, FAQ section di akhir
   - GEO-friendly: statistik, data spesifik, answer-format
4. Parse response → simpan ke DB (status: DRAFT)
5. Generate gambar DALL-E 3 berdasarkan judul artikel
6. Upload gambar ke CMS (media library)
7. Publish artikel ke CMS (status: PUBLISHED)
8. Catat hasil ke Report
9. Kirim notifikasi Telegram
```

---

## PROMPT TEMPLATE ARTIKEL (GPT-4o)

```
Kamu adalah penulis konten SEO dan GEO profesional.

Tulis artikel tentang: {topic}
Bahasa: {language}
Target keyword: {keywords}
Panjang: 1500-2500 kata

Format output JSON:
{
  "title": "judul artikel",
  "content": "konten HTML lengkap dengan H2, H3",
  "excerpt": "ringkasan 150 karakter",
  "suggestedKeywords": ["keyword1", "keyword2"],
  "imagePrompt": "prompt untuk DALL-E membuat gambar header"
}

Aturan konten:
- Gunakan data statistik dan angka spesifik
- Tambahkan section FAQ di akhir (min 3 pertanyaan)
- Tulis dalam format yang mudah dijawab AI search
- Gunakan bahasa natural dan conversational
- Setiap H2 harus bisa berdiri sebagai jawaban mandiri
- Cantumkan kesimpulan yang actionable
```

---

## ALUR LAPORAN TELEGRAM

### Laporan Harian:
```
✅ LAPORAN HARIAN — {tanggal}
Website: {nama tenant}

📝 Artikel dipublikasi: {jumlah}
  • {judul artikel 1} → {link}
  • {judul artikel 2} → {link}

⚠️ Gagal: {jumlah} artikel
❌ Error: {deskripsi error jika ada}

🕐 Jadwal berikutnya: {waktu}
```

### Laporan Mingguan:
```
📊 LAPORAN MINGGUAN — {tanggal awal} s/d {tanggal akhir}
Website: {nama tenant} ({domain})

📝 KONTEN MINGGU INI
• Total artikel: {jumlah}
• Berhasil publish: {jumlah}
• Gagal: {jumlah}

🔍 STATUS GOOGLE RANKING
• Keyword "{keyword}": Posisi #{posisi} (naik/turun {delta})
• Keyword "{keyword}": Posisi #{posisi}
• Halaman 1 Google: {ya/belum}

🤖 STATUS AI SEARCH (ChatGPT/Gemini)
• Muncul di ChatGPT: {ya/belum}
• Muncul di Perplexity: {ya/belum}

🏆 ANALISA KOMPETITOR
• Kompetitor #1: {domain} — {jumlah artikel minggu ini}
• Kompetitor #2: {domain} — posisi keyword {keyword}
• Peluang: {rekomendasi singkat}

📈 TREN
• Traffic estimasi: {naik/turun} {persen}%
• Domain Authority: {nilai}
```

---

## WORDPRESS REST API — FORMAT POSTING

```
POST {cmsUrl}/wp-json/wp/v2/posts
Authorization: Basic {base64(username:app_password)}
Content-Type: application/json

{
  "title": "Judul Artikel",
  "content": "<html content>",
  "excerpt": "Ringkasan artikel",
  "status": "publish",
  "categories": [1],
  "tags": [],
  "featured_media": {media_id}  ← upload gambar dulu, ambil ID-nya
}

Upload gambar:
POST {cmsUrl}/wp-json/wp/v2/media
Authorization: Basic {base64(username:app_password)}
Content-Type: image/jpeg
Content-Disposition: attachment; filename="artikel-gambar.jpg"
{binary image data}
```

---

## LARAVEL API — FORMAT ENDPOINT (packages/laravel-api)

```
// Route yang harus ada di Laravel klien setelah install package:

POST /api/seo/posts
Headers: Authorization: Bearer {token}
Body: {
  "title": "string",
  "content": "string (HTML)",
  "excerpt": "string",
  "image_url": "string",
  "keywords": ["array"],
  "status": "published|draft",
  "published_at": "ISO datetime"
}

Response: {
  "success": true,
  "post_id": 123,
  "post_url": "https://domain.com/slug-artikel"
}

GET /api/seo/health
Response: {
  "status": "ok",
  "cms": "laravel",
  "version": "1.0.0"
}
```

---

## VERIFICATION PLAN

Setelah semua langkah selesai, verifikasi:

1. `node --version`, `npm --version`, `psql --version`
2. `npx prisma studio` → cek tabel terbuat
3. Health check: `curl http://localhost:4000/health`
4. Login superuser: `POST /api/auth/login`
5. Create tenant test: `POST /api/tenants`
6. Generate artikel manual: `POST /api/generate/article`
7. Cek artikel masuk DB dengan status PUBLISHED
8. Cek pesan Telegram terkirim
9. Frontend: `http://localhost:3000` → login berhasil
10. Frontend: buat jadwal → verifikasi cron berjalan

---

## OUTPUT LAPORAN AKHIR

```
===== LAPORAN SEO/GEO TOOLS =====
Status: READY / PARTIAL / FAILED
Backend API: ✅/❌ (port 4000)
Frontend Dashboard: ✅/❌ (port 3000)
Database: ✅/❌
Scheduler: ✅/❌
Telegram Reporter: ✅/❌
WordPress Publisher: ✅/❌
Laravel Package: ✅/❌
=================================
```
