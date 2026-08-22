# DineHub Enterprise Platform

Production-grade Restaurant ERP + POS system (Oracle Micros / Toast POS / Petpooja class).

## Repository Layout

```
dine-hub-desktop-app/     → Electron + React 19 desktop (POS, KDS, Admin)
dinehub-backend/          → NestJS API + Prisma + PostgreSQL
```

Target monorepo (next phase):

```
apps/desktop/             → Electron app
apps/server/              → NestJS API
packages/shared/          → Shared types & validators
database/prisma/          → Single schema source
```

## Module Delivery Plan

| # | Module | Status |
|---|--------|--------|
| 1 | **Authentication** | ✅ In progress — JWT, PIN, lock screen, shifts |
| 2 | Database Schema | ✅ Core auth/tenant schema |
| 3 | Prisma + Seed | ✅ Demo data |
| 4 | API (Auth/Tenants) | ✅ Live |
| 5 | Desktop UI Shell | ✅ 20+ screens |
| 6 | POS | 🔜 Next |
| 7 | Orders | 🔜 |
| 8 | Invoice + Printing | 🔜 |
| 9 | Inventory | 🔜 |
| 10 | Reports | 🔜 |
| 11 | Realtime (Socket.io) | 🔜 |
| 12 | Production Build | 🔜 |

## Module 1 — Authentication (Complete Feature Set)

### Roles
Owner, Admin, Manager, Cashier, Kitchen Staff, Waiter, Delivery Boy, Customer

### API Endpoints (`/api/v1/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Email + password |
| POST | `/pin/login` | Employee code + PIN (POS) |
| POST | `/pin/set` | Set staff PIN |
| POST | `/lock` | Lock cashier screen |
| POST | `/unlock` | Unlock with PIN/password |
| GET | `/lock-status` | Session lock state |
| POST | `/shifts/open` | Open shift + opening cash |
| POST | `/shifts/close` | Close shift + reconcile |
| GET | `/shifts/current` | Active shift |
| GET | `/shifts` | Shift history |
| POST | `/forgot-password` | Password reset |
| GET | `/me` | Profile + permissions |
| GET | `/sessions` | Device sessions |

### Demo Credentials

| Role | Login | PIN |
|------|-------|-----|
| Owner | `owner@demo-restaurant.com` / `Owner@123` | Code `1001` / PIN `1234` |
| Cashier | `cashier@demo-restaurant.com` / `Cashier@123` | Code `2001` / PIN `4321` |
| Super Admin | `admin@dinehub.app` / `SuperAdmin@123` | — |

Tenant slug: `demo-restaurant`

## Quick Start

### Backend

```bash
cd dinehub-backend
docker compose up -d          # PostgreSQL + Redis
npm install
npx prisma db push --accept-data-loss
npm run prisma:seed
npm run start:dev             # http://localhost:3000/api/v1
```

Swagger: http://localhost:3000/docs

### Desktop

```bash
cd dine-hub-desktop-app
npm install
npm run dev
```

## Tech Stack

- **Desktop:** Electron 33, React 19, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query, Zustand
- **Backend:** NestJS, PostgreSQL, Prisma, JWT, Socket.io, Redis, BullMQ
- **Patterns:** Repository pattern, DTO validation, RBAC, audit logs, soft delete, UUID PKs

## Next Module

**Module 6 — POS + Orders:** Menu API, cart, payments, KOT, table linking, offline sync.
