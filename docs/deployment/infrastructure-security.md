# Infrastructure Security

How the test and production environments are protected, from the edge down to the database.
Application-level rules (auth, tenancy, validation) live in `docs/03-engineering/api-security.md`.
Server setup steps live in `docs/deployment/first-time-setup.md`; this document says what each
layer must look like, and that guide says how to build it.

The model is defence in depth: each layer assumes the one in front of it can fail.

```
Internet
  │
  ▼
Cloudflare  ── DNS, TLS, WAF, rate limits, DDoS, Access (admin + test)
  │  (Cloudflare Tunnel — outbound-only connection, no open ports on the server)
  ▼
Server      ── no inbound ports, SSH over Tailscale, auto security updates
  │
  ├─ API / web / admin   ── non-root containers, secrets from a root-owned env file
  ├─ Postgres            ── localhost only, least-privilege roles
  └─ Redis               ── localhost only, ACL user
  │
  ▼
Providers   ── one scoped key per environment, spend limits
Backups     ── encrypted, off-box, write-only credentials
```

---

## 1. Edge — Cloudflare

All public hostnames are proxied through Cloudflare (orange cloud). Nothing resolves to the server's IP.

| Setting | Value | Why |
|---|---|---|
| Connection to origin | **Cloudflare Tunnel** (`cloudflared` on the server) | The server opens no inbound ports, so it cannot be scanned or hit directly |
| SSL/TLS | Full (strict); minimum TLS 1.2; Always Use HTTPS; HSTS on | Encrypted end to end |
| WAF | Cloudflare managed free ruleset on | Blocks common injection and scanner traffic |
| Rate limiting rule | `/api/v1/auth/*`: 20 requests / 10 s per IP → block 1 min | Backstop for the app's own limiter |
| Bot Fight Mode | **Off for the API hostname** | It challenges non-browser clients and breaks the mobile app |
| Under Attack mode | Off; switch on only during an incident (web hosts only) | |

### Hostnames

| Host | Who reaches it | Protection |
|---|---|---|
| `domain` (landing) | Public | Cloudflare Pages |
| `api.domain` | Public (mobile app, web, admin) | Tunnel + WAF + rate limit |
| `app.domain`, `{slug}.domain` | Public (gym staff) | Tunnel + WAF |
| `admin.domain` | **Platform admins only** | Tunnel + **Cloudflare Access** |
| `*.test-domain` | **Team and invited testers only** | Tunnel + **Cloudflare Access** (except the test API, see below) |

### Cloudflare Access (Zero Trust, free up to 50 users)

- **Admin app:** an Access application on `admin.domain` with an allow policy listing the admins'
  emails, using one-time PIN or Google login. The admin app is then unreachable without passing
  Access first, before the app's own login. This is the strongest single control for the most
  privileged surface.
- **Test environment:** the test web and admin apps sit behind the same kind of policy. The test API
  stays reachable because TestFlight and Play test builds call it, but it holds only seeded test data.
- Session duration: 24 h for admin, 7 days for test.

---

## 2. Network

- **No inbound ports.** The cloud firewall (DigitalOcean firewall / Oracle security list) allows no
  inbound traffic. `cloudflared` makes an outbound connection to Cloudflare.
- **SSH over Tailscale only.** Port 22 is closed to the internet; admins reach the box over the
  tailnet. Without Tailscale, allow 22 only from fixed admin IPs and run fail2ban.
- **Docker ports bypass `ufw`.** A `ports: "5432:5432"` mapping is reachable from the internet even with
  `ufw` set to deny. In production compose files, Postgres and Redis publish **no ports**. If a host port
  is ever needed, bind it to loopback: `127.0.0.1:5432:5432`.
- When Postgres moves to its own server (see the scaling plan), it listens on the provider's private
  network only, and its firewall allows 5432 from the app servers alone.

---

## 3. Host

Ubuntu 24.04 LTS on every server.

