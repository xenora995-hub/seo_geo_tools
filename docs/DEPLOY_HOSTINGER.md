# 🛠️ Panduan Menjaga Backend & Scheduler Tetap Hidup di Hostinger

Panduan ini untuk memastikan backend Express API dan penjadwalan otomatis (**Scheduler Jam 8 Pagi**) selalu berjalan tepat waktu dan tanggal artikel **100% otomatis mengikuti tanggal hari ini** di hosting Hostinger.

---

## 1. Penjelasan Mengapa Tanggalnya Tetap Tanggal 6 Kemarin

1. **Artikel yang Tampil di Website Masih Artikel Uji Coba Kemarin (6 September)**:
   - Tadi pagi service backend Node.js (`seogeo-api`) di Hostinger sempat tertidur/mati (502 Bad Gateway), sehingga robot belum sempat melakukan generate otomatis untuk tanggal 7. Artikel teratas yang terlihat adalah artikel kemarin sore yang waktu publish-nya di-format ke `08:00:00`.
2. **Penyelarasan Zona Waktu Kalender (Asia/Makassar / WITA)**:
   - Server Hostinger menggunakan waktu UTC/Eropa. Di kode sebelumnya, pengambilan tanggal artikel menggunakan waktu bawaan server, sehingga jika ada selisih jam maka tanggalnya bisa tertinggal 1 hari dari kalender lokal Bali.
   - **Kini sudah diperbaiki total:** Tanggal artikel, tanggal publish CMS Laravel, dan Schema JSON-LD sekarang dikunci secara absolut menggunakan zona waktu tenant (`Asia/Makassar` / WITA). Hari ini akan selalu tercatat tanggal 7, besok tanggal 8, lusa tanggal 9, dan seterusnya secara otomatis!

---

## 2. Langkah Update di Server Hostinger (SSH)

Buka terminal SSH Hostinger Anda, lalu jalankan perintah berikut:

```bash
cd ~/seo-geo-tools
git pull origin main
cd apps/api
npm run build
pm2 restart seogeo-api || pm2 start dist/index.js --name seogeo-api
pm2 save
```

Beri izin eksekusi script keep-alive:
```bash
chmod +x ~/seo-geo-tools/keep-alive.sh
```

---

## 3. Pengaturan Cron di hPanel Hostinger (2 Cron Saja)

Buka **hPanel Hostinger** -> Masuk menu **Advanced (Tingkat Lanjut)** -> **Cron Jobs** -> Pilih **Custom**:

### Cron 1: Penjaga Hidup Otomatis (Setiap 5 Menit)
Memastikan backend API tidak pernah mati. Jika mati, script ini akan langsung menghidupkannya kembali dalam hitungan detik.
- **Perintah (Command)**:
  ```bash
  bash ~/seo-geo-tools/keep-alive.sh > /dev/null 2>&1
  ```
- **Waktu**: Pilih `Setiap 5 menit` (`*/5 * * * *`).

### Cron 2: Pemicu Eksekusi Jam 8 Pagi (Safety Net)
Cadangan pemicu otomatis setiap jam 08:00 pagi:
- **Perintah (Command)**:
  ```bash
  curl -s "https://seo.baliphonerepair.com/api/schedules/runner?secret=seogeo-cron-token-secret" > /dev/null 2>&1
  ```
- **Waktu**: Setiap hari jam 08:00 pagi (`0 8 * * *`).
  - Menit: `0`
  - Jam: `8`
  - Hari, Bulan, Hari Kerja: `*`

---

## 4. Cara Menjalankan Artikel Tanggal Hari Ini (Jika Ingin Diterbitkan Sekarang)

1. Buka dashboard: `https://seo.baliphonerepair.com/dashboard/schedules`
2. Klik tombol **⚡ Jalankan** pada jadwal website Anda.
3. Robot AI akan langsung menulis artikel dengan tanggal hari ini (`2026-09-07 08:00:00`) dan otomatis tayang di website serta notifikasi dikirim ke Telegram!
