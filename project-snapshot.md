# Project Snapshot: SEO/GEO Tools Platform

## 1. Directory Tree

```
seo-geo-tools/
├── CLAUDE.md
├── docker-compose.yml
├── package.json
├── package-lock.json
├── test-api.js
├── test-api2.js
├── test-auto-gap.js
├── test-content-gap.js
├── test-login.js
├── apps/
│   ├── api/
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── check-users.js
│   │   ├── download_ddg.js
│   │   ├── package.json
│   │   ├── scratch.ts
│   │   ├── test_scraper.js
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── index.ts
│   │       ├── seed.ts
│   │       ├── article/
│   │       │   └── router.ts
│   │       ├── auth/
│   │       │   ├── middleware.ts
│   │       │   └── router.ts
│   │       ├── crawler/
│   │       │   ├── chatgpt.ts
│   │       │   ├── google.ts
│   │       │   └── router.ts
│   │       ├── generator/
│   │       │   ├── content-gap-ai.ts
│   │       │   ├── router.ts
│   │       │   └── service.ts
│   │       ├── lib/
│   │       │   └── prisma.ts
│   │       ├── publisher/
│   │       │   ├── blogger.ts
│   │       │   ├── indexer.ts
│   │       │   ├── laravel.ts
│   │       │   └── wordpress.ts
│   │       ├── report/
│   │       │   └── router.ts
│   │       ├── reporter/
│   │       │   └── telegram.ts
│   │       ├── routes/
│   │       │   ├── backlinks.ts
│   │       │   ├── content-gap.ts
│   │       │   ├── keywords.ts
│   │       │   ├── local-listing.ts
│   │       │   ├── niche-finder.ts
│   │       │   ├── rank-tracker.ts
│   │       │   ├── scraper.ts
│   │       │   ├── seo-writing.ts
│   │       │   └── site-audit.ts
│   │       ├── scheduler/
│   │       │   ├── cron.ts
│   │       │   └── router.ts
│   │       ├── telegram/
│   │       │   └── bot.ts
│   │       ├── tenant/
│   │       │   ├── router.ts
│   │       │   └── settingsRouter.ts
│   │       └── user/
│   │           └── router.ts
│   └── dashboard/
│       ├── .env.local
│       ├── next.config.js
│       ├── next-env.d.ts
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── src/
│           ├── app/
│           │   ├── globals.css
│           │   ├── layout.tsx
│           │   ├── page.tsx
│           │   ├── login/
│           │   │   └── page.tsx
│           │   └── dashboard/
│           │       ├── layout.tsx
│           │       ├── page.tsx
│           │       ├── articles/page.tsx
│           │       ├── backlinks/page.tsx
│           │       ├── client-reports/page.tsx
│           │       ├── content-gap/page.tsx
│           │       ├── generate/page.tsx
│           │       ├── keyword-research/page.tsx
│           │       ├── local-listing/page.tsx
│           │       ├── niche-finder/page.tsx
│           │       ├── rank-tracker/page.tsx
│           │       ├── reports/page.tsx
│           │       ├── schedules/page.tsx
│           │       ├── seo-writing/page.tsx
│           │       ├── settings/page.tsx
│           │       ├── site-audit/page.tsx
│           │       ├── tenants/page.tsx
│           │       └── users/page.tsx
│           └── lib/
│               └── api.ts
├── docs/
│   ├── DEPLOYMENT_GUIDE.md
│   ├── SETUP.md
│   ├── USER_MANUAL.md
│   └── USER_MANUAL.pdf
└── packages/
    └── laravel-api/
        ├── composer.json
        ├── README.md
        ├── config/
        │   └── seo-receiver.php
        └── src/
            ├── SeoGeoReceiverServiceProvider.php
            ├── Http/Controllers/
            │   └── SeoPostController.php
            └── routes/
                └── api.php
```

---

## 2. Tech Stack Summary