- A non-root `deploy` user with sudo; root login disabled.
- `/etc/ssh/sshd_config`: `PasswordAuthentication no`, `PermitRootLogin no`, `KbdInteractiveAuthentication no`.
- `unattended-upgrades` enabled for security updates, with automatic reboot at 04:00 Asia/Manila if required.
- `ufw default deny incoming` as a second line behind the cloud firewall.
- Time sync (`systemd-timesyncd`) on; JWT expiry and logs depend on it.
- No other services on the box (no FTP, no mail server, no control panels).

### Containers

- App images run as a non-root user (`USER node`) from a slim base image, rebuilt on every deploy.
- `read_only: true` with a `tmpfs` for `/tmp` where the app allows it.
- Never mount `/var/run/docker.sock` into a container.
- `restart: unless-stopped` and a health check on every service.

---

## 4. Data stores

### Postgres

| Role | Can | Used by |
|---|---|---|
| `gym_app` | `SELECT/INSERT/UPDATE/DELETE` on app tables; no DDL, not superuser, not owner | API at runtime (`DATABASE_URL`) |
| `gym_migrator` | Owns the schema; DDL | Migration step in deploys only |
| `gym_backup` | Read-only | Nightly `pg_dump` |

- `password_encryption = scram-sha-256`; `pg_hba.conf` allows only local / private-network connections with scram.
- `statement_timeout = 30s` for `gym_app`, so a runaway query can't hold the database.
- `log_connections` and `log_min_duration_statement = 1000` on.
- Later backstop for tenancy: composite foreign keys on `(member_id, gym_id)` and, if needed, row-level security.

### Redis

- Bound to localhost (or the private network), `protected-mode yes`.
- An ACL user for the API with `-flushall -flushdb -config -debug -keys` denied; the default user disabled.
- Redis holds cache, rate-limit counters, locks and socket state only. It is never the only copy of anything.

---

## 5. Secrets

- **One set per environment.** Test and prod never share a JWT secret, database password or provider key.
- **Generated, not chosen:** `openssl rand -base64 48` for JWT secrets, 32+ random characters for database and Redis passwords.
- **Where they live:**
  - Source of truth: **GitHub Environments** (`test`, `production`). `production` requires a reviewer to approve each deploy.
  - On the server: `/etc/gym-saas/api.env`, owned `root:deploy`, mode `0640`. Compose reads it with `env_file`.
  - Never in the repo (it is public; gitleaks runs in CI), never baked into an image, never in logs.
- **Client bundles are public.** Anything prefixed `NEXT_PUBLIC_` or `EXPO_PUBLIC_` ships to every browser
  and phone. Those prefixes are for URLs and feature flags only, never keys.
- **Rotation:** provider keys yearly or when someone with access leaves. JWT secrets on any suspected
  leak; rotating them signs everyone out, which is the intended effect.

---

## 6. Third-party providers

Every provider gets a separate project or key per environment, with the narrowest scope it offers.

| Provider | Scope | Limit |
|---|---|---|
| Anthropic | One workspace per environment | Workspace monthly spend limit (test $10, prod set from the cost plan) |
| Groq | One key per environment | Spend limit in the console |
| Resend | Sending-only key, restricted to the verified domain | SPF, DKIM and DMARC (`p=quarantine`) on the sending domain |
| Cloudinary | Separate cloud per environment; uploads go through the API only | No unsigned upload presets |
| Expo | Separate project per environment | Enable push security (access token required to send) |
| Cloudflare | API tokens scoped per zone and per task (DNS, tunnel) | No global API key |

---

## 7. Web, admin and mobile apps

