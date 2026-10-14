# Requirements Checklist — Student Guide Map

Source: `Student_Guide_Map_Form_Yeu_Cau_Chuc_Nang.docx` (primary spec).
Status legend: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`.

## Stack (final)

- **Frontend**: React 18 + TypeScript + Vite + Tailwind v4, **Vietmap GL JS** (`@vietmap/vietmap-gl-js`)
  — key: `VITE_VIETMAP_API_KEY` (see `web/.env`). Replaces the originally planned Leaflet/OSM.
- **Backend**: Express 4 + TypeScript + Prisma 6 + PostgreSQL 17.
- **Auth**: JWT access (15 min) + rotating refresh cookie `sgm_refresh` (HttpOnly, path `/api/v1/auth`), bcryptjs.
- **Validation**: zod. **Uploads**: multer, local `server/uploads/`. **Tests**: vitest + supertest.

## Functional checklist

### Student
| Requirement | Status |
|---|---|
| Register / Login / Logout / OTP verify | DONE |
| Forgot + reset password | DONE |
| Search by name / address / keyword / category | DONE |
| Filters: category, distance, price, rating, open, promotion | DONE |
| Sort: nearest, rating, price, newest | DONE |
| Map view: markers, user location, popup, list↔map toggle | DONE (Vietmap GL) |
| Location detail: name, address, images, phone, hours, price, distance, rating, promos | DONE |
| Distance + estimated travel time | DONE (haversine + walkingMinutes) |
| Directions ("Chỉ đường") | DONE (deep-link to Google Maps / Vietmap) |
| Promotions list + detail + category filter | DONE |
| Price comparison across same-category locations | DONE (priceReferences in detail) |
| Open/closed status from opening hours (server-computed) | DONE (`getOpenStatus`) |
| Reviews: create (1–5★ + comment), edit own, delete own | DONE |
| Average rating + breakdown | DONE (ratingBreakdown in detail) |
| Favorites: add / remove / list (no duplicates) | DONE |
| Report incorrect info (5 reasons, 4 states) | DONE |
| Profile view/update, change password | DONE |
| My reviews / My reports pages | DONE |
| Notifications (account + approval events) | DONE |
| Suggest new location (via report/propose) | DONE (report type NEW_LOCATION) |

### Store Owner
| Requirement | Status |
|---|---|
| Register (create) location → PENDING | DONE |
| Add / edit store location info | DONE |
| Update opening hours (7-day grid, closed days) | DONE |
| Upload / delete images | DONE |
| Create / update student promotions → PENDING | DONE |
| View student reviews | DONE |
| Reply to reviews (edit/delete own reply) | DONE |
| Submit correction request for location info | DONE |
| Store dashboard (own data only) | DONE |

### Admin
| Requirement | Status |
|---|---|
| Login | DONE |
| Manage student accounts (list, block/unblock) | DONE |
| Manage store accounts | DONE |
| Add / edit / delete locations | DONE |
| Approve / reject new locations (with reason) | DONE |
| Approve / reject promotions | DONE (`POST /admin` decide via `POST /promotions/:id/decide`) |
| Manage reviews (hide / delete violations) | DONE (`PATCH /reviews/:id/moderate`) |
| Process reports (PENDING → IN_PROGRESS → RESOLVED / REJECTED) | DONE (`PATCH /reports/:id/process`) |
| Manage categories (CRUD) | DONE (`/admin/categories`, FE page `/admin/categories`) |
| Statistics: users, owners, locations, pending, promotions, reports, reviews (real data) | DONE (`/admin/statistics`, FE page `/admin/statistics`) |

### Architecture / quality
| Requirement | Status |
|---|---|
| REST API `/api/v1/*`, consistent response format `{success,data,message,errors}` | DONE |
| RBAC enforced server-side (STUDENT / STORE_OWNER / ADMIN) | DONE (`requireRole`) |
| Password hashing (bcrypt), JWT auth, rate limiting | DONE (authLimiter/writeLimiter, skipped in tests) |
| Input validation (zod), SQL injection / XSS protection | DONE (Prisma parameterized) |
| CORS, secure errors, no secrets in FE | DONE |
| Image upload validation (type/size/safe names) | DONE |
| Server-side search/filter/pagination | DONE |
| Indexes on hot query columns | DONE (init migration) |
| Loading / empty / error states everywhere | DONE (FE) |
| Responsive (desktop / tablet / mobile) | DONE (Tailwind breakpoints) |
| Accessibility (semantic, keyboard, focus, contrast) | DONE (basic) |
| Seed data (demo accounts, categories, locations, reviews, promos, reports) | DONE |
| Tests: auth, locations, reviews, favorites, promotions, reports + E2E flows | DONE (33 tests, all pass) |
| README.md + .env.example | DONE |
| design.md (Stitch design system) | DONE |
| Admin promotions moderation queue endpoint + FE tab | DONE (`GET /admin/promotions`, `/admin` promotions tab) |

## Test accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@sgm.local | Admin@123 |
| Owner | owner1..3@sgm.local | Owner@123 |
| Student | student1..6@sgm.local | Student@123 |

## Verification (2026-10-11)

- `npx tsc --noEmit` clean (server + web).
- `npm run build` (web) succeeds.
- `npx vitest run` (server): **33/33 tests pass**.
- E2E via FE proxy (`http://localhost:5173/api/v1`): login, search (13 approved), detail (`openingHours`=7, `openStatus` computed), categories (10), favorites, notifications, admin statistics (topRated=5), admin pending promotions (1) — all OK.
- Both dev servers running: BE `:4000`, FE `:5173` (Vite proxy → BE).

## Known issue — Vietmap tile quota (RESOLVED 2026-10-11)

- **Root cause**: key `641c8684…` (Consumer) chỉ có quyền search/route/static — **không có quyền Tilemap** (423 "Your request is limited").
- **Fix**: tạo key Tilemap riêng `6bb862fd4752f473d3493d464aea4c15518faf3543395e47` → `web/.env` `VITE_VIETMAP_API_KEY`. Key cũ giữ trong `server/.env` cho Route API.
- **Verified**: tile via proxy 200 (26KB), style via proxy 200 (115KB), BE route 200 (612m polyline), BE health 200, FE 200.
- **Infrastructure in place**:
  - Vite dev proxy `/vietmap` → `https://maps.vietmap.vn` (same-origin, no CORS).
  - `MapView.tsx` `transformRequest` rewrites every Vietmap request through the proxy (absolute URL via `window.location.origin`).
  - `map.remove()` wrapped in try/catch (React StrictMode double-mount AbortError silenced).
