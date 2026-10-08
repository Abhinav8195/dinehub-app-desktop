# DineHub Desktop Application Audit

**Audit date:** 2026-08-14  
**Scope:** `/Users/macsolutions/Desktop/dine-hub-desktop-app`  
**Mode:** Read-only, non-destructive  
**Audited version:** `1.0.10`

## Executive summary

DineHub Desktop is a React 19 + TypeScript + Electron 33 restaurant-management client. It is not a full-stack repository: the backend, database schema, migrations, queues, mail/SMS/payment services, Docker, Nginx, and production infrastructure are absent. The client calls the remote `http://localhost:3000/api/v1` API through an Electron IPC bridge; a separate browser bridge supports the web build.

The project compiles and all 57 existing tests pass. The configured remote API is reachable, validates malformed login requests, protects sampled private endpoints, rejects an untrusted CORS origin, and returns good baseline HTTPS/security headers. However, this is not sufficient to declare authenticated features working: interactive browser control was unavailable, using the README's demo credentials was not authorized, and no test backend/database was supplied. Accordingly, most business features are **NOT TESTED at runtime** and are classified from integration evidence only.

The largest confirmed risks are outdated/vulnerable build/runtime dependencies, an unrestricted external-URL IPC boundary, non-functional offline claims, missing end-to-end/integration coverage, and very large monolithic renderer bundles. Production readiness is **45/100**.

## Technology and architecture

| Area | Finding |
|---|---|
| Desktop | Electron 33, `electron-vite`, `electron-builder` |
| Frontend | React 19, React Router 7, TypeScript 5.7, Tailwind, Radix UI |
| State/data | Redux Toolkit, Zustand, TanStack Query, Axios |
| Validation | Zod + React Hook Form (not consistently used on all forms) |
| Realtime | Socket.IO client via Electron main process |
| Credential storage | Electron `safeStorage` + `electron-store`; browser build uses `sessionStorage` |
| Backend/database | Remote service only; implementation and schema unavailable |
| Offline | IndexedDB helper/queue exists but is not integrated; no service worker/PWA manifest |
| Deployment | Electron packaging and GitHub updater metadata only; no Docker/Nginx/health checks/backups |

## Evidence and commands

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm test` | PASS: 12 files, 57 tests, 0 failed, 0 skipped |
| `npm run build` | PASS |
| `npm run build:web` | PASS with chunk-size warning |
| `npm run dev:web` | Server starts; Vite optimizer reports unresolved `@emotion/is-prop-valid` imported from prior `out/renderer` output |
| `npm audit --json` | FAIL/RISK: 29 advisories: 2 critical, 23 high, 4 moderate |
| Coverage | NOT AVAILABLE: no coverage provider/script/configuration |
| Interactive UI/E2E | NOT TESTED — in-app browser unavailable in this session |
| Authenticated API | NOT TESTED — no explicitly authorized test account; documented credentials were not used |
| Database | NOT TESTED — no schema, migrations, connection, or test database in scope |

## Live API tests

The following non-destructive requests were made to the configured development API.

```text
Feature: Public subscription plans
Test: GET /tenants/plans
Expected Result: 200 JSON plan list
Actual Result: 200, success=true, plan data returned
Status: WORKING
Error: None
Root Cause: N/A

Feature: Login validation
Test: POST /auth/login with malformed email and empty password
Expected Result: Structured 4xx validation response
Actual Result: 400 with both field validation errors
Status: WORKING
Error: None
Root Cause: N/A

Feature: Authentication enforcement
Test: unauthenticated GET /auth/me, /tenants, /users, /inventory/items
Expected Result: 401 for every protected endpoint
Actual Result: 401 "Authentication required" for all four
Status: WORKING (sampled endpoints only)
Error: None
Root Cause: N/A

