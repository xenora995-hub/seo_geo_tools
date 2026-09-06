# 🛠️ Panduan Menjaga Backend & Scheduler Tetap Hidup di Hostinger

Panduan ini untuk memastikan backend Express API dan penjadwalan otomatis (**Scheduler Jam 8 Pagi**) tidak pernah mati di hosting Hostinger (hPanel / Shared / Cloud).

---

## 1. Penyebab Masalah Tadi Pagi

1. **Service Backend Node.js Mati (502 Bad Gateway)**:
   - Pada shared hosting Hostinger, proses background `pm2` atau `node` sering dimatikan oleh sistem saat terminal SSH ditutup atau saat server idle / reboot otomatis.
   - Karena `node-cron` berjalan di dalam memori proses Node.js, saat proses Node.js mati, jadwal otomatis tidak dapat dieksekusi.
2. **Kendala Pengecekan Tanggal Mulai (startDate)**:
   - Tanggal mulai jadwal tersimpan dalam UTC (`2026-09-06T00:00:00.000Z`) yang bertepatan tepat dengan jam 08:00:00 WITA. Sedikit selisih milidetik waktu server menyebabkan pengecekan `now < schedule.startDate` menganggap jadwal belum saatnya jalan. *(Ini sudah diperbaiki ke perbandingan kalender zona waktu `YYYY-MM-DD`)*.

---

## 2. Langkah Solusi & Restart di Server Hostinger

Buka terminal SSH Hostinger Anda, lalu jalankan perintah berikut:

### Langkah A: Update Kode Terbaru dari Git
```bash
cd ~/seo-geo-tools
git pull origin main
cd apps/api
npm run build
```

### Langkah B: Jalankan & Kunci PM2
```bash
# Jalankan service API
pm2 start dist/index.js --name seogeo-api

# Simpan state PM2 agar tercatat
pm2 save
```

---

## 3. Pasang Keep-Alive & External Cron di hPanel Hostinger (PENTING!)

Agar proses Node.js **tidak pernah mati lagi** dan jika sempat mati otomatis dihidupkan kembali, pasang cron job di Hostinger:

1. Buka **hPanel Hostinger** -> Masuk ke menu **Advanced** -> **Cron Jobs**.
2. Pilih jenis: **Custom**.

### Cron 1: Penjaga Hidup PM2 (Setiap 5 Menit)
- **Command**:
  ```bash
  pgrep -f "seogeo-api" > /dev/null || (cd ~/seo-geo-tools/apps/api && npx pm2 resurrect || pm2 start dist/index.js --name seogeo-api)
  ```
- **Interval**: Pilih `Every 5 minutes` (`*/5 * * * *`).

### Cron 2: Safety Net Runner Jam 8 Pagi (Cadangan Eksekusi Otomatis)
Jika Anda ingin kepastian 100% tanpa takut Node.js tertidur, gunakan endpoint runner baru yang sudah kita buat:
- **Command**:
  ```bash
  curl -s "https://seo.baliphonerepair.com/api/schedules/runner?secret=seogeo-cron-token-secret" > /dev/null 2>&1
  ```
- **Interval**: Setiap hari jam 08:00 pagi (`0 8 * * *`).

---

## 4. Cara Menjalankan Artikel yang Tertinggal Tadi Pagi

Untuk langsung membuat artikel yang tadi pagi terlewat:
1. Buka dashboard: `https://seo.baliphonerepair.com/dashboard/schedules`
2. Klik tombol **Trigger (ikon petir / jalankan)** di samping jadwal Anda.
3. Artikel akan langsung di-generate oleh AI dan di-publish ke CMS website Anda serta dikirim ke Telegram!
