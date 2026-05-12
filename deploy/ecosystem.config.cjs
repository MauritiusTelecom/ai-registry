/* eslint-disable */
/**
 * PM2 ecosystem file for the AI Registry production process.
 *
 * Lives in each release directory on the server (rsync'd in by deploy.sh).
 * Started/reloaded with:
 *
 *   pm2 startOrReload deploy/ecosystem.config.cjs --env production
 *
 * The Next.js standalone build emits `server.js` at the bundle root, so the
 * `cwd` here points at the release directory and `script` is just `server.js`.
 *
 * Environment variables are loaded by PM2 from `shared/.env.production` via
 * the wrapper in deploy.sh (PM2 doesn't natively read dotenv; the wrapper
 * exports them before `pm2 startOrReload`).
 */
module.exports = {
  apps: [
    {
      name: "airegistry",
      script: "server.js",
      // cwd is set by deploy.sh to the release directory at reload time.
      // (We don't hardcode it here so the same file works across releases.)

      // Cluster mode: PM2 forks N workers and load-balances; rolling reloads
      // give zero-downtime deploys.
      exec_mode: "cluster",
      instances: "max",

      // Graceful shutdown so in-flight requests complete before kill.
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 10000,

      // Auto-restart on crash, but back off if the process keeps dying so
      // PM2 doesn't busy-loop a broken release.
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 2000,

      // Restart if the worker grows past this RSS (defensive cap).
      max_memory_restart: "768M",

      // Log files. pm2-logrotate (installed by bootstrap-server.sh) rotates
      // these daily and keeps 14 days.
      out_file: "/var/log/airegistry/out.log",
      error_file: "/var/log/airegistry/err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      env: {
        NODE_ENV: "production",
        // PORT comes from .env.production (3002); kept here as a safe default
        // so a misconfigured env doesn't silently fall back to 3000.
        PORT: "3002",
        HOSTNAME: "127.0.0.1"
      }
    }
  ]
};
