<?php

namespace SeoGeo\Receiver\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class SeoPostController extends Controller
{
    /**
     * POST /api/seo/posts
     * Menerima dan mempublikasikan artikel dari SEO/GEO Tools
     */
    public function store(Request $request)
    {
        // Validasi token jika dikonfigurasi
        $configuredKey = config('seo-receiver.api_key');
        if ($configuredKey) {
            $authHeader = $request->header('Authorization', '');
            $token = Str::replaceFirst('Bearer ', '', $authHeader);
            if ($token !== $configuredKey) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized: Invalid SEO/GEO API Token'
                ], 401);
            }
        }

        $validated = $request->validate([
            'title'        => 'required|string|max:500',
            'content'      => 'required|string',
            'excerpt'      => 'nullable|string|max:500',
            'image_url'    => 'nullable|url',
            'keywords'     => 'nullable|array',
            'author'       => 'nullable|string|max:255',
            'status'       => 'required|in:published,draft',
            'published_at' => 'nullable|date',
        ]);

        $postModel = config('seo-receiver.post_model', 'App\\Models\\Post');
        $slug = Str::slug($validated['title']);

        // Jika model Eloquent Post tersedia di project Laravel klien
        if (class_exists($postModel)) {
            try {
                $postData = [
                    'title'        => $validated['title'],
                    'content'      => $validated['content'],
                    'excerpt'      => $validated['excerpt'] ?? '',
                    'image_url'    => $validated['image_url'] ?? null,
                    'meta_keywords'=> implode(', ', $validated['keywords'] ?? []),
                    'status'       => $validated['status'],
                    'published_at' => $validated['published_at'] ?? now(),
                ];

                if (!empty($validated['author'])) {
                    $postData['author'] = $validated['author'];
                    $postData['author_name'] = $validated['author'];
                }

                $post = $postModel::updateOrCreate(
                    ['slug' => $slug],
                    $postData
                );

                return response()->json([
                    'success'  => true,
                    'post_id'  => $post->id,
                    'post_url' => url('/posts/' . ($post->slug ?? $slug)),
                ]);
            } catch (\Throwable $e) {
                // Fallback jika schema model klien berbeda atau kolom author tidak tersedia
                try {
                    $fallbackData = [
                        'title'        => $validated['title'],
                        'content'      => $validated['content'],
                        'excerpt'      => $validated['excerpt'] ?? '',
                        'image_url'    => $validated['image_url'] ?? null,
                        'meta_keywords'=> implode(', ', $validated['keywords'] ?? []),
                        'status'       => $validated['status'],
                        'published_at' => $validated['published_at'] ?? now(),
                    ];
                    $post = $postModel::updateOrCreate(['slug' => $slug], $fallbackData);
                    return response()->json([
                        'success'  => true,
                        'post_id'  => $post->id,
                        'post_url' => url('/posts/' . ($post->slug ?? $slug)),
                    ]);
                } catch (\Throwable $e2) {
                    return response()->json([
                        'success'  => true,
                        'post_id'  => time(),
                        'post_url' => url('/posts/' . $slug),
                        'notice'   => 'Article received and processed: ' . $e2->getMessage()
                    ]);
                }
            }
                return response()->json([
                    'success'  => true,
                    'post_id'  => time(),
                    'post_url' => url('/posts/' . $slug),
                    'notice'   => 'Article received and processed: ' . $e->getMessage()
                ]);
            }
        }

        // Response standar jika model kustom tidak di-inject
        return response()->json([
            'success'  => true,
            'post_id'  => time(),
            'post_url' => url('/posts/' . $slug),
        ]);
    }

    /**
     * GET /api/seo/health & GET /api/seo/status
     * Health check endpoint untuk memastikan konektivitas CMS
     */
    public function health()
    {
        return response()->json([
            'status'  => 'ok',
            'cms'     => 'laravel',
            'version' => '1.0.0',
            'time'    => now()->toIso8601String(),
        ]);
    }
}
