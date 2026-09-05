<?php

use Illuminate\Support\Facades\Route;
use SeoGeo\Receiver\Http\Controllers\SeoPostController;

Route::group([
    'prefix' => config('seo-receiver.prefix', 'api/seo'),
    'middleware' => config('seo-receiver.middleware', ['api']),
], function () {
    // Endpoint penerima artikel dari SEO/GEO Tools
    Route::post('/posts', [SeoPostController::class, 'store']);

    // Endpoint health check & status
    Route::get('/health', [SeoPostController::class, 'health']);
    Route::get('/status', [SeoPostController::class, 'health']);
});
