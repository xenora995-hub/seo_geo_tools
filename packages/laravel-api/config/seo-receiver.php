<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SEO/GEO Receiver API Key / Bearer Token
    |--------------------------------------------------------------------------
    |
    | Masukkan token rahasia yang sama dengan yang diinput di dashboard SEO/GEO Tools.
    | Jika kosong, akan memeriksa via auth:sanctum secara default.
    |
    */
    'api_key' => env('SEO_GEO_API_KEY', null),

    /*
    |--------------------------------------------------------------------------
    | Model Post
    |--------------------------------------------------------------------------
    |
    | Model Eloquent yang digunakan untuk menyimpan artikel.
    |
    */
    'post_model' => env('SEO_GEO_POST_MODEL', 'App\\Models\\Post'),

    /*
    |--------------------------------------------------------------------------
    | Route Prefix
    |--------------------------------------------------------------------------
    */
    'prefix' => 'api/seo',

    /*
    |--------------------------------------------------------------------------
    | Middleware
    |--------------------------------------------------------------------------
    */
    'middleware' => ['api'],
];