- **Backend:** Node.js (TypeScript via `tsx`), Express.js (`4.18.2`), Prisma ORM (`5.10.0`), `node-cron` (`3.0.3`), Telegraf (`4.16.3`).
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React icons, Axios.
- **Database:** PostgreSQL 15 (Supabase connection pooler, isolated in `seogeo` schema).
- **AI Models:**
  - **Text:** Google Gemini `gemini-2.5-flash` (`@google/generative-ai`).
  - **Images:** Pollinations AI (Flux engine, zero API key requirement).
- **External APIs:**
  - WordPress REST API (`/wp-json/wp/v2/posts`, `/media`).
  - Google Indexing API (`googleapis` v3).
  - Google Blogger API v3.
  - Telegram Bot API.
  - DataForSEO SERP API + DuckDuckGo HTML scraper fallback.
- **Client Package:** Laravel ServiceProvider & Controller (`packages/laravel-api`).

---

## 3. File Index & Condensed Logic

### Root & Operational Files
- `CLAUDE.md`: System specification and roadmap for Antigravity IDE.
- `docker-compose.yml`: Multi-container configuration for PostgreSQL, API, and Dashboard.
- `test-auto-gap.js`: Test script for automated Content Gap generation pipeline.
- `test-api.js` / `test-api2.js`: Test calls to local Express API endpoints.
- `test-content-gap.js`: Tests competitor gap evaluation endpoint.
- `test-login.js`: Validates JWT auth endpoint logic.

### Backend: `apps/api/src`
- `index.ts`: Bootstraps Express on port 4000, registers all routes, launches cron scheduler and Telegram bots, provides root `GET /` status.
- `seed.ts`: Seeds initial superuser account (`admin@seogeo.com`).
- `lib/prisma.ts`: Exports global Prisma client singleton.
- `auth/middleware.ts`: Authenticates JWT tokens and enforces tenant isolation (`tenantId` scoping).
- `auth/router.ts`: Handles login, password hashing (bcrypt), and profile retrieval.
- `article/router.ts`: CRUD endpoints for generated articles with preview and manual publish actions.
- `generator/service.ts`: Orchestrates article generation with Gemini 2.5 Flash, Pollinations AI image generation, multi-CMS dispatch, and Google Indexing API ping.
- `generator/content-gap-ai.ts`: Calls Gemini to identify competitor topics winning ChatGPT recommendations.
- `generator/router.ts`: Exposes `POST /api/generate/article` for on-demand article generation.
- `publisher/wordpress.ts`: Uploads featured image to `/wp/v2/media` and posts HTML content via WordPress REST API with backdate support.
- `publisher/laravel.ts`: Dispatches article payload to client's `/api/seo/posts` endpoint with Bearer auth.
- `publisher/blogger.ts`: Authenticates via Google Service Account and posts content via Blogger API v3.
- `publisher/indexer.ts`: Pings Google Indexing API (`URL_UPDATED`) for instant crawling.
- `scheduler/cron.ts`: Timezone-aware cron runner with jitter delays (1–30s) and 5-minute auto-retry on failure.
- `scheduler/router.ts`: CRUD management for scheduled posting jobs.
- `reporter/telegram.ts`: Compiles daily (23:00) and weekly (Sun 08:00) summaries sent via Telegram bot.
- `telegram/bot.ts`: Command center bot handling `/tulis <topik>` and `/tambah_blog` commands.
- `crawler/google.ts`: Checks SERP rankings via DataForSEO or throttled DuckDuckGo scraping.
- `crawler/chatgpt.ts`: Evaluates probability of brand mention in AI Search responses.
- `crawler/router.ts`: Endpoints to trigger rank and AI visibility audits.
- `routes/content-gap.ts`: Compares domain against competitors to find missing topics.
- `routes/keywords.ts`: Keyword research and search volume analysis endpoint.
- `routes/rank-tracker.ts`: Manages rank tracking projects and historic keyword positions.
- `routes/site-audit.ts`: Technical website health check and SEO audit endpoint.
- `routes/backlinks.ts`: Identifies AI citation and high-DR backlink opportunities with step-by-step tutorials.
- `routes/local-listing.ts`: Manages Google Business Profile and local directory citations.
- `routes/seo-writing.ts`: In-memory algorithmic SEO and readability scoring engine.
- `routes/niche-finder.ts`: AI-powered AdSense and affiliate micro-niche discovery.
- `routes/scraper.ts`: Scrapes target site HTML for metadata and topic modeling.
- `tenant/router.ts`: Superuser CRUD for client tenants.
- `tenant/settingsRouter.ts`: Manages per-tenant API keys (Gemini, Telegram, CMS, Indexing).
- `user/router.ts`: Tenant-scoped user management.
- `prisma/schema.prisma`: Data models (`Tenant`, `User`, `Article`, `Schedule`, `Report`, `TenantSetting`, `Keyword`, `RankTrackingProject`, `RankHistory`, `SiteAuditReport`, `BacklinkProfile`, `LocalListingProfile`, `SeoWritingDocument`, `ClaimedNiche`, `GeoBacklinkTask`).

