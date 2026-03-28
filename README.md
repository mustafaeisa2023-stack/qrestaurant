# 🍽️ QRestaurant — Production-Ready QR Ordering System

A full-stack, production-grade restaurant ordering system built with **Next.js 14**, **NestJS**, **PostgreSQL**, **Prisma**, and **Socket.io**. Customers scan a QR code at their table, browse the menu, and place orders in real time. Staff manage everything from a live admin dashboard.

---

## 🗺️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Nginx (SSL)                      │
│          Reverse Proxy + Rate Limiting               │
└─────────────┬─────────────────────┬─────────────────┘
              │                     │
   ┌──────────▼───────┐   ┌─────────▼────────┐
   │  Next.js 14 App  │   │  NestJS REST API  │
   │  Customer Menu   │   │  + Socket.io WS   │
   │  Admin Dashboard │   │  + Swagger Docs   │
   └──────────────────┘   └─────────┬─────────┘
                                    │
                          ┌─────────▼─────────┐
                          │   PostgreSQL 16    │
                          │   via Prisma ORM   │
                          └───────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/qrestaurant.git
cd qrestaurant

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Start with Docker (recommended)

```bash
# Start all services (DB + Backend + Frontend)
docker-compose up -d

# Wait ~30s for services to be healthy, then seed the database
docker-compose exec backend npx prisma db seed

# View logs
docker-compose logs -f backend
```

**That's it!** The app is running at:
- 🌐 **Customer Menu**: http://localhost:3000/menu/{qrToken}
- 🔧 **Admin Dashboard**: http://localhost:3000/admin
- 📚 **API Docs (Swagger)**: http://localhost:4000/api/docs

### 3. Start Manually (without Docker)

```bash
# Terminal 1 — Start PostgreSQL
docker run -d --name qr_postgres \
  -e POSTGRES_DB=qrestaurant_db \
  -e POSTGRES_USER=qrestaurant \
  -e POSTGRES_PASSWORD=qrestaurant_secret \
  -p 5432:5432 postgres:16-alpine

# Terminal 2 — Backend
cd backend
cp .env.example .env        # Edit DATABASE_URL + JWT secrets
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev           # http://localhost:4000

# Terminal 3 — Frontend
cd frontend
cp .env.example .env.local  # Edit API URLs
npm install
npm run dev                 # http://localhost:3000
```

---

## 🔐 Default Credentials

| Role        | Email                    | Password   |
|-------------|--------------------------|------------|
| Super Admin | admin@lamaison.com       | Admin@123  |
| Admin       | manager@lamaison.com     | Admin@123  |
| Staff       | staff@lamaison.com       | Staff@123  |

> ⚠️ **Change all passwords immediately after first login in production.**

---

## 📱 How the QR Flow Works

1. Admin creates a table → system auto-generates a unique QR code
2. Print/display the QR code at the physical table
3. Customer scans with phone camera → opens `/menu/{qrToken}`
4. Customer browses menu, adds items to cart, places order
5. Order appears **instantly** in admin dashboard via WebSocket
6. Admin/staff update order status: Pending → Confirmed → Preparing → Ready → Served → Completed
7. Customer sees status updates in real time

---

## 🗂️ Project Structure

```
qrestaurant/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/               # JWT auth, guards, strategies
│   │   ├── tables/             # Table CRUD + QR generation
│   │   ├── menu/               # Categories + menu items
│   │   ├── orders/             # Order lifecycle management
│   │   ├── websocket/          # Socket.io gateway (real-time)
│   │   ├── uploads/            # Image upload + optimization
│   │   ├── analytics/          # Dashboard stats + reports
│   │   ├── common/             # Filters, interceptors, guards
│   │   └── prisma/             # Database service
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Sample data seed
│   ├── test/                   # Unit tests (Jest)
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── menu/[qrToken]/ # Customer-facing menu
│   │   │   └── admin/          # Admin dashboard
│   │   ├── components/
│   │   │   ├── customer/       # Menu, Cart, OrderTracker
│   │   │   ├── admin/          # Dashboard widgets
│   │   │   └── shared/         # ThemeToggle, QueryProvider
│   │   ├── stores/             # Zustand state (auth, cart)
│   │   ├── lib/                # API client, services, i18n
│   │   ├── hooks/              # useSocket, custom hooks
│   │   └── types/              # TypeScript interfaces
│   ├── Dockerfile
│   └── .env.example
│
├── nginx/                      # Reverse proxy config
│   └── nginx.conf
├── docker-compose.yml          # Production compose
├── docker-compose.dev.yml      # Dev overrides
└── .env.example                # Root env for Docker
```

---

## 🔌 API Reference

### Authentication
| Method | Endpoint              | Auth | Description               |
|--------|-----------------------|------|---------------------------|
| POST   | /api/v1/auth/login    | No   | Login, get JWT tokens     |
| POST   | /api/v1/auth/refresh  | RT   | Refresh access token      |
| POST   | /api/v1/auth/logout   | JWT  | Invalidate tokens         |
| GET    | /api/v1/auth/profile  | JWT  | Get current user          |

