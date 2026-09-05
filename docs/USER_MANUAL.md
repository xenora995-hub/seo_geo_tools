# Buku Petunjuk & Testing Guide: SEO/GEO Tools

Selamat datang di Panduan Penggunaan dan Testing SEO/GEO Tools. Sistem ini terdiri dari Backend API dan Frontend Dashboard yang sudah terintegrasi untuk manajemen ribuan website/klien secara terpusat (multi-tenant).

Ikuti langkah-langkah di bawah ini untuk menguji seluruh fitur sistem.

---

## 1. Akses Sistem & Login Pertama Kali

Karena sistem sudah berjalan di latar belakang (localhost:3000), Anda bisa langsung mengaksesnya melalui browser.

1. Buka browser dan kunjungi: **http://localhost:3000**
2. Anda akan otomatis diarahkan ke halaman `/login`.
3. Gunakan kredensial **Superuser** berikut untuk masuk:
   - **Email:** `admin@seogeo.com`
   - **Password:** `Admin@2024!`
4. Klik tombol **Login**. Anda akan diarahkan ke Dashboard utama.

---

## 2. Pengaturan Klien / Tenant (Superuser)

Superuser bertugas mengelola tenant (klien/website). Mari kita coba membuat satu klien baru.

1. Di menu sidebar sebelah kiri, klik menu **Tenants**.
2. Klik tombol **+ Add New Tenant**.
3. Masukkan data:
   - **Name:** Toko Sepatu Jakarta
   - **Domain:** tokosepatu.com
4. Klik **Save**. Tenant baru akan muncul di dalam tabel.

### Membuat User untuk Klien Tersebut
1. Buka menu **Users**.
2. Klik **+ Add New User**.
3. Pilih **Tenant**: Toko Sepatu Jakarta.
4. Masukkan **Name**: Admin Sepatu
5. Masukkan **Email**: `admin@tokosepatu.com`
6. Masukkan **Password**: `Sepatu123!`
7. Ubah **Role** menjadi `admin` atau `user`.
8. Klik **Save**. (Akun ini nanti bisa digunakan klien untuk login dan hanya melihat data mereka sendiri).

---

## 3. Konfigurasi API & Integrasi (Tenant Settings)

Agar artikel dapat digenerate dan dikirim ke WordPress/Telegram, sistem membutuhkan API Key.

1. Di menu sidebar, klik **Settings**.
2. Di bagian atas halaman Settings, terdapat **Tenant Switcher** (Pilih "Toko Sepatu Jakarta" atau tenant yang ingin dikonfigurasi).
3. **OpenAI Settings:**
   - Masukkan API Key OpenAI Anda yang valid (dimulai dengan `sk-...`).
   - Pilih AI Model (contoh: `gpt-4o`).
4. **Target CMS Settings:**
   - Pilih jenis CMS (WordPress atau Laravel).
   - Masukkan URL website klien (misal: `https://tokosepatu.com`).
   - Masukkan Username & App Password (jika WordPress) atau Bearer Token (jika Laravel).
5. **Telegram Reporter:**
   - Masukkan **Bot Token** dari BotFather.
   - Masukkan **Chat ID** (Grup Telegram tempat laporan akan dikirim).
6. **SEO/GEO Keywords:**
   - Masukkan kata kunci utama (contoh: `sepatu kulit pria`).
   - Masukkan target lokasi (contoh: `Jakarta Selatan, Jakarta Pusat`).
7. Klik **Save Settings** di paling bawah.

---

## 4. Testing Pembuatan Artikel (Manual)

Mari kita coba membuat satu artikel dengan AI dan mengirimkannya ke website klien.

1. Buka menu **Generate**.
2. Pilih **Tenant** dari dropdown (Toko Sepatu Jakarta).
3. Masukkan **Keyword** spesifik (contoh: `Toko Sepatu Kulit Terbaik di Jakarta Selatan`).
4. (Opsional) Centang **Generate with Image** jika Anda ingin menggunakan DALL-E 3 untuk gambar sampul.
5. Klik **Generate & Publish**.
6. Tunggu loading selesai. Jika berhasil, sistem akan menampilkan notifikasi *Success*.

---

## 5. Melihat Hasil Artikel

Setelah artikel dibuat, Anda bisa melihat hasilnya.

1. Buka menu **Articles**.
2. Anda akan melihat daftar artikel yang baru saja digenerate.
3. Tabel akan menampilkan **Status**: 
   - `PUBLISHED`: Berhasil diposting ke WordPress/Laravel.
   - `FAILED`: Gagal diposting (biasanya karena CMS URL / Password salah).
4. Klik tombol **Preview** (ikon mata) di tabel untuk melihat format HTML artikel tersebut, termasuk tag `<h1>`, `<h2>`, Schema FAQ, dan gambar.

---

## 6. Testing Jadwal Otomatis (Scheduler)

Sistem ini bisa membuat artikel secara otomatis berdasarkan jadwal yang ditentukan.

1. Buka menu **Schedules**.
2. Klik **+ Add Schedule**.
3. Pilih **Tenant** yang diinginkan.
4. Masukkan **Cron Expression**:
   - Untuk setiap hari jam 9 pagi: `0 9 * * *`
   - Untuk setiap 1 jam sekali (testing): `0 * * * *`
5. Atur **Status** menjadi `active`.
6. Klik **Save**.
7. *Sistem node-cron di background API (port 4000) akan secara otomatis menjalankan proses pembuatan artikel sesuai jadwal ini menggunakan data keywords & cities yang ada di Settings.*

---

## 7. Testing Laporan & Ranking (Reports)

Sistem memantau posisi SERP Google dan visibilitas di AI (ChatGPT / Perplexity).

1. Buka menu **Reports**.
2. Di halaman ini terdapat tabel **Live Keyword Rankings**:
   - Menampilkan keyword, ranking saat ini di Google, dan perubahan ranking (naik/turun).
3. Anda juga akan melihat kotak metrik **AI Search Visibility** (Contoh: "85% - ChatGPT").
4. **Kirim Laporan Manual ke Telegram**:
   - Jika pengaturan Telegram di Settings sudah diisi, klik tombol **Trigger Weekly Report**.
   - Sistem akan mengkompilasi data performa minggu ini dan mengirimkan pesan ke Grup Telegram Anda.

---

## Tips Tambahan
- **Melihat Log Background**: Jika Anda ingin melihat log asli sistem di terminal, sistem API saat ini berjalan dengan perintah `node dist/index.js` (port 4000). Semua error API OpenAI atau WordPress akan tercatat di log tersebut.
- **Isolasi Data**: Jika Anda logout, kemudian login menggunakan akun klien (misal: `admin@tokosepatu.com`), menu *Tenants* tidak akan muncul, dan data *Articles/Schedules* yang tampil HANYA milik Toko Sepatu Jakarta. 

Selamat mencoba! Jika menemukan kendala pada integrasi (misal: gagal publish), cek kembali URL dan kredensial API pada menu Settings.
