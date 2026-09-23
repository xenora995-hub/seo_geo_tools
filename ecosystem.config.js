const path = require('path')

module.exports = {
  apps: [
    {
      name: 'seogeo-api',
      cwd: path.resolve(__dirname, 'apps/api'),
      script: 'dist/index.js',
      max_memory_restart: '350M',
      autorestart: true,
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
}
