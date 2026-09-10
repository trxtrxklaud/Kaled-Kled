// PM2 process file for the Kaled-Kled Node server (KVM1 and alike).
//
// - Runs the PRODUCTION bundle (dist/server.cjs). Build first:
//     npm install && npm run build
// - Secrets (PROVIDENCE_API_TOKEN, ...) come from the HOST environment
//   (PM2 env / panel variables), never from this file.
// - Node 20+ required on the host (`node --version`).
//
// Start:   pm2 start ecosystem.config.js
// Reload:  pm2 reload kledkaled --update-env
// Persist: pm2 save   (plus `pm2 startup` once, needs sudo)
module.exports = {
  apps: [
    {
      name: 'kledkaled',
      script: 'dist/server.cjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
