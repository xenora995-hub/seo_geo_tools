module.exports = {
  apps: [
    {
      name: 'seogeo-api',
      cwd: './apps/api',
      script: 'npx',
      args: 'tsx src/index.ts',
      env: { NODE_ENV: 'production', PORT: 4000 }
    },
    {
      name: 'seogeo-dashboard',
      cwd: './apps/dashboard',
      script: 'node',
      args: '.next/server/server.js',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
}
