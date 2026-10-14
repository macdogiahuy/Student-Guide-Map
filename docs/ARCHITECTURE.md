# Architecture — Student Guide Map

## 1. High-level

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  Frontend (Vite/React/TS)│  REST  │  Backend (Express/TS)    │
│  Tailwind · Leaflet      │ ─────► │  JWT auth · RBAC · zod   │
│  Axios API client        │  JSON  │  Service/Controller      │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │ OSM tiles / OSRM                  │ Prisma ORM
             ▼                                   ▼
      OpenStreetMap                        PostgreSQL 17
                                            + local /uploads
```

Monorepo layout (npm workspaces):

```
Tringuvailon/
├── design.md                 # Stitch design brief (UI source of truth)
├── docs/REQUIREMENTS.md      # requirements checklist
├── docs/ARCHITECTURE.md      # this file
├── package.json              # workspaces root, scripts
├── server/                   # backend
│   ├── prisma/schema.prisma, seed.ts
│   ├── src/
│   │   ├── app.ts, server.ts, env.ts
│   │   ├── lib/ (prisma, logger, errors, pagination)
│   │   ├── middleware/ (auth, rbac, validate, rateLimit, upload, error)
│   │   ├── modules/
│   │   │   ├── auth/  users/  categories/  locations/
│   │   │   ├── reviews/  favorites/  promotions/
│   │   │   ├── reports/  notifications/  store/  admin/
│   │   └── routes/v1.ts
│   ├── tests/
│   └── uploads/              # gitignored
└── web/                      # frontend
    ├── src/
    │   ├── app/ (router, providers)
    │   ├── api/ (client, endpoints, hooks)
    │   ├── components/ (ui/ primitives, layout/, location/, review/ …)
    │   ├── features/ (auth, search, map, dashboard-admin, dashboard-store …)
    │   ├── pages/
    │   ├── hooks/  lib/  types/
    │   └── styles/
    └── index.html
```

## 2. Backend architecture

- **Express 4 + TypeScript**, layered: `routes → middleware → controller → service → prisma`.
- Controllers only parse/validate & send; services hold business logic; repositories = Prisma.
- **Validation:** zod schemas per module, `validate()` middleware on every write/read route.
- **Errors:** `AppError(status, code, message)` → central error handler →
  `{ success:false, message, errors[] }`. Stack traces never leak.
- **Auth:** JWT access token (15m) + refresh token (7d, httpOnly cookie, rotated, hashed
  in DB). Guards: `requireAuth`, `requireRole(ADMIN|STORE_OWNER|…)`,
  ownership checks inside services.
- **Rate limiting:** strict on `/auth/*` (login/register/reset) — 10 req/15min/IP.
- **Uploads:** multer → `server/uploads/`, allowed `jpg/png/webp`, ≤5MB, random names,
  served at `/uploads/*`. Image rows in DB keep metadata; deleting row deletes file.
- **Notifications:** created transactionally on approval/rejection/report/reply events.
- **Email/OTP:** `mailer.ts` — SMTP if configured, else console log (dev).
- **Tests:** vitest + supertest against a test DB.

### RBAC matrix

| Resource | STUDENT | STORE_OWNER | ADMIN |
|---|---|---|---|
| locations read (approved) | ✔ | ✔ | ✔ |
| locations create/update | ✖ | own (→PENDING) | any |
| promotions create | ✖ | own location (→PENDING) | any |
| reviews CRUD | own | reply on assigned locations | moderate all |
| favorites / reports | own | ✖ | process reports |
| admin endpoints | ✖ | ✖ | ✔ |

## 3. Database architecture (see `docs/ERD.md`)

PostgreSQL + Prisma. Core entities:
`User(role)`, `OtpToken`, `RefreshToken`, `Category`, `Location`(owner, category,
approval status, geo point), `LocationImage`, `OpeningHour`, `Review`(unique
user+location), `ReviewReply`, `Favorite`(unique user+location), `Promotion`,
`Report`, `Notification`, `CorrectionRequest`, `PriceReference` (price comparison).

Design decisions:
- Opening hours in separate table (7 rows/location) — enables server-side OPEN/CLOSED.
- `ratingAvg`/`ratingCount` **derived**, updated transactionally on review write;
  `distance` **never stored** (computed from user coords with haversine).
- Price comparison via lightweight `PriceReference` (label + amount, category-consistent)
  instead of a full menu system — matches spec without over-engineering.
- Cascade rules chosen deliberately: delete location → cascade images/hours/price refs;
  reviews/favorites/reports/references **restrict or soft-delete** to keep history.

## 4. API architecture

Base `/api/v1`. Response envelope:

```json
{ "success": true, "data": …, "message": null, "errors": [] }
```

List responses: `data: { items: [], meta: { page, limit, total, totalPages } }`.

Endpoints (all in `docs/API.md` after implementation): auth, users/me, categories,
locations (search/filter/sort/nearby), reviews, favorites, promotions, reports,
notifications, store/*, admin/*.

Search/filter/sort/pagination run **server-side** (SQL `ILIKE`, range filters,
haversine ordering, indexed columns).

## 5. Authentication architecture

1. Register → create user (`PENDING_VERIFICATION`) → issue OTP (6 digits, 10 min, hashed).
2. Verify OTP → `ACTIVE` → login.
3. Login → verify bcrypt → access JWT (role, sub) + refresh cookie (opaque token,
   stored hashed, rotated on use).
4. Forgot password → OTP → reset → tokens revoked.
5. Guards read JWT; ownership validated in service layer (never trust FE).

## 6. Map integration

- **Leaflet + OpenStreetMap** raster tiles (no API key).
- Markers from search API results (`lat`,`lng` included when `withCoords=true`).
- User location: `navigator.geolocation` (optional permission) → FE sends
  `lat/lng` as query for distance sort/filter; fallback campus center.
- Distance: haversine in SQL/JS; walking time ≈ distance / 80 m·min.
- Directions: open `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot
  &route=from,to` (new tab); no keys.
- List ↔ map share one query state (URL params) so they stay in sync.

## 7. File storage

Local disk `server/uploads` in dev; path pattern `locations/<uuid>.webp`.
Metadata in `LocationImage`. Limits: 5 MB, `jpeg|png|webp`, randomized filenames,
no user-controlled paths. Swappable to S3 later via a `StorageAdapter` interface.

## 8. Frontend architecture

- React 18 + TS + Vite + React Router v6 + Tailwind CSS (tokens from `design.md`).
- **API client:** single Axios instance (`baseURL` from `VITE_API_URL`), interceptors
  for access token, refresh-on-401, error → toast normalization.
- **Auth state:** `AuthContext` (user, login/logout, bootstrap from `/users/me`).
- **Data fetching:** lightweight hooks (`useApi`/react-query style) with loading/error/
  empty states per screen.
- Feature folders; UI primitives in `components/ui`; business logic in `features/`,
  pages are thin.
- Map logic isolated in `features/map`.
- No hardcoded URLs, no mock data in production screens.
