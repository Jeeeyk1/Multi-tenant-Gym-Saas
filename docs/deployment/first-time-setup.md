# First-Time Server Setup — Hetzner CPX31

This guide covers a **from-zero, single-box deployment** of the full stack: Postgres, Redis,
the NestJS API (PM2 cluster), and the Next.js web dashboard on one CPX31 (4 vCPU / 8 GB).

The mobile app is distributed via EAS Build / App Store — it is **not** deployed to this server.
See `docs/deployment/mobile-release.md` when that time comes.

---

## 1. Server provisioning

1. Create a **Hetzner CPX31** (or equivalent) — Ubuntu 24.04 LTS.
2. Add your SSH key during provisioning.
3. SSH in as root, then create a non-root deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
# copy your SSH key to the new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Log out and back in as `deploy` for all remaining steps.

---

## 2. System dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Runtime dependencies
sudo apt install -y git curl build-essential

# Node 22 via nvm (matches your engines constraint)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
nvm alias default 22

# pnpm
npm install -g pnpm

# PM2 (process manager — see ecosystem.config.js)
npm install -g pm2

# Postgres client tools (for running migrations manually)
sudo apt install -y postgresql-client
```

---

## 3. PostgreSQL

Install Postgres 16 on the same box:

```bash
sudo apt install -y postgresql-16

# Start and enable
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create DB user and database
sudo -u postgres psql <<'SQL'
CREATE USER gymsaas WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE gymsaas OWNER gymsaas;
\q
SQL
```

**Postgres tuning for 8 GB** (edit `/etc/postgresql/16/main/postgresql.conf`):

```conf
shared_buffers        = 2GB          # ~25% of RAM
effective_cache_size  = 6GB          # ~75% of RAM
work_mem              = 16MB         # per sort/hash operation
maintenance_work_mem  = 256MB        # VACUUM, CREATE INDEX
max_connections       = 100          # sized for 2 workers × 10 pool + headroom
wal_buffers           = 16MB
checkpoint_completion_target = 0.9
random_page_cost      = 1.1          # SSD
```

```bash
sudo systemctl restart postgresql
```

---

## 4. Redis

```bash
sudo apt install -y redis-server

# Set a password — edit /etc/redis/redis.conf
sudo sed -i 's/# requirepass foobared/requirepass CHANGE_ME_REDIS_PASSWORD/' /etc/redis/redis.conf

# Bind to localhost only (it's a single-box deploy)
sudo sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf

sudo systemctl enable redis-server
sudo systemctl restart redis-server

# Verify
redis-cli -a CHANGE_ME_REDIS_PASSWORD ping   # → PONG
```

---

## 5. Clone the repository

```bash
cd /home/deploy
git clone <YOUR_REPO_URL> gym-saas
cd gym-saas
pnpm install
```

---

## 6. Environment variables

Copy the example and fill in every value:

```bash
cp .env.example .env
nano .env       # or your preferred editor
```

### Required values (production)

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `9001` (API port; Nginx proxies to this) |
| `API_PREFIX` | `api/v1` |
| `DATABASE_URL` | `postgresql://gymsaas:PASSWORD@localhost:5432/gymsaas?connection_limit=10&pool_timeout=15&connect_timeout=10` |
| `REDIS_URL` | `redis://:REDIS_PASSWORD@localhost:6379` |
| `JWT_SECRET` | Generate: `openssl rand -base64 48` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 48` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `SUPERADMIN_TOKEN` | Generate: `openssl rand -base64 32` |
| `INVITE_EXPIRY_HOURS` | `72` |
| `WEB_URL` | `https://your-domain.com` |
| `EMAIL_FROM` | `noreply@your-domain.com` |
| `RESEND_API_KEY` | From resend.com dashboard |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `ANTHROPIC_API_KEY` | From console.anthropic.com (AI assistant feature) |
| `ANTHROPIC_INSIGHTS_MODEL` | `claude-haiku-4-5` |
| `AI_PROVIDER` | `groq` (member-facing AI features) |
| `AI_API_KEY` | From groq.com or anthropic.com |
| `NEXT_PUBLIC_API_URL` | `https://your-domain.com/api/v1` |

**Generate all secrets in one pass:**
```bash
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"
echo "SUPERADMIN_TOKEN=$(openssl rand -base64 32)"
```

### Web app environment (.env in apps/web or as build-time vars)

```bash
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
APP_HOST=https://your-domain.com
```

---

## 7. Database setup

```bash
cd /home/deploy/gym-saas

# Generate the Prisma client
pnpm prisma:generate

# Run all SQL migrations
pnpm db:migrate

# Seed roles, permissions and plans. With NODE_ENV=production in .env the dev
# fixtures (005_dev_fixtures.sql — demo gym and test logins) are skipped.
pnpm db:seed

# Seed the first superadmin (prompts for email/password)
pnpm seed:admin
```

Verify the DB is clean:
```bash
psql "postgresql://gymsaas:PASSWORD@localhost:5432/gymsaas" \
  -c "SELECT tier, count(*) FROM plans GROUP BY tier ORDER BY tier;"
# Should show: BASIC / ENTERPRISE / GROWTH — 1 row each
```

