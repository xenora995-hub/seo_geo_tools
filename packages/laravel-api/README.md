# SEO/GEO Receiver — Laravel Package (`seogeo/seo-geo-receiver`)

Package resmi Laravel untuk menerima dan mempublikasikan artikel otomatis dari **SEO/GEO Tools**.

---

## 🚀 Fitur Package

- ✅ Endpoint `POST /api/seo/posts` (Menerima artikel SEO & GEO format HTML lengkap)
- ✅ Endpoint `GET /api/seo/health` & `GET /api/seo/status` (Health check otomatis)
- ✅ Support Bearer API Token & Laravel Sanctum
- ✅ Auto-discovery ServiceProvider untuk Laravel 9, 10, dan 11
- ✅ Kompatibel dengan model Post kustom atau standar

---

## 📦 Metode Instalasi

### Opsi A: Instalasi via Composer Path Repository (Rekomendasi)

1. Daftarkan repository lokal di `composer.json` project Laravel Anda:

```json
"repositories": [
    {
        "type": "path",
        "url": "../packages/laravel-api"
    }
]
```

2. Jalankan perintah composer require:

```bash
composer require seogeo/seo-geo-receiver
```

3. (Opsional) Publish file konfigurasi:

```bash
php artisan vendor:publish --tag=seo-receiver-config
```

File konfigurasi akan disalin ke `config/seo-receiver.php`.

---

### Opsi B: Instalasi Manual Tanpa Composer

Jika Anda ingin langsung menempelkan kode ke project Laravel yang sudah berjalan:

1. Buat file `app/Http/Controllers/SeoPostController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Post; // Sesuaikan dengan model Post Anda
use Illuminate\Support\Str;

class SeoPostController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:500',
            'content'      => 'required|string',
            'excerpt'      => 'nullable|string|max:500',
            'image_url'    => 'nullable|url',
            'keywords'     => 'nullable|array',
            'status'       => 'required|in:published,draft',
            'published_at' => 'nullable|date',
        ]);

        $slug = Str::slug($validated['title']);

        $post = Post::create([
            'title'        => $validated['title'],
            'slug'         => $slug,
            'content'      => $validated['content'],
            'excerpt'      => $validated['excerpt'] ?? '',
            'image_url'    => $validated['image_url'] ?? null,
            'meta_keywords'=> implode(', ', $validated['keywords'] ?? []),
            'status'       => $validated['status'],
            'published_at' => $validated['published_at'] ?? now(),
        ]);

        return response()->json([
            'success'  => true,
            'post_id'  => $post->id,
            'post_url' => url('/posts/' . ($post->slug ?? $slug)),
        ]);
    }

    public function health()
    {
        return response()->json([
            'status'  => 'ok',
            'cms'     => 'laravel',
            'version' => '1.0.0',
        ]);
    }
}
```

2. Tambahkan routes di `routes/api.php`:

```php
use App\Http\Controllers\SeoPostController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/seo/posts', [SeoPostController::class, 'store']);
    Route::get('/seo/health', [SeoPostController::class, 'health']);
    Route::get('/seo/status', [SeoPostController::class, 'health']);
});
```

---

## 🔑 Autentikasi & Token API

Generate API Token untuk digunakan sebagai **CMS API Key** di SEO/GEO Tools:

```bash
php artisan tinker
$user = User::first();
$token = $user->createToken('seo-geo-tools')->plainTextToken;
echo $token;
```

---

## ⚙️ Pengaturan di Dashboard SEO/GEO Tools

Pada menu **Kelola Website** atau **Pengaturan**:
- **Tipe CMS**: Pilih `LARAVEL`
- **CMS URL**: `https://websiteanda.com`
- **CMS API Key**: Token Bearer hasil generate tinker di atas