### Frontend: `apps/dashboard/src`
- `app/layout.tsx`: Root HTML layout with fonts and metadata.
- `app/globals.css`: Tailwind CSS styling and theme definitions.
- `app/page.tsx`: Redirects authenticated users to dashboard or guests to `/login`.
- `app/login/page.tsx`: Sign-in interface supporting both Superusers and Tenant users.
- `app/dashboard/layout.tsx`: Sidebar shell, tenant selector dropdown, and navigation links.
- `app/dashboard/page.tsx`: Analytics overview (published counts, active schedules, health).
- `app/dashboard/articles/page.tsx`: Paginated article list with status filters and HTML preview modal.
- `app/dashboard/generate/page.tsx`: Form to trigger single manual article generation.
- `app/dashboard/schedules/page.tsx`: Schedule creator with cron expression, date range, and status toggles.
- `app/dashboard/settings/page.tsx`: Tenant credentials setup (Gemini, CMS auth, Telegram keys).
- `app/dashboard/content-gap/page.tsx`: Visual interface for competitor gap analysis.
- `app/dashboard/keyword-research/page.tsx`: Keyword exploration table with CPC and difficulty metrics.
- `app/dashboard/rank-tracker/page.tsx`: SERP position history charts.
- `app/dashboard/site-audit/page.tsx`: Health score report and error/warning breakdown.
- `app/dashboard/backlinks/page.tsx`: AI-suggested link platforms with execution guides.
- `app/dashboard/seo-writing/page.tsx`: Interactive document editor with live SEO density scoring.
- `app/dashboard/niche-finder/page.tsx`: Micro-niche generator with AdSense suitability ratings.
- `app/dashboard/local-listing/page.tsx`: NAP (Name, Address, Phone) citation tracker.
- `app/dashboard/client-reports/page.tsx`: Client-ready performance and traffic report generator.
- `app/dashboard/reports/page.tsx`: Historical log of daily/weekly automated reports.
- `app/dashboard/tenants/page.tsx`: Superuser tenant management page.
- `app/dashboard/users/page.tsx`: User role assignment and credential management.
- `lib/api.ts`: Central Axios client handling JWT storage and request authorization.

### Client Package: `packages/laravel-api`
- `composer.json`: Package manifest (`seogeo/seo-geo-receiver`).
- `config/seo-receiver.php`: Config file for API token and target Post model mapping.
- `src/SeoGeoReceiverServiceProvider.php`: Auto-registers package routes and configs in Laravel.
- `src/Http/Controllers/SeoPostController.php`: Receives inbound articles and persists them into the client database.
- `src/routes/api.php`: Declares `POST /api/seo/posts` and `GET /api/seo/health`.

---

## 4. Config Keys (Masked)