Feature: CORS
Test: preflight from https://evil.example to /auth/login
Expected Result: untrusted origin not allowed
Actual Result: no Access-Control-Allow-Origin header returned
Status: WORKING (sampled origin only)
Error: None
Root Cause: N/A
```

The API returned HSTS, CSP, `nosniff`, frame protection, referrer policy, and cross-origin policies. Rate limiting was not safely load-tested.

## Feature inventory and test matrix

Legend: 🟢 working, 🟡 partially working/integration present, 🔴 not working, ⚫ not implemented, 🔵 mock/static.

| Feature | Frontend | Backend client | Database | Tested | Status | Severity / issue |
|---|---:|---:|---:|---:|---|---|
| Login | Yes | `/auth/login` | Remote | Invalid-input only | 🟡 | Valid login/UI flow not tested |
| Registration | No route/page | `/auth/register` wrapper | Remote | No | ⚫ | API wrapper exists but no accessible UI |
| Logout | Layout/auth store | `/auth/logout` | Remote | No | 🟡 | Runtime invalidation not verified |
| Forgot password | Yes | `/auth/forgot-password` | Remote | No | 🟡 | Reset-password UI route is missing |
| Reset password | No | `/auth/reset-password` wrapper | Remote | No | ⚫ | No token-consumption screen/route |
| OTP login/verification | PIN page only | OTP + PIN endpoints | Remote | No | 🟡 | Email OTP UI flow not evident |
| Email verification | No | `/auth/verify-email` wrapper | Remote | No | ⚫ | No UI route |
| Account/profile/password | Yes | `/auth/me`, change-password | Remote | No | 🟡 | No authenticated runtime test |
| Sessions/lock/shift | Yes | Session, lock, shift APIs | Remote | No | 🟡 | Integration present, unverified |
| Roles/permissions | Yes | Role/permission CRUD | Remote | No | 🟡 | Route guards exist; server-side RBAC unverified |
| Tenant/SaaS administration | Yes | Tenant CRUD/flags/domains/usage | Remote | Public plans only | 🟡 | Admin authorization not tested |
| Dashboard | Yes | `/dashboard/stats` | Remote | No | 🟡 | API-bound, unverified |
| POS/cart/checkout | Yes | Orders/customers/tables APIs | Remote | Unit utilities only | 🟡 | Payment processing API is a stub; full sale unverified |
| Orders/sales | Yes | Orders CRUD/status/history | Remote | Utilities only | 🟡 | No end-to-end CRUD test |
| Tables/merge/transfer | Yes | Tables APIs | Remote | No | 🟡 | No runtime test |
| QR ordering/waiter calls | Yes | QR ordering APIs | Remote | Wrapper tests | 🟡 | Live QR/public flow unverified |
| Kitchen display | Yes | Orders/realtime | Remote | Utility tests | 🟡 | `kitchenApi` stub exists; live KDS unverified |
| Menu categories/items | Yes | Full menu APIs | Remote | Wrapper tests | 🟡 | Real CRUD and upload unverified |
| Modifiers/combos | Yes | CRUD/association APIs | Remote | Wrapper tests | 🟡 | Real persistence unverified |
| Inventory/warehouses | Yes | Dashboard/items/warehouses | Remote | No | 🟡 | Real CRUD/data integrity unverified |
| Transfers/purchase orders/suppliers | Yes | APIs present | Remote | No | 🟡 | Real status transitions unverified |
| Purchases/vendors | Yes | APIs present | Remote | No | 🟡 | Runtime unverified |
| Customers | Yes | CRUD/phone lookup | Remote | No | 🟡 | Runtime unverified |
| Users/departments/invites/audit | Yes | Extensive APIs | Remote | No | 🟡 | Search input appears unwired in users page; RBAC unverified |
| Employees/staff | Yes | Generic employee/user APIs | Remote | No | 🟡 | Runtime unverified |
| Attendance | Yes | List/summary/mark/export | Remote | No | 🟡 | Runtime unverified |
| Reservations | Yes | CRUD/status | Remote | No | 🟡 | Runtime unverified |
| Reports/export | Yes | Sales/export | Remote | Transport byte tests | 🟡 | Real report correctness/download unverified |
| CRM/campaigns/offers/loyalty | Yes | APIs present | Remote | No | 🟡 | Email/SMS delivery integration unavailable |
| Accounting/expenses | Yes | APIs present | Remote | No | 🟡 | Runtime and ledger integrity unverified |
| Analytics | Yes | API present | Remote | No | 🟡 | Runtime/statistical correctness unverified |
| Notifications | Yes | API + Socket.IO | Remote | No | 🟡 | Delivery/reconnect not tested |
| Restaurant/tax settings | Yes | GET/PUT APIs | Remote | No | 🟡 | Runtime unverified |
| Printing | Yes | Electron IPC | Local OS | No | 🟡 | Printer/device behavior not tested |
| File/image upload | Yes | Multipart main-process upload | Remote | Validation source only | 🟡 | Magic-byte/content validation absent client-side; backend unknown |
| Payments | Checkout UI methods | Stub only | Unknown | No | ⚫ | No payment gateway/API implementation in repo |
| Recipes | No complete UI | Stub only | Unknown | No | ⚫ | Explicit API stub |
| Audit-log generic API | Users audit page | One real users endpoint; generic stub | Remote | No | 🟡 | Mixed implementation |
| Offline cache/sync | Banner/helper only | `/sync/push` wrapper | IndexedDB | Source inspection | 🔴 | Helpers unused; no cached navigation or queued actions |
| PWA/installability | No | No | No | Source inspection | ⚫ | No service worker or manifest |
| Auto-update | Button/status | electron-updater | N/A | No | 🟡 | Signing/update feed runtime not verified |
| Browser/web deployment | Web build | Browser bridge | Session storage | Build only | 🟡 | Different security/storage model; runtime optimizer error |

## API inventory

Authentication is expected for all endpoints except login/register/password recovery, tenant resolution/plans, invites as designed, and public QR routes. Actual role enforcement is server-owned and could not be exhaustively verified.

| Domain | Methods and endpoint families | Client purpose | Runtime status |
|---|---|---|---|
| Auth | POST `/auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/otp/request`, `/otp/verify`, `/verify-email`, `/change-password`, `/pin/set`, `/pin/login`, `/lock`, `/unlock`, `/shifts/open`, `/shifts/close`; GET `/auth/me`, `/sessions`, `/permissions`, `/roles`, `/lock-status`, `/shifts`; PUT/DELETE role/session assignments | Identity, RBAC, shifts | Validation/protection sampled; authenticated flows not tested |
| Tenants | GET/POST `/tenants`; GET/PUT/DELETE `/tenants/:id`; restore, subscribe, flags, domains, usage; public plans/resolve/check-slug | SaaS administration | Plans working; private endpoints protected in sample |
| Dashboard | GET `/dashboard/stats` | KPI cards | Not tested |
| Menu | CRUD `/menu/categories`, `/menu/items`; bulk toggle; `/files/upload` | Catalog | Wrapper/transport tested only |
| Modifiers/combos | CRUD `/modifiers/groups`, `/modifiers/options`, `/combos`; item associations | Catalog composition | Wrapper tested only |
| Orders/POS | GET/POST/PATCH `/orders` and order subresources | Sales lifecycle | Utilities tested only |
| Tables | GET/POST `/tables`; status, transfer, merge | Seating | Protected sample only |
| QR | QR code/config/public menu/public order/waiter request endpoint families | Guest ordering | Wrapper tested only |
| Customers | CRUD `/customers`, phone lookup | CRM/POS customer | Not tested |
| Inventory | Dashboard; warehouse/item CRUD; adjustments; transfers; logs; suppliers; purchase orders; alerts; export | Stock control | Protected sample only |
| Staff/users | Employee/user CRUD; roles; departments; invitations; sessions; audit logs | Workforce/IAM | Protected sample only |
| Attendance | GET list/summary/export; POST attendance actions | Timekeeping | Not tested |
| Reservations | CRUD/status `/reservations` | Booking | Not tested |
| Reports | GET `/reports/sales`, `/reports/export` | Reporting | Transport bytes unit-tested only |
| Settings | GET/PUT `/settings/tax`, `/settings/restaurant` | Configuration | Not tested |
| Notifications | GET `/notifications`; PATCH read/read-all | Inbox | Not tested |
| Accounting/analytics | Expense/accounting/analytics endpoint families | Finance/BI | Not tested |
| Offers/loyalty/campaigns | CRUD/action endpoint families | Marketing | Not tested |
| Sync/billing | POST `/sync/push`; billing endpoint families | Offline reconciliation/subscription | Not integrated/not tested |

## Security risk matrix

| Vulnerability | Location | Severity | Exploitable? | Impact | Recommendation |
|---|---|---:|---|---|---|
| Vulnerable Electron 33 | `package.json` | HIGH | Conditional; renderer/local attack prerequisites vary | Multiple published Electron memory-safety/injection issues | Upgrade to a currently supported Electron release and retest packaging |
| Vulnerable Vitest/tar toolchain | lockfile/dev dependencies | HIGH in project context | Mainly developer/CI exposure | File read/execution or archive traversal/DoS during development/build | Upgrade Vitest, Vite, electron-builder and lock transitive versions |
| Unrestricted external URL opening | `electron/main/index.ts`, `electron/main/ipc/auth.ts` | HIGH | Yes if renderer is compromised or attacker controls a passed URL | Invocation of unsafe OS protocol handlers/phishing | Allow only `https:` (and explicit trusted hosts where possible); reject credentials/other schemes |
| Web tokens in sessionStorage | `src/platform/browserBridge.ts` | MEDIUM | Requires same-origin script execution | XSS can steal access/refresh tokens | Prefer secure HttpOnly cookies/BFF for web; maintain strict CSP and eliminate DOM injection sinks |
| HTML written to popup/print documents | browser bridge, settings print preview | MEDIUM | Depends on whether API/user fields reach HTML unsanitized | Script execution in web popup or unsafe printed markup | Generate DOM safely or sanitize with a maintained allowlist |
| File validation trusts MIME/extension metadata | menu upload IPC/client | MEDIUM | Yes if backend also trusts it | Polyglot/malicious content upload | Validate magic bytes and re-encode images server-side; randomize names; enforce storage isolation |
| Development sandbox disabled | `electron/main/index.ts` | LOW | Dev builds only | Greater impact from renderer compromise during development | Keep dev server local-only; consider sandbox in dev where tooling permits |
| No explicit navigation handler | main window | MEDIUM | Conditional | Compromised/redirected renderer may navigate main window away from trusted app | Deny unexpected `will-navigate` destinations and validate origins |
| Dependency advisories total 29 | `package-lock.json` | HIGH | Varies | Supply-chain/build/runtime exposure | Triage direct runtime dependencies first; apply upgrades with regression tests |
| README contains shared demo passwords | `README.md` | MEDIUM | If credentials are live | Unauthorized access to demo/possibly shared data | Remove passwords from repository; provision ephemeral test accounts; rotate if still active |
| Backend injection/IDOR/CSRF | Remote backend unavailable | UNKNOWN | NOT TESTED | Potential cross-tenant data access | Supply backend source and isolated test DB; add object-level authorization tests |

No committed `.env` files or hardcoded API-key/private-key values were found. Environment files are ignored. Actual secret values were not included in this report.

## Authentication and authorization findings

- Electron tokens are encrypted with OS-backed `safeStorage`; failure to provide secure storage prevents credential persistence. This is a good control.
- Refresh requests are single-flighted and concurrent 401 retry behavior has unit coverage.
- Sample protected endpoints correctly returned 401 without a token.
- Client route/feature/permission guards improve UX but are not a security boundary. Server-side permission and tenant isolation could not be verified.
- Logout, token revocation, expiry, replay, cross-tenant IDOR, normal-user-to-admin access, password reset token handling, OTP replay/expiry, brute-force throttling, and session concurrency are **NOT TESTED**.
- The web build uses a materially weaker token model (`sessionStorage`) than Electron. Security claims in the README apply only to the desktop build.

## Offline/PWA result

**Can this application actually be used offline? NO.**

```text
Offline Support: NO
Offline pages: None proven; no service worker/app-shell cache
Offline actions: None integrated
Data persistence: IndexedDB helper exists, but application queries do not use it
Sync after reconnect: Queue processor exists, but no feature enqueues mutations
Problems: No service worker, manifest, cache strategy integration, offline fallback,
          mutation interception, conflict UI, or end-to-end tests
