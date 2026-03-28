#!/usr/bin/env bash
# ============================================================
# QRestaurant - Quick Start Script
# Run: chmod +x start.sh && ./start.sh
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "\n${GREEN}▶ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
print_error() { echo -e "${RED}✗  $1${NC}"; }

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   QRestaurant - Quick Start               ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ─── Check prerequisites ─────────────────────────────────
print_step "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
  print_error "Docker is not installed. Install from https://docs.docker.com/get-docker/"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  print_error "Docker Compose is not available."
  exit 1
fi

echo "  ✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "  ✓ Docker Compose available"

# ─── Setup environment files ─────────────────────────────
print_step "Setting up environment files..."

if [ ! -f .env ]; then
  cp .env.example .env
  # Generate random secrets
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)
  JWT_REFRESH=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)
  DB_PASS=$(node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))" 2>/dev/null || openssl rand -base64 24)

  # Replace placeholders
  sed -i.bak "s/change_me_in_production_use_strong_password/${DB_PASS}/g" .env
  sed -i.bak "s/CHANGE_ME_generate_64_char_random_string/${JWT_SECRET}/g" .env
  sed -i.bak "s/CHANGE_ME_generate_another_64_char_random_string/${JWT_REFRESH}/g" .env
  rm -f .env.bak
  echo "  ✓ Generated .env with secure random secrets"
else
  echo "  ✓ .env already exists, skipping"
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "  ✓ Created backend/.env"
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "  ✓ Created frontend/.env.local"
fi

# ─── Start services ──────────────────────────────────────
print_step "Starting Docker containers..."
docker-compose up -d

echo ""
print_step "Waiting for services to be healthy (up to 90 seconds)..."

wait_for() {
  local url=$1
  local name=$2
  local max=30
  local i=0
  while [ $i -lt $max ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo "  ✓ $name is ready"
      return 0
    fi
    sleep 3
    i=$((i + 1))
    echo -n "."
  done
  print_warn "$name did not respond in time, continuing anyway..."
}

wait_for "http://localhost:4000/health" "Backend API"
wait_for "http://localhost:3000"        "Frontend"

# ─── Seed database ───────────────────────────────────────
print_step "Seeding database with sample data..."
docker-compose exec -T backend npx prisma migrate deploy
docker-compose exec -T backend npx prisma db seed

# ─── Done ────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║   ✅  QRestaurant is ready!                      ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║                                                   ║"
echo "║   🌐 Customer Menu:                               ║"
echo "║      http://localhost:3000/menu/{qrToken}         ║"
echo "║                                                   ║"
echo "║   🔧 Admin Dashboard:                             ║"
echo "║      http://localhost:3000/admin                  ║"
echo "║      Email:    admin@lamaison.com                 ║"
echo "║      Password: Admin@123                          ║"
echo "║                                                   ║"
echo "║   📚 API Docs (Swagger):                          ║"
echo "║      http://localhost:4000/api/docs               ║"
echo "║                                                   ║"
echo "║   🩺 Health Check:                                ║"
echo "║      http://localhost:4000/health                 ║"
echo "║                                                   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}⚠  IMPORTANT: Change the admin password after first login!${NC}"
echo ""
echo "Useful commands:"
echo "  make logs      - Follow logs"
echo "  make down      - Stop all services"
echo "  make help      - All available commands"
echo ""