- Next.js apps send security headers: `poweredByHeader: false`, a Content-Security-Policy, `X-Frame-Options`
  / `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.
- `next/image` `remotePatterns` list exact hostnames (the Cloudinary host), never `**`.
- Auth cookies are `httpOnly`, `secure`, `sameSite=lax`, and expire no later than the refresh token they hold.
- Mobile stores tokens in SecureStore only. Production builds come from EAS with production credentials
  and have the dev menu disabled (the default for release builds).
- Next.js and Expo SDK upgrades are security work: apply patch releases within a week.

---

## 8. CI/CD and supply chain

- `main` and `develop` are protected; PRs need green checks (typecheck, lint, tests, migrations, security).
- `pnpm audit --prod --audit-level high` **blocks** merges once the current backlog is triaged.
- gitleaks on every PR (already in place). Container images scanned with Trivy before deploy.
- Renovate or Dependabot opens weekly grouped update PRs.
- Third-party GitHub Actions are pinned to a commit SHA, not a tag.
- Deploys: `develop` → test automatically, a tag on `main` → production after approval. The deploy
  credential is a dedicated SSH key (or Tailscale auth key) used only by the deploy job.

---

## 9. Backups and recovery

- Nightly `pg_dump` as `gym_backup`, encrypted with `age` (the private key is kept off the server),
  uploaded to a private Cloudflare R2 bucket.
- The upload token can **write but not delete**, and a bucket lifecycle rule removes dumps after 30 days.
  A compromised server can't erase its own backups.
- Weekly provider snapshots of the server on top of that.
- **Restore drill every month:** restore the latest dump into a scratch database and run the smoke tests.
  A backup that hasn't been restored doesn't count.

---

## 10. Monitoring and audit

| Signal | Tool | Alert when |
|---|---|---|
| Uptime of `/health`, web, admin | UptimeRobot or Better Stack | Down for 2 checks |
| API and mobile errors | Sentry, with PII scrubbing on | New issue or 5xx spike |
| Auth abuse | API logs + Cloudflare analytics | Spikes in 401, 403 or 429 |
| Admin activity | `audit_log` table (who, what, when, from where) | Admin login from a new country |
| Server | Provider metrics | CPU > 80%, disk > 70% |

- Logs never contain passwords, tokens, full card or ID numbers, or health data. Request ids are
  used to correlate (`common/middleware/request-id.middleware.ts`).
- Retain logs 30 days, audit log 1 year.

---

## 11. Incident response

1. **Contain:** turn on Cloudflare Under Attack mode for the web hosts, or block the offending IPs or countries.
2. **Revoke:** rotate the JWT secret (signs everyone out), rotate any exposed provider key, revoke refresh tokens in the database.
3. **Investigate:** API logs by request id, Cloudflare logs, `audit_log`.
4. **Notify:** if personal data was exposed, the Philippine Data Privacy Act requires notifying the
   National Privacy Commission and affected people within 72 hours. Gym owners are notified the same day.
5. **Write up** what happened and what changes, in `docs/progress/`.

---

## 12. Privacy and compliance

- Member weight, meals and health readings are **sensitive personal information** under RA 10173.
  The platform processes it on behalf of gyms; the terms must say so (data processing agreement).
- A designated Data Protection Officer, a privacy notice in the apps, and consent before health
  features (already gated in the fitness-plan flow).
- Check whether NPC registration applies before launch (threshold-based).
- Account deletion in the app (an App Store and Play requirement) removes or anonymises personal data.

---

## 13. Rollout

| When | Layer | Done when |
|---|---|---|
| Before the test env (Dec 8) | Cloudflare zone + Tunnel, Access on test web/admin, per-env provider keys, host hardening | Server has zero inbound ports; test web asks for Access login |
| Before beta (Jan 12) | Access on `admin.domain`, Postgres roles, Redis ACL, encrypted off-box backups + one restore, Sentry and uptime alerts, prod GitHub Environment with approval | Restore drill passed; prod deploy needs approval |
| First month of beta | Audit log for admin and billing actions, audit gate blocking in CI, Trivy, Renovate | |
| Before 10 clients | Postgres on a private network when it moves to its own box, monthly restore drills, key rotation calendar | |
