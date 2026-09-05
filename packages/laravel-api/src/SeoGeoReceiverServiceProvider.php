<?php

namespace SeoGeo\Receiver;

use Illuminate\Support\ServiceProvider;

class SeoGeoReceiverServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../config/seo-receiver.php',
            'seo-receiver'
        );
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Load package routes
        $this->loadRoutesFrom(__DIR__ . '/routes/api.php');

        // Publish config
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/seo-receiver.php' => config_path('seo-receiver.php'),
            ], 'seo-receiver-config');
        }
    }
}
