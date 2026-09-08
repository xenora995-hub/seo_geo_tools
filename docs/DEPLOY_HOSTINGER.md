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

Jalankan perintah berikut di terminal SSH Hostinger Anda:

```bash
cd ~/seo-geo-tools
git pull origin main
cd apps/api
npm run build
pm2 restart seogeo-api || pm2 start dist/index.js --name seogeo-api
pm2 save
```

Beri izin eksekusi script:
```bash
chmod +x ~/seo-geo-tools/cron-daily.sh
chmod +x ~/seo-geo-tools/keep-alive.sh
```

---

## 4. Pengaturan Cron di hPanel Hostinger

Buka **hPanel Hostinger** -> Menu **Tingkat Lanjut (Advanced)** -> **Cron Jobs** -> Pilih **Kustom (Custom)**:

### Cron 1: Pemicu Eksekusi Artikel Jam 8 Pagi (WAJIB)
Menjalankan generator artikel mandiri setiap hari jam 08:00 pagi WITA:
- **Perintah (Command)**:
  ```bash
  bash ~/seo-geo-tools/cron-daily.sh > ~/seo-geo-tools/cron-daily.log 2>&1
  ```
- **Waktu**:
  - Menit: `0`
  - Jam: `8` (atau sesuaikan dengan jam server Hostinger jika server menggunakan UTC, misal jam 00:00 UTC = 08:00 WITA)
  - Hari, Bulan, Hari Kerja: `*`

### Cron 2: Penjaga Hidup Dashboard (Setiap 5 atau 10 Menit)
Memastikan dashboard admin selalu siap dibuka tanpa jeda:
- **Perintah (Command)**:
  ```bash
  bash ~/seo-geo-tools/keep-alive.sh > /dev/null 2>&1
  ```
- **Waktu**: Pilih `Setiap 5 menit` (`*/5 * * * *`).

---

## 5. Cadangan Anti-Gagal: Web-Cron Gratis (cron-job.org)

Jika cron internal Hostinger sewaktu-waktu terlambat atau ditunda oleh sistem hosting, Anda bisa menambahkan webhook gratis di [cron-job.org](https://cron-job.org):
- **URL**:
  ```
  https://seo.baliphonerepair.com/api/schedules/runner?secret=seogeo-cron-token-secret
  ```
- **Jadwal**: Setiap hari jam `08:00` (Pilih timezone: `Asia/Makassar` atau `Asia/Singapore` / UTC+8).
- Berkat Lapis 2 (`api-bridge.php`), URL ini akan sukses 100% menerbitkan artikel hari itu meskipun backend Node.js sedang mati!