### `apps/api/.env`
```ini
DATABASE_URL="postgresql://[USER]:[PASS]@[SUPABASE_HOST]:6543/postgres?pgbouncer=true&schema=seogeo"
DIRECT_URL="postgresql://[USER]:[PASS]@[SUPABASE_HOST]:5432/postgres?schema=seogeo"
JWT_SECRET="[32_CHAR_SECRET_KEY]"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
SUPERUSER_EMAIL="admin@seogeo.com"
SUPERUSER_PASSWORD="[MASKED]"
```

### `apps/dashboard/.env.local`
```ini
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Stored Per-Tenant in DB (`TenantSetting`)
- `geminiApiKey`: Google Gemini API key.
- `telegramBotToken`: Telegram Bot Father token.
- `telegramChatId`: Target Telegram group/channel ID.
- `googleServiceAccountJson`: Service account JSON for Indexing / Blogger.
- `cmsApiKey`: WordPress Application Password or Laravel Bearer Token.

---

## 5. Article Generation Workflow

```
[1. Trigger]
   ├─ node-cron job fires (Schedule table)
   ├─ Telegram bot receives `/tulis <topic>`
   └─ User clicks "Generate & Publish" on Dashboard (/dashboard/generate)
           │
[2. Topic Resolution]
   ├─ If topic provided: use topic directly
   └─ If no topic: trigger Content Gap AI (`generateContentGapKeywords`) to extract
      missing ChatGPT-favored competitor topics for the tenant domain
           │
[3. AI Content Generation]
   ├─ Gemini 2.5 Flash (`gemini-2.5-flash`) invoked with structured GEO + SEO prompt
   ├─ Enforces 1500–2500 words, H2/H3, data points, conversational answers, 3+ FAQ items
   └─ Output validated as strict JSON (title, content HTML, excerpt, keywords, imagePrompt)
           │
[4. Database Staging]
   └─ Article saved in PostgreSQL with status `PENDING`
           │
[5. Featured Image Creation]
   ├─ Pollinations AI (Flux model) generates image URL based on `imagePrompt`
   └─ Strict negative prompting applied (no humans/faces/hands for photorealism)
           │
[6. CMS Publishing]
   ├─ WordPress: Downloads image -> Uploads to `/wp-json/wp/v2/media` -> Creates post
   ├─ Laravel: Dispatches payload to `/api/seo/posts` via `packages/laravel-api`
   └─ Blogger: Inserts post via Google Blogger API v3
           │
[7. Completion & Indexing]
   ├─ Article updated to status `PUBLISHED` with live `cmsPostUrl`
   ├─ Google Indexing API pinged with `URL_UPDATED` (if `enableAutoIndex` is active)
   └─ Telegram notification dispatched with article title and live URL
