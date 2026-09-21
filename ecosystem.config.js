module.exports = {
  apps: [
    {
      name: 'seogeo-api',
      cwd: './apps/api',
      script: 'dist/index.js',
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production', PORT: 4000 }
    }
  ]
}