---

## 8. Build the applications

```bash
cd /home/deploy/gym-saas

# API
pnpm --filter @gym-saas/api build

# Web
pnpm --filter @gym-saas/web build
```

---

## 9. Start the API with PM2

```bash
cd /home/deploy/gym-saas/apps/api

# Start 2-worker cluster (see ecosystem.config.js for sizing rationale)
pm2 start ecosystem.config.js

# Save so it survives reboots
pm2 save

# Register PM2 to start on boot
pm2 startup
# → Run the printed sudo command

# Verify both workers are running
pm2 list
pm2 logs gym-api --lines 20
```

---

## 10. Start the web app

```bash
cd /home/deploy/gym-saas

# Start Next.js (port 9002 or whichever you choose)
pm2 start "pnpm --filter @gym-saas/web start -- --port 9002" --name gym-web
pm2 save
```

---

## 11. Nginx reverse proxy + TLS

Install Nginx and Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/gym-saas`:

```nginx
server {
    server_name your-domain.com www.your-domain.com;

    # Web dashboard
    location / {
        proxy_pass         http://localhost:9002;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API + WebSocket (Socket.IO)
    location /api/ {
        proxy_pass         http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        # Allow large file uploads (exercise photos, meal photos)
        client_max_body_size 15M;
    }

    # Socket.IO chat — WebSocket upgrade path
    location /chat {
        proxy_pass         http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_read_timeout 3600s;
    }
}
```

Enable and get a TLS certificate:

```bash
sudo ln -s /etc/nginx/sites-available/gym-saas /etc/nginx/sites-enabled/
sudo nginx -t          # verify config
sudo systemctl reload nginx

# Issue TLS cert (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot auto-renews via a cron job. Verify: `sudo certbot renew --dry-run`.

---

## 12. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Only ports 22, 80, and 443 should be open. Postgres (5432) and Redis (6379) stay localhost-only.

---

## 13. Smoke tests

After setup, verify each layer:

```bash
# API health check
curl https://your-domain.com/api/v1/health

# DB connection (from API logs)
pm2 logs gym-api --lines 5   # should show "Database connection established"

# Redis
redis-cli -a REDIS_PASSWORD ping   # → PONG

# Web dashboard
curl -I https://your-domain.com   # should return 200
```

Then test the full flow manually:
1. Go to `https://your-domain.com` → enter a gym code → login as the gym owner
2. Verify the dashboard loads and shows active check-ins
3. Run the AI assistant — test one question (needs `ANTHROPIC_API_KEY` set)

---

## 14. Set Anthropic spend cap (do this before going live)

In [console.anthropic.com](https://console.anthropic.com) → **Settings → Limits**, set a monthly
hard spend cap (recommended: $20–$50 to start). This is the only protection against a billing
surprise from a bug or a stolen key. The application-layer quota (`aiTokensUsed`) is a second line
of defence, not a replacement.

---

## 15. Ongoing operations

### Deploy a new version

```bash
cd /home/deploy/gym-saas
git pull

pnpm install

# Run any new migrations first
pnpm db:migrate

# Rebuild
pnpm --filter @gym-saas/api build
pnpm --filter @gym-saas/web build

# Zero-downtime reload (PM2 clusters one worker at a time)
pm2 reload gym-api
pm2 restart gym-web
```

### View logs

```bash
pm2 logs gym-api          # API (both workers)
pm2 logs gym-web          # web
sudo journalctl -u nginx  # Nginx
sudo journalctl -u postgresql  # Postgres
```

### Monitor

```bash
pm2 monit               # live CPU/memory per worker
pm2 list                # summary
```

### Backup Postgres

```bash
# Manual backup
pg_dump -U gymsaas gymsaas | gzip > backup-$(date +%F).sql.gz

# Add to crontab (daily at 3am)
crontab -e
# 0 3 * * * pg_dump -U gymsaas gymsaas | gzip > /home/deploy/backups/backup-$(date +\%F).sql.gz
```

---

## Checklist — first-time setup

- [ ] Server created, SSH key set, non-root user `deploy` created
- [ ] Node 22, pnpm, PM2 installed
- [ ] Postgres 16 installed, tuned, DB + user created
- [ ] Redis installed, password set, localhost-only
- [ ] Repo cloned, `pnpm install` done
- [ ] `.env` filled in — all secrets generated with `openssl rand`
- [ ] `pnpm prisma:generate` run
- [ ] `pnpm db:migrate` run — no errors
- [ ] `pnpm db:seed` run — plans show 1 row per tier
- [ ] `pnpm seed:admin` run — first superadmin created
- [ ] API built + started with PM2 (`pm2 list` shows 2 workers online)
- [ ] Web built + started with PM2
- [ ] Nginx config in place, `nginx -t` clean
- [ ] TLS cert issued via Certbot
- [ ] UFW enabled — only 22, 80, 443 open
- [ ] Health check returns 200: `curl https://your-domain.com/api/v1/health`
- [ ] Anthropic spend cap set in console
- [ ] PM2 startup registered (`pm2 startup` + `pm2 save`)
- [ ] Backup cron added