```

The offline banner/network status indicator does not constitute offline functionality. The six requested browser offline steps were **NOT TESTED — REASON: browser control unavailable**, but source inspection proves refresh/navigation cannot be reliably supported offline in the web build and API data is not cached through this module.

## Frontend, responsive, and UX findings

- Interactive page/button/modal/table testing is **NOT TESTED — REASON: in-app browser unavailable and no E2E harness**.
- The Electron window enforces `minWidth: 1024`, so mobile/tablet desktop-window testing below that width is structurally impossible. The web build has responsive classes but was not visually verified.
- Search inputs in inventory logs and user management appear present without clear filtering handlers, indicating static/dead controls.
- All routes are eagerly imported; this contributes to the 3.67 MB Electron renderer and 1.69 MB web JS bundle.
- Logo assets are unusually large (approximately 156 KB and 695 KB) for persistent chrome.
- Error and empty states exist on several pages, but consistency across every module was not verified.
- Accessibility has not been automated (no axe tests); keyboard, focus trap, labels, contrast, and screen-reader behavior remain unverified.

## Database audit

**NOT TESTED — REASON:** this client repository contains no database models, schema, migrations, seeders, or connection configuration. Tables, constraints, indexes, foreign keys, tenant scoping, soft deletes, orphan handling, N+1 queries, and backup/restore cannot be audited from API DTOs. An isolated backend repository and test database are required.

## Performance findings

- No route-level code splitting; every feature page is imported into the initial bundle.
- Electron renderer JS is ~3.67 MB minified; web JS is ~1.69 MB (~489 KB gzip), exceeding Vite's warning threshold.
- Large brand assets add ~850 KB before application data.
- Backend query latency/N+1/indexing cannot be measured without backend and DB access.
- TanStack Query has a reasonable five-minute stale time and disables refetch on focus, reducing duplicate traffic.
- No repeatable performance budgets, Lighthouse runs, React profiling, or API load tests exist.

## Code quality and testing

Strengths: strict typecheck passes; API transport is centralized; token refresh has focused tests; feature/permission routing is structured; error DTO normalization exists; production Electron CSP/context isolation/node isolation are configured.

Debt: large feature components (notably inventory), duplicated/overlapping API modules (`phase1`, `phase2`, domain modules, and stubs), no lint script, no E2E/component tests, no coverage, no backend contract tests, no API schema generation, and misleading README language (“offline prepared”, secure tokens) that does not clearly distinguish web behavior and completed integration.

## Deployment/production audit

Electron builds succeed, but production readiness is blocked by dependency advisories, no evidence of code signing/notarization configuration, unverified update publishing/signatures, no automated release smoke tests, and no disaster-recovery/backend deployment material. Docker, Compose, Nginx, SSL termination, database backups, workers, cron, queues, caching, monitoring, alerting, PM2/systemd, and health checks are **NOT IN THIS REPOSITORY**. Backend HTTPS headers are good in sampled responses.

## Scores

```text
Functionality:          55/100  — broad integration surface, little runtime proof
Security:               52/100  — good Electron isolation/storage, serious dependency and IPC risks
Performance:            42/100  — successful build, monolithic oversized bundles
Code Quality:           64/100  — type-safe structure, duplication and very large modules
UI/UX:                  50/100  — comprehensive screens, interaction not visually tested
Responsive:             35/100  — web styles exist; desktop minimum width blocks small viewports
Offline Support:         5/100  — unused helper code only
Testing Coverage:       28/100  — 57 passing tests, no coverage/component/E2E/backend tests
Production Readiness:   45/100  — builds, but security/runtime/operations gaps remain

