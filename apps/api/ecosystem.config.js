// PM2 process config for the all-in-one CPX31 (4 vCPU / 8 GB) where Postgres,
// Redis and this API share the box.
//
// Why 2 workers (not 1, not 4):
//   - 1 worker: a bcrypt login or heavy JSON serialization blocks the single event
//     loop and freezes all users; no redundancy if it crashes.
//   - 4 workers: Node grabs every core and starves Postgres — the actual bottleneck
//     on a DB-bound app. Worse overall throughput.
//   - 2 workers: survives a crash, keeps CPU bursts from freezing everyone, and
//     leaves ~2 cores for Postgres + Redis + OS.
//
// Safe to cluster: crons acquire a Redis lock (cron/shared/cron-lock.service.ts) so
// they run once across workers, and WebSockets use the Redis IO adapter, so socket
// rooms work across workers. Nothing duplicates.
//
// Connection math: connection_limit in DATABASE_URL is PER worker. 2 × 10 = 20
// Postgres connections, well under max_connections (100). Keep (instances × limit)
// under max_connections with headroom for psql/migrations when you scale.
//
// Run:  pm2 start ecosystem.config.js   (from apps/api, after `pnpm build`)

module.exports = {
  apps: [
    {
      name: 'gym-api',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '900M', // 2 × 900M ≈ 1.8 GB, leaving room for Postgres/Redis/OS
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
