# 🛠️ Panduan Solusi Permanen: Jadwal Artikel Jam 8 Pagi Otomatis (Hostinger)

Panduan ini menjelaskan penyebab mengapa jadwal sempat terhenti dan langkah perbaikan **multi-layer anti-gagal** agar artikel di seluruh website klien (Bali Phone Repair, Pros Bali, dll) **100% selalu terbit otomatis setiap jam 08:00 pagi**, sekalipun server backend Hostinger sempat tertidur atau dimatikan oleh sistem.

---

## 1. Mengapa Masalah Ini Sempat Terulang?

1. **Karakteristik Shared / Cloud Hosting Hostinger (CloudLinux LVE)**:
   - Hostinger memiliki pembatas proses background (*process reaper*). Proses daemon Node.js yang berjalan terus-menerus (seperti `pm2` atau `node`) secara berkala dihentikan otomatis oleh Hostinger setelah beberapa jam tidak aktif atau saat pemeliharaan server tengah malam.
   - Penjadwal lama mengandalkan `node-cron` yang hidup **di dalam memori Node.js**. Ketika proses Node.js dimatikan oleh Hostinger di malam hari, penjadwal jam 8 pagi ikut mati.
2. **Kelemahan Gateway API Sebelumnya**:
   - Jika service port 4000 mati, pemicu eksternal via URL (`api-bridge.php`) langsung membalas `502 Bad Gateway` dan menyerah tanpa mencoba menghidupkan backend atau mengeksekusi artikel secara langsung.

---

## 2. Solusi Permanen yang Telah Diterapkan

Kami telah membangun arsitektur **3 Lapis Perlindungan (Triple Redundancy)**:

1. **Lapis 1: Standalone Runner Mandiri (`standalone-runner.js` & `cron-daily.sh`)**:
   - Dibuat script CLI khusus yang **tidak butuh PM2 atau port 4000 berjalan 24 jam**.
   - Ketika dijalankan jam 08:00 pagi, script langsung membuka koneksi ke database Supabase, memanggil AI Gemini, menerbitkan artikel ke website WordPress/Laravel, mengirim notifikasi Telegram, dan langsung selesai (*clean exit*). Hostinger tidak akan pernah membunuh proses ini karena berjalan on-demand!
   - Dilengkapi proteksi anti-dobel: jika hari ini artikel sudah berhasil terbit, eksekusi berikutnya di hari yang sama akan otomatis dilewati (*skip*).
2. **Lapis 2: Self-Healing Gateway (`api-bridge.php`)**:
   - File jembatan PHP sekarang pintar: jika ada panggilan ke endpoint `/api/schedules/runner` sementara port 4000 sedang mati, PHP akan **langsung mengeksekusi runner artikel secara mandiri** melalui CLI dan serentak membangunkan backend Node.js untuk kebutuhan dashboard!
3. **Lapis 3: Pemicu Eksternal Web-Cron (Cadangan Tambahan)**:
   - Dapat dipicu dari luar menggunakan layanan gratis seperti [cron-job.org](https://cron-job.org) sehingga tidak 100% bergantung pada cron internal hosting.

---

## 3. Langkah Update di Server Hostinger (SSH)

Jalankan perintah berikut di terminal SSH Hostinger Anda (cukup copy-paste 1 blok ini):

```bash
cd ~/seo-geo-tools
git pull origin main
chmod +x cron-daily.sh keep-alive.sh deploy-hostinger.sh

# Salin api-bridge.php terbaru ke public_html agar web & web-cron aktif
find ~ -name "api-bridge.php" -path "*/public_html/*" -exec cp ~/seo-geo-tools/apps/dashboard/public/api-bridge.php {} \;

# Jalankan keep-alive untuk memastikan backend langsung aktif
bash ~/seo-geo-tools/keep-alive.sh
```

---

## 4. Pengaturan Cron di hPanel Hostinger (KUNCI AGAR TIDAK PERNAH OFFLINE)

Buka **hPanel Hostinger** -> Menu **Tingkat Lanjut (Advanced)** -> **Cron Jobs** -> Pilih **Kustom (Custom)**:

### A. Cron Keep-Alive Port 4000 (WAJIB: Agar Dashboard Selalu Aktif & Anti-502)
Karena Hostinger secara berkala mematikan proses background/PM2 saat server idle atau maintenance, Cron ini bertugas mengecek port 4000 setiap 1-2 menit dan langsung menghidupkannya otomatis jika mati:
- **Perintah (Command)**:
  ```bash
  bash ~/seo-geo-tools/keep-alive.sh > /dev/null 2>&1
  ```
- **Waktu**: Pilih **Setiap Menit** (`* * * * *`) atau **Setiap 2 Menit** (`*/2 * * * *`)

### B. Cron Pemicu Artikel Harian (WAJIB)
- **Perintah (Command)**:
  ```bash
  bash ~/seo-geo-tools/cron-daily.sh > ~/seo-geo-tools/cron-daily.log 2>&1
  ```
- **Waktu Jam 08:00 Pagi WITA**:
  - Menit: `0`
  - Jam: `0` *(Karena 00:00 UTC = 08:00 WITA)*
  - Hari, Bulan, Hari Kerja: `*`

> 💡 **Trik Anti-Meleset**: Sistem kami sudah memiliki proteksi **1 Hari = 1 Artikel**. Jika Anda ingin 1000% aman dari selisih jam server, Anda bahkan bisa menyetel cron berjalan **Setiap Jam** (`0 * * * *`). Begitu jam 8 pagi lewat, artikel langsung terbit, dan jam-jam berikutnya otomatis di-skip karena proteksi anti-dobel!

---

## 5. Cadangan Eksternal Gratis (cron-job.org)

Untuk kepastian mutlak tanpa bergantung pada pengaturan server Hostinger, Anda bisa memasang Web-Cron gratis di [cron-job.org](https://cron-job.org):
- **URL**:
  ```
  https://seo.baliphonerepair.com/api/schedules/runner?secret=seogeo-cron-token-secret
  ```
- **Jadwal**: Setiap hari jam `08:00`
- **Timezone**: Pilih langsung `Asia/Makassar` (WITA, UTC+8) atau `Asia/Jakarta` (WIB, UTC+7) di dropdown situsnya.
- Berkat update `api-bridge.php` terbaru, endpoint ini akan langsung mengeksekusi penerbitan artikel secara otomatis meskipun service backend port 4000 di Hostinger sedang dimatikan!