### Menu (Public)
| Method | Endpoint                     | Auth | Description           |
|--------|------------------------------|------|-----------------------|
| GET    | /api/v1/menu/public          | No   | Full menu (active)    |
| GET    | /api/v1/menu/featured        | No   | Featured items        |

### Tables (Public)
| Method | Endpoint                              | Auth  | Description              |
|--------|---------------------------------------|-------|--------------------------|
| GET    | /api/v1/tables/by-token/:qrToken      | No    | Table info by QR token   |
| POST   | /api/v1/tables/by-token/:qrToken/session | No | Create table session   |

### Orders (Mixed)
| Method | Endpoint                        | Auth | Description             |
|--------|---------------------------------|------|-------------------------|
| POST   | /api/v1/orders                  | No   | Place order (customer)  |
| GET    | /api/v1/orders/track/:orderNum  | No   | Track order status      |
| GET    | /api/v1/orders                  | JWT  | All orders (admin)      |
| GET    | /api/v1/orders/active           | JWT  | Active orders (kitchen) |
| PATCH  | /api/v1/orders/:id/status       | JWT  | Update order status     |

### Analytics (Admin)
| Method | Endpoint                     | Auth | Description         |
|--------|------------------------------|------|---------------------|
| GET    | /api/v1/analytics/dashboard  | JWT  | Live dashboard stats |
| GET    | /api/v1/analytics/revenue    | JWT  | Revenue chart data  |
| GET    | /api/v1/analytics/top-items  | JWT  | Best-selling items  |
| GET    | /api/v1/analytics/tables     | JWT  | Per-table analytics |

---

## 🔄 WebSocket Events

**Namespace**: `/orders`

| Event (Server → Client)  | Description                     |
|--------------------------|---------------------------------|
| `order:new`              | New order placed (admin)        |
| `order:status-updated`   | Order status changed (admin)    |
| `order:status-changed`   | Status update (customer tracker)|
| `table:order-updated`    | Table-level update (customer)   |

| Event (Client → Server)  | Description                     |
|--------------------------|---------------------------------|
| `subscribe:table`        | Subscribe to table updates      |
| `subscribe:order`        | Subscribe to order updates      |

---

## 🚢 Production Deployment

### Option A: Docker on VPS (DigitalOcean / Linode / Hetzner)

```bash
# 1. SSH into your VPS
ssh user@your-server-ip

# 2. Install Docker + Compose
curl -fsSL https://get.docker.com | sh

# 3. Clone & configure
git clone https://github.com/your-org/qrestaurant.git
cd qrestaurant
cp .env.example .env
nano .env   # Fill in all values with strong secrets

# 4. Generate SSL cert (Let's Encrypt via Certbot)
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 5. Deploy with Nginx
docker-compose --profile production up -d

# 6. Seed database (first time only)
docker-compose exec backend npx prisma db seed
```

### Option B: Railway (PaaS — fastest)

```bash
# Install Railway CLI
npm install -g @railway/cli && railway login

# Create project
railway new qrestaurant

# Add PostgreSQL
railway add postgresql

# Deploy backend
cd backend
railway link <project-id>
railway up

# Deploy frontend
cd ../frontend
railway up
```

### Option C: Vercel (Frontend) + Railway (Backend)

```bash
# Backend on Railway (same as above)

# Frontend on Vercel
cd frontend
npx vercel
# Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL to your Railway backend URL
```

---

## 🧪 Running Tests

```bash
# Backend unit tests
cd backend
npm test

# With coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 🌐 Multi-Language Support

The customer menu supports **English, Arabic (RTL), and French**.

- Translations are in `frontend/src/lib/i18n.ts`
- The language switcher is on the menu header
- RTL layout is applied automatically for Arabic via `dir="rtl"`
- Add more languages by extending the `translations` object

---

## 🌙 Dark Mode

Dark mode is supported system-wide via `next-themes`. The toggle is available in both the customer menu and admin dashboard. It respects the system preference by default.

---

## 💳 Payment Integration Placeholder

A payment stub is included in the cart flow. To integrate a real payment gateway:

1. Add a payment button to `CartPanel.tsx` before placing the order
2. Call your payment provider (Stripe, Moyasar, etc.) to tokenize the card
3. Pass the `paymentToken` to the `POST /api/v1/orders` endpoint
4. Handle payment confirmation in `orders.service.ts` before creating the order

---

## 🔒 Security Checklist

- [x] JWT access + refresh token rotation
- [x] Password hashing with bcrypt (10 rounds)
- [x] Brute-force protection (5 attempts → 15min lockout)
- [x] Rate limiting (10 req/sec, 100 req/min, 1000 req/hour)
- [x] Input validation via `class-validator`
- [x] XSS protection headers via Helmet.js
- [x] SQL injection prevention via Prisma parameterized queries
- [x] CORS configured with explicit origins
- [x] Role-based access control (SUPER_ADMIN > ADMIN > STAFF)
- [x] Environment variables for all secrets
- [x] Non-root Docker containers
- [x] File upload type/size validation
- [x] Image processing before storage (no raw uploads served)

---

## 📝 License

MIT — use freely in commercial and personal projects.
