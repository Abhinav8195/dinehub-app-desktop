# DineHub Desktop Integration Matrix

Last audited: 29 July 2026

Contract basis: repository API services, `DineHub-Desktop-Feature-and-API-Audit.docx`, and the supplied integration requirements. The requested backend files `docs/BACKEND-COMPLETION-MATRIX.md`, `docs/DINEHUB-BACKEND-COMPLETION-PROMPT.md`, and a Swagger/OpenAPI document are not present in this repository. Routes not verified by the available evidence remain unavailable in the UI.

| Module / visible control | Current UI status | API method and route / request / response | Access requirements | Loading, empty, error, offline behavior | Status / backend dependency |
|---|---|---|---|---|---|
| Electron API request | Working | Typed method, path, query, headers, JSON body, response type and timeout; returns status, headers and structured JSON or exact bytes | Auth token and `X-Tenant-Slug` attached in main process | Normalized transport errors; one refresh/retry; unsafe external paths rejected | Implemented |
| Browser-only renderer | Guarded | No API call | Electron preload required | Dedicated launch guidance instead of repeated bridge failures | Implemented |
| Login / session restore / logout | Working | `/auth/*`; typed auth DTOs | Tenant context where required | Splash while restoring; unrecoverable refresh clears credentials | Existing |
| Dashboard cards / refresh | Working | Dashboard statistics service | Dashboard feature and permissions | Page skeleton, error and empty handling through shared shell | Existing |
| POS voucher Apply | Working | `GET /orders/preview-totals?subtotal=&voucherCode=` → authoritative `OrderTotalsPreview` | POS access | Pending spinner; server reason displayed; no local voucher table; preserved cart offline | Implemented |
| POS order creation | Working | `POST /orders` → `PosOrder` | POS access | Duplicate submission blocked; offline creation refused and cart preserved | Implemented |
| Orders list / detail / status | Working | `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` | Orders permissions | Existing skeleton/error/empty states | Existing |
| Report CSV/XLSX/PDF export | Working | `GET /reports/export?format=&from=&to=` → exact bytes plus content headers | Reports export entitlement | Native save dialog; cancel, saved and failure distinguished | Implemented |
| Menu / category / modifier / combo CRUD | Working | `/menu/*`, `/modifiers/*`, `/combos/*`, `/files/upload` | Menu permissions | Existing pending, empty and error UI; upload progress | Existing |
| Tables / kitchen / waiter calls | Working | Tables, kitchen and QR waiter-request services | Corresponding entitlements and permissions | Manual refresh plus authenticated realtime updates | Existing |
| Customers | Working | Customer list/create/phone lookup APIs | Customers permission | Existing query states | Existing |
| Customer Notes tab | Unavailable | Required `/customers/:id/notes` routes supplied, but no selected-customer notes UI exists | Customer note permissions not verified | Tab must not imply completion | Backend permission contract and UI workflow remain |
| Inventory CRUD / transfer / logs | Partial | Inventory service routes | Inventory permissions | Core pages query live APIs | Barcode capture and complete server-filtered logs remain |
| Scan Barcode | Unavailable | Required `GET /inventory/items/barcode/:barcode` | Inventory view | Control must remain disabled until keyboard-wedge workflow is implemented | UI workflow remains |
| Purchasing Export | Unavailable | No export route verified | Purchasing permission | Truthful unavailable state required | Verified backend export route missing |
| Notifications filters/read/delete | Partial | `GET /notifications`; read routes implemented; delete/category routes required | Notifications permission; tenant-wide delete may require manager | List/read live; delete and category UI remain | Delete/unread/bulk UI and tests remain |
| Employees / staff actions | Unavailable | Lists are live; mutation route contract not locally available | Employee/staff permissions | Inactive controls must be disabled or hidden | Verified mutation routes missing |
| Users edit/reset/manage roles | Unavailable | User list live; route contract not locally available | User/role permissions | Menu actions must not imply success | Verified mutation routes missing |
| CRM campaigns | Partial | Campaign service CRUD/send exists | Campaign entitlement | Existing query feedback | Header creation workflow and customer notes remain |
| Settings / printers / language | Partial | Restaurant/tax/printer service routes | Settings permissions | Existing API states | Persisted language/device printer override contract requires verification |
| Plans | Partial | Tenant plans API | Tenant context | Existing load/error behavior | UI must consistently use `priceMonthly`/`priceYearly`; full audit remains |
| SaaS Add Restaurant | Unavailable | Tenant creation exists in tenant admin | Tenant-admin permission | Must reuse validated tenant form | Shared-form extraction remains |

## Verification

- `npm run typecheck`
- `npm test`
- `npm run build`

Electron login and authenticated contract smoke tests require test-tenant credentials and are not run against production.
