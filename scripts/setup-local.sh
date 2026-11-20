#!/usr/bin/env bash
#
# Local development setup for the Gym SaaS monorepo.
#
#   ./scripts/setup-local.sh              # install, start Postgres + Redis, migrate
#   ./scripts/setup-local.sh --seed       # ...and load dev seed data (DEVGYM fixtures)
#   ./scripts/setup-local.sh --start      # ...then run API + web
#   ./scripts/setup-local.sh --start-all  # ...then run API + web + admin + landing
#
# Safe to re-run: existing .env files are never overwritten, migrations and
# seeds are idempotent, and Docker volumes are kept.
#
# Port map (all in the 9000 range so this project never collides with others;
#   9000 itself is skipped because Zscaler and similar tools commonly hold it):
#   9001 API · 9002 web · 9003 admin · 9004 landing · 9005 Expo/Metro
#   9006 Postgres · 9007 Redis

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SEED=false
START=""
INSTALL=true

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    --start) START="core" ;;
    --start-all) START="all" ;;
    --skip-install) INSTALL=false ;;
    -h|--help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 1 ;;
  esac
done

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }

# Read KEY from an env file without sourcing it (values may contain shell metacharacters).
env_get() {
  local file="$1" key="$2" default="${3:-}" value
  value="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
  printf '%s' "${value:-$default}"
}

# Write a file only if it does not exist yet.
write_if_missing() {
  local file="$1" content="$2"
  if [ -f "$file" ]; then
    ok "$file exists — left untouched"
  else
    printf '%s\n' "$content" > "$file"
    ok "created $file"
  fi
}

# lsof cannot see listeners owned by other users (e.g. a root VPN/Zscaler tunnel),
# so also try an actual TCP connect.
port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1 || nc -z -w 1 127.0.0.1 "$1" >/dev/null 2>&1
}

# ─── 1. Prerequisites ────────────────────────────────────────────────────────
step "Checking prerequisites"

command -v node >/dev/null || die "Node.js is not installed (need >= 20)."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js >= 20 required, found $(node -v)."
ok "node $(node -v)"

if ! command -v pnpm >/dev/null; then
  command -v corepack >/dev/null || die "pnpm is not installed. Run: npm install -g pnpm@9"
  warn "pnpm not found — enabling it through corepack"
  corepack enable pnpm
fi
ok "pnpm $(pnpm -v)"

command -v docker >/dev/null || die "Docker is not installed."
docker info >/dev/null 2>&1 || die "Docker is installed but not running. Start Docker Desktop and re-run."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required (docker compose ...)."
ok "docker $(docker version --format '{{.Server.Version}}')"

# ─── 2. Environment files ────────────────────────────────────────────────────
step "Preparing environment files"

if [ -f .env ]; then
  ok ".env exists — left untouched"
else
  cp .env.example .env
  # Fill in the required JWT secrets so the API boots on a fresh clone.
  for key in JWT_SECRET JWT_REFRESH_SECRET; do
    secret="$(openssl rand -hex 48)"
    perl -pi -e "s|^${key}=\$|${key}=${secret}|" .env
  done
  ok "created .env from .env.example (JWT secrets generated)"
fi

API_PORT="$(env_get .env PORT 9001)"
API_PREFIX="$(env_get .env API_PREFIX api/v1)"
PG_PORT="$(env_get .env POSTGRES_PORT 9006)"
REDIS_PORT="$(env_get .env REDIS_PORT 9007)"
WEB_PORT=9002
ADMIN_PORT=9003
LANDING_PORT=9004
EXPO_PORT=9005
API_ORIGIN="http://localhost:${API_PORT}"

# The compose file publishes Postgres/Redis on POSTGRES_PORT/REDIS_PORT, while the
# apps connect through DATABASE_URL/REDIS_URL. Catch a mismatch early.
case "$(env_get .env DATABASE_URL)" in
  *":${PG_PORT}/"*) ;;
  *) warn "DATABASE_URL in .env does not point at port ${PG_PORT} — the API may not reach the Docker Postgres" ;;
esac
case "$(env_get .env REDIS_URL)" in
  *":${REDIS_PORT}"*) ;;
  *) warn "REDIS_URL in .env does not point at port ${REDIS_PORT} — the API may not reach the Docker Redis" ;;
esac

write_if_missing apps/web/.env.local "NEXT_PUBLIC_API_URL=${API_ORIGIN}/${API_PREFIX}
API_URL=${API_ORIGIN}
NEXT_PUBLIC_LANDING_URL=http://localhost:${LANDING_PORT}"

write_if_missing apps/admin/.env.local "API_URL=${API_ORIGIN}"

write_if_missing apps/landing/.env.local "API_URL=${API_ORIGIN}
NEXT_PUBLIC_API_URL=${API_ORIGIN}
NEXT_PUBLIC_WEB_URL=http://localhost:${WEB_PORT}"

write_if_missing apps/mobile/.env "EXPO_PUBLIC_API_URL=${API_ORIGIN}/${API_PREFIX}"

# ─── 3. Port check ───────────────────────────────────────────────────────────
step "Checking ports"

for entry in "API:${API_PORT}" "web:${WEB_PORT}" "admin:${ADMIN_PORT}" "landing:${LANDING_PORT}" "Expo:${EXPO_PORT}"; do
  name="${entry%%:*}"; port="${entry##*:}"
  if port_in_use "$port"; then
    warn "port ${port} (${name}) is already in use — stop that process before starting ${name}"
  else
    ok "port ${port} (${name}) is free"
  fi
done

# ─── 4. Dependencies ─────────────────────────────────────────────────────────
if $INSTALL; then
  step "Installing dependencies"
  pnpm install
else
  step "Skipping dependency install (--skip-install)"
fi

# ─── 5. Postgres + Redis ─────────────────────────────────────────────────────
step "Starting Postgres (:${PG_PORT}) and Redis (:${REDIS_PORT})"
docker compose up -d --wait postgres redis
ok "containers are healthy"

# ─── 6. Database ─────────────────────────────────────────────────────────────
step "Generating Prisma client"
pnpm prisma:generate

step "Applying migrations"
pnpm db:migrate

if $SEED; then
  step "Loading seed data"
  pnpm db:seed
fi

# ─── 7. Done ─────────────────────────────────────────────────────────────────
step "Setup complete"
cat <<EOF

    API        ${API_ORIGIN}/${API_PREFIX}        (health: /${API_PREFIX}/health)
    Web        http://localhost:${WEB_PORT}
    Admin      http://localhost:${ADMIN_PORT}
    Landing    http://localhost:${LANDING_PORT}
    Expo       http://localhost:${EXPO_PORT}
    Postgres   localhost:${PG_PORT}
    Redis      localhost:${REDIS_PORT}

    pnpm dev            API + web
    pnpm dev:admin      admin console
    pnpm dev:landing    landing site
    pnpm dev:mobile     Expo / Metro
    pnpm docker:down    stop Postgres + Redis (data is kept)

EOF

case "$START" in
  core)
    step "Starting API + web (Ctrl+C to stop)"
    exec pnpm dev
    ;;
  all)
    step "Starting API + web + admin + landing (Ctrl+C to stop)"
    exec pnpm exec turbo run dev \
      --filter=@gym-saas/api --filter=@gym-saas/web \
      --filter=@gym-saas/admin --filter=@gym-saas/landing
    ;;
esac