OVERALL SCORE:          45/100
```

## Critical bugs and recommended fix order

1. Upgrade Electron, Vitest/Vite, electron-builder, PostCSS, React Router, and affected transitives; rerun audit/build/package tests.
2. Validate and allowlist all external navigation/open calls; add a main-window navigation deny policy.
3. Remove/rotate shared credentials documented in the repository and establish ephemeral test users.
4. Decide whether offline support is a real requirement. Either integrate caching/queue/conflict handling with tests or remove the claim and dead module.
5. Add an isolated backend/test DB and an E2E suite covering login/logout, password recovery/reset, RBAC, tenant isolation/IDOR, POS checkout, order lifecycle, inventory integrity, and admin APIs.
6. Implement the missing reset/email-verification/registration/payment flows or remove inaccessible wrappers/UI promises.
7. Split routes with dynamic imports, optimize image assets, and enforce bundle budgets.
8. Wire or remove static controls such as unhandled search fields; add consistent validation, loading, empty, error, retry, and double-submit handling.
9. Add ESLint, coverage thresholds, component tests, accessibility tests, and contract tests.
10. Audit the backend repository separately for schema constraints, injection, rate limits, queues, payment/email integrations, logs, backups, monitoring, and deployment.

## Audit limitations

- No destructive requests, real CRUD mutations, bulk actions, payments, emails/SMS, uploads, or load attacks were performed.
- No authenticated session was used because no test account was explicitly authorized.
- Interactive browser, responsive screenshots, console inspection, network throttling, and actual offline refresh were unavailable.
- Desktop printer, notification, updater, filesystem download, and OS-window behavior require a GUI/device test environment.
- A passing client wrapper test proves request construction, not remote feature correctness.

These limitations are intentionally reflected in statuses and scores; no untested feature is marked fully working.
