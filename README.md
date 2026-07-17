# DineHub Desktop — Restaurant ERP + POS

Enterprise Electron desktop app integrated with the **DineHub REST API**.

## API Integration

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | `https://api.dinehub.app/api/v1` |

Swagger docs: http://localhost:3000/docs

### Dev Credentials

| Role | Email | Password | Tenant Slug |
|------|-------|----------|-------------|
| Super Admin | admin@dinehub.app | SuperAdmin@123 | — |
| Demo Owner | owner@demo-restaurant.com | Owner@123 | demo-restaurant |

## Quick Start

```bash
# 1. Start the DineHub API backend on port 3000
# 2. Install & run desktop app
npm install
npm run dev
```

## Architecture

```
electron/
├── main/
│   ├── index.ts           # Main process
│   ├── ipc/               # IPC handlers (auth, print, window)
│   └── store/             # Encrypted token storage (electron-store)
└── preload/
    └── index.ts           # window.electronAPI bridge

src/
├── api/
│   ├── client.ts          # Axios + auto token refresh queue
│   ├── auth.api.ts        # All /auth endpoints
│   ├── tenants.api.ts     # All /tenants endpoints
│   ├── stubs.ts           # Future module stubs
│   └── types/             # TypeScript interfaces
├── store/                 # Zustand (auth, tenant, branch)
├── hooks/                 # useAuth, useTenant, usePermissions
├── guards/                # AuthGuard, PermissionGuard
├── providers/             # AuthProvider (init + socket)
└── features/auth/         # Login, Roles, Tenants, Sessions, Account
```

## Security

- JWT tokens stored in **main process** encrypted electron-store (never localStorage)
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Auto token refresh on 401 with request queue
- `X-Tenant-Slug` header on all tenant-scoped requests

## IPC Bridge

```typescript
window.electronAPI.getToken()
window.electronAPI.setTokens({ accessToken, refreshToken })
window.electronAPI.clearTokens()
window.electronAPI.getTenantSlug()
window.electronAPI.setTenantSlug(slug)
window.electronAPI.getDeviceId()
window.electronAPI.getAppVersion()
window.electronAPI.openExternal(url)
window.electronAPI.printReceipt(html)
```

## Module 01 Pages

| Page | Route | API |
|------|-------|-----|
| Login | `/login` | POST /auth/login, GET /tenants/resolve/:slug |
| Dashboard | `/` | Placeholder (Module 27) |
| Roles | `/roles` | CRUD /auth/roles |
| Tenants Admin | `/admin/tenants` | CRUD /tenants (super admin) |
| Sessions | `/sessions` | GET/DELETE /auth/sessions |
| Account | `/account` | GET /auth/me, POST /auth/change-password |

## RBAC

```tsx
<PermissionGuard permission="pos.access">
  <POSButton />
</PermissionGuard>
```

Super Admin bypasses all permission checks.

## Build & Distribute

```bash
npm run build        # Build renderer + main
npm run dist         # Package for current OS
npm run dist:mac     # macOS .dmg
npm run dist:win     # Windows .nsis
npm run dist:linux   # Linux AppImage/deb
```

## Environment Variables

See `.env.development` and `.env.production`:

```
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
VITE_APP_NAME=DineHub POS
```

## Socket.io (prepared)

Connects after login, joins `join_restaurant` room. Events: `new_order`, `order_updated`, `kitchen_order_updated`, `table_updated`, `waiter_call_alert`.

## Offline Mode (prepared)

IndexedDB cache + sync queue in `src/lib/offline.ts`. Banner shown when API unreachable.
