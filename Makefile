# ============================================================
# QRestaurant - Makefile
# Convenience commands for development and deployment
# Usage: make <command>
# ============================================================

.PHONY: help install dev prod down db-seed db-reset db-studio \
        test test-cov lint build clean logs ps health \
        qr-regen docker-build docker-push

# ─── Variables ───────────────────────────────────────────
COMPOSE      = docker-compose
COMPOSE_DEV  = docker-compose -f docker-compose.yml -f docker-compose.dev.yml
BACKEND_CTR  = qrestaurant_backend
FRONTEND_CTR = qrestaurant_frontend
DB_CTR       = qrestaurant_db

# ─── Default: show help ───────────────────────────────────
help:
	@echo ""
	@echo "  ╔═══════════════════════════════════════════╗"
	@echo "  ║         QRestaurant Makefile              ║"
	@echo "  ╚═══════════════════════════════════════════╝"
	@echo ""
	@echo "  SETUP"
	@echo "    make install      Install all npm dependencies"
	@echo "    make env           Copy .env.example files"
	@echo ""
	@echo "  DEVELOPMENT"
	@echo "    make dev           Start full stack (Docker)"
	@echo "    make dev-local     Start DB only, run app locally"
	@echo "    make down          Stop all containers"
	@echo "    make logs          Follow all logs"
	@echo "    make logs-be       Follow backend logs only"
	@echo "    make logs-fe       Follow frontend logs only"
	@echo ""
	@echo "  DATABASE"
	@echo "    make db-migrate    Run Prisma migrations"
	@echo "    make db-seed       Seed sample data"
	@echo "    make db-reset      Reset and re-seed database"
	@echo "    make db-studio     Open Prisma Studio (browser)"
	@echo ""
	@echo "  TESTING"
	@echo "    make test          Run all backend unit tests"
	@echo "    make test-cov      Run tests with coverage report"
	@echo ""
	@echo "  CODE QUALITY"
	@echo "    make lint          Lint backend code"
	@echo "    make format        Format all code with Prettier"
	@echo ""
	@echo "  PRODUCTION"
	@echo "    make prod          Start in production mode"
	@echo "    make build         Build Docker images"
	@echo "    make health        Check service health"
	@echo ""
	@echo "  UTILITIES"
	@echo "    make clean         Remove containers and volumes"
	@echo "    make ps            Show running containers"
	@echo "    make shell-be      Open shell in backend container"
	@echo "    make shell-db      Open psql in database container"
	@echo ""

# ─── SETUP ───────────────────────────────────────────────
env:
	@cp -n .env.example .env 2>/dev/null && echo "Created .env" || echo ".env already exists"
	@cp -n backend/.env.example backend/.env 2>/dev/null && echo "Created backend/.env" || echo "backend/.env already exists"
	@cp -n frontend/.env.example frontend/.env.local 2>/dev/null && echo "Created frontend/.env.local" || echo "frontend/.env.local already exists"
	@echo ""
	@echo "⚠️  Edit .env files and set strong JWT secrets before running!"

install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ All dependencies installed"

# ─── DEVELOPMENT ─────────────────────────────────────────
dev: env
	$(COMPOSE) up -d
	@echo ""
	@echo "✅ QRestaurant is starting up..."
	@echo "   Customer Menu : http://localhost:3000/menu/{qrToken}"
	@echo "   Admin Panel   : http://localhost:3000/admin"
	@echo "   API           : http://localhost:4000/api"
	@echo "   Swagger Docs  : http://localhost:4000/api/docs"
	@echo ""
	@echo "Run 'make db-seed' after first start to load sample data"

dev-local:
	$(COMPOSE) up -d postgres
	@echo "PostgreSQL started on localhost:5432"
	@echo "Now run: cd backend && npm run start:dev"
	@echo "And:     cd frontend && npm run dev"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

# ─── LOGS ────────────────────────────────────────────────
logs:
	$(COMPOSE) logs -f

logs-be:
	$(COMPOSE) logs -f backend

logs-fe:
	$(COMPOSE) logs -f frontend

logs-db:
	$(COMPOSE) logs -f postgres

# ─── DATABASE ────────────────────────────────────────────
db-migrate:
	$(COMPOSE) exec backend npx prisma migrate dev

db-migrate-prod:
	$(COMPOSE) exec backend npx prisma migrate deploy

db-seed:
	@echo "Seeding database with sample data..."
	$(COMPOSE) exec backend npx prisma db seed
	@echo "✅ Database seeded!"
	@echo "   Admin: admin@lamaison.com / Admin@123"

db-reset:
	@echo "⚠️  This will DESTROY all data. Press Ctrl+C to cancel, Enter to continue..."
	@read confirm
	$(COMPOSE) exec backend npx prisma migrate reset --force
	$(COMPOSE) exec backend npx prisma db seed
	@echo "✅ Database reset and re-seeded"

db-studio:
	@echo "Opening Prisma Studio..."
	cd backend && npx prisma studio

db-shell:
	$(COMPOSE) exec postgres psql -U qrestaurant -d qrestaurant_db

# ─── TESTING ─────────────────────────────────────────────
test:
	cd backend && npm test

test-cov:
	cd backend && npm run test:cov
	@echo "Coverage report: backend/coverage/lcov-report/index.html"

test-watch:
	cd backend && npm run test:watch

# ─── CODE QUALITY ────────────────────────────────────────
lint:
	cd backend  && npm run lint
	cd frontend && npm run lint

format:
	cd backend  && npm run format
	cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}"

type-check:
	cd frontend && npm run type-check

# ─── PRODUCTION ──────────────────────────────────────────
prod: env
	$(COMPOSE) --profile production up -d
	@echo "✅ Production stack started (with Nginx)"

build:
	$(COMPOSE) build --no-cache

# ─── HEALTH ──────────────────────────────────────────────
health:
	@echo "Checking service health..."
	@curl -sf http://localhost:4000/health | python3 -m json.tool 2>/dev/null || echo "Backend: ❌ Not responding"
	@curl -sf http://localhost:3000 > /dev/null && echo "Frontend: ✅ OK" || echo "Frontend: ❌ Not responding"
	@$(COMPOSE) exec postgres pg_isready -U qrestaurant 2>/dev/null && echo "Database: ✅ OK" || echo "Database: ❌ Not responding"

# ─── UTILITIES ───────────────────────────────────────────
ps:
	$(COMPOSE) ps

clean:
	@echo "⚠️  This removes all containers, networks, and volumes!"
	@echo "Press Ctrl+C to cancel, Enter to continue..."
	@read confirm
	$(COMPOSE) down -v --remove-orphans
	@echo "✅ Cleaned"

shell-be:
	$(COMPOSE) exec backend sh

shell-fe:
	$(COMPOSE) exec frontend sh

# ─── QR CODES ────────────────────────────────────────────
qr-regen:
	@echo "Regenerating QR codes for all tables..."
	@curl -sf -X POST http://localhost:4000/api/v1/tables/regenerate-all \
		-H "Authorization: Bearer $$(cat .admin-token 2>/dev/null || echo 'LOGIN FIRST')" \
		| python3 -m json.tool || echo "Login and save token to .admin-token first"