```

---

## 6. Target Niches & Sites

1. **Active Primary Tenant:**
   - **Site:** `baliphonerepair.com`
   - **Niche:** Smartphone, iPhone, and Apple hardware repair in Bali (Local GEO & Commercial Search Intent).
2. **Exploration & Scaling:**
   - **High CPC AdSense Niches:** Legal services, insurance, SaaS, and financial tools discovered via `/api/niche-finder/discover`.
   - **Local Business Testing:** `tokosepatu.com` (Leather goods e-commerce in Jakarta).

---

## 7. Implementation Status

### What Works
- Multi-tenant data segregation by `tenantId` across all routes.
- Role-based authorization (`SUPERUSER`, `ADMIN`, `VIEWER`).
- Automated article generation with `gemini-2.5-flash` using GEO & SEO prompt constraints.
- Free automated featured image generation via Pollinations AI (Flux).
- Direct publishing to WordPress (with media upload), Laravel (`seogeo/seo-geo-receiver`), and Blogger.
- Google Instant Indexing API integration.
- Scheduled cron posting with jitter delay (1–30s) and 5-minute failure retry.
- Telegram Command Center bot (`/tulis`) and daily/weekly Telegram performance reports.
- Competitor content gap identification.
- Real-time algorithmic SEO writing analyzer.
- Complete Next.js 14 dark-mode dashboard interface.
- Cloud database connection to Supabase PostgreSQL (`seogeo` schema).

### What's Missing / Incomplete
- **Rank Tracker Live Data:** Currently relies on DataForSEO credentials with DuckDuckGo fallback; requires commercial SERP API key for large-scale production tracking without rate limits.
- **Site Audit Engine:** `/api/site-audit/scan` generates simulated audit scores; needs connection to Google PageSpeed Insights API or Puppeteer crawler for live technical audits.
- **Self-Service Client Signup:** Tenant creation is restricted to Superusers; no automated public checkout/subscription flow.
- **Hosting Production Setup:** Running locally (`localhost:3000`/`4000`); deployment to a VPS (Ubuntu/PM2/Nginx) required for 24/7 background operation.

---

## 8. Example Generated Article Output

```json
{
  "title": "Jasa Service iPhone Terpercaya di Bali: Panduan Lengkap dan Estimasi Biaya 2026",
  "excerpt": "Cari jasa service iPhone terpercaya di Bali? Simak panduan lengkap biaya ganti LCD, baterai, dan tips memilih teknisi bersertifikat di Denpasar & Canggu.",
  "suggestedKeywords": [
    "service iphone bali",
    "ganti lcd iphone denpasar",
    "tempat servis apple canggu",
    "biaya repair iphone bali"
  ],
  "imagePrompt": "a precision electronics repair workspace with a disassembled smartphone screen, specialized screwdrivers, and modern diagnostic tools on a clean wooden workbench",
  "imageUrl": "https://image.pollinations.ai/prompt/a%20precision%20electronics%20repair%20workspace...&width=1280&height=720&nologo=true&seed=849201&model=flux",
  "content": "<p>Memilih <strong>jasa service iPhone di Bali</strong> membutuhkan ketelitian ekstra. Berdasarkan data perbaikan gadget tahun 2025-2026, lebih dari <strong>68% kerusakan iPhone di wilayah tropis seperti Bali</strong> disebabkan oleh kelembapan tinggi, air laut, dan benturan layar.</p>\n\n<h2>Mengapa Memilih Teknisi Spesialis Apple di Bali Sangat Penting?</h2>\n<p>iPhone memiliki arsitektur komponen mikro yang sensitif. Menggunakan suku cadang non-standar sering kali memicu notifikasi peringatan sistem operasi (unknown part warning) pada layar atau baterai. Teknisi profesional menyediakan garansi resmi minimal 30 hingga 90 hari.</p>\n\n<h2>Estimasi Biaya Perbaikan iPhone di Denpasar dan Sekitarnya</h2>\n<ul>\n  <li><strong>Penggantian Layar (LCD/OLED):</strong> Mulai dari Rp 650.000 (seri reguler) hingga Rp 3.200.000 (seri Pro Max).</li>\n  <li><strong>Penggantian Baterai Health 100%:</strong> Mulai dari Rp 350.000 – Rp 850.000.</li>\n  <li><strong>Pembersihan Kerusakan Akibat Air Laut:</strong> Mulai dari Rp 250.000 (ultrasonic cleaning).</li>\n</ul>\n\n<h2>Pertanyaan yang Sering Diajukan (FAQ)</h2>\n<div class=\"faq-section\">\n  <h3>Berapa lama proses service iPhone di Bali?</h3>\n  <p>Untuk pergantian layar dan baterai, pengerjaan express rata-rata memakan waktu 30 hingga 60 menit dan dapat ditunggu di lokasi.</p>\n  \n  <h3>Apakah data di dalam iPhone tetap aman saat diservis?</h3>\n  <p>Ya, teknisi terpercaya tidak memerlukan passcode perangkat untuk penggantian modul fisik seperti layar atau baterai, sehingga privasi data Anda tetap 100% terjaga.</p>\n  \n  <h3>Apakah unit yang terkena air laut masih bisa diselamatkan?</h3>\n  <p>Bisa, asalkan perangkat segera dimatikan dan tidak diisi daya listrik (charging) sebelum dilakukan pembersihan korosi komponen mesin utama.</p>\n</div>"
}
```
