# API Reference — Student Guide Map v1

Base: `http://localhost:4000/api/v1`

## Conventions

**Envelope**
```json
{ "success": true, "data": ..., "message": "…", "errors": [] }
```
List responses wrap items:
```json
{ "data": { "items": [...], "meta": { "page", "limit", "total", "totalPages" } } }
```

**Auth**
- Access token: `Authorization: Bearer <jwt>` (15 min)
- Refresh token: httpOnly cookie `sgm_refresh`, path `/api/v1/auth`, 7 d, rotated on use
- Roles: `STUDENT`, `STORE_OWNER`, `ADMIN`

**Errors**: 400 validation, 401 unauth, 403 forbidden, 404 not found, 409 conflict, 429 rate limit.

---

## Auth — `/auth`

| method | path | auth | body | notes |
|---|---|---|---|---|
| POST | `/register` | – | `{fullName, email, password, role?, storeName?, phone?}` | 201; OTP emailed |
| POST | `/verify-otp` | – | `{email, code}` | activates account |
| POST | `/resend-otp` | – | `{email}` | |
| POST | `/login` | – | `{email, password}` | returns `{accessToken, user}` + refresh cookie |
| POST | `/refresh` | cookie | – | rotates tokens; old cookie rejected |
| POST | `/logout` | cookie | – | revokes refresh token |
| POST | `/forgot-password` | – | `{email}` | always 200 (no leak) |
| POST | `/reset-password` | – | `{email, code, newPassword}` | revokes all sessions |
| GET | `/me` | ✓ | – | current user profile |

## Categories — `/categories`

| method | path | auth | notes |
|---|---|---|---|
| GET | `/` | – | active categories |

## Locations — `/locations`

| method | path | auth | notes |
|---|---|---|---|
| GET | `/` | optional | query: `q, category(slug/id), priceLevel, minRating, open=true, hasPromotion=true, lat, lng, radiusKm, bbox=swLat,neLat,swLng,neLng, sort=nearest\|rating\|price\|newest, page, limit` |
| GET | `/compare?categoryId=&exclude=` | – | price comparison across same category |
| GET | `/:id?lat=&lng=` | optional | detail: hours, images, prices, active promos, rating breakdown, `openStatus`, distance, `isFavorite`, `myReview` |
| POST | `/` | OWNER/ADMIN | `{name, address, lat, lng, categoryId, priceLevel, …}` → PENDING |
| PATCH | `/:id` | OWNER/ADMIN | update own location |
| PUT | `/:id/hours` | OWNER/ADMIN | `{hours: [{day, openTime, closeTime, isClosed}]}` |
| POST | `/:id/images` | OWNER/ADMIN | multipart `images[]` ≤8, jpeg/png/webp ≤5 MB |
| DELETE | `/:id/images/:imageId` | OWNER/ADMIN | |
| PUT | `/:id/prices` | OWNER/ADMIN | `[{itemName, price}]` (replaces all) |
| POST | `/:id/decide` | ADMIN | `{decision: APPROVED\|REJECTED, reason?}` — notifies owner |
| DELETE | `/:id` | ADMIN | hard delete |

## Reviews — `/reviews`

| method | path | auth | notes |
|---|---|---|---|
| GET | `/?locationId=&page=&limit=&sort=newest\|rating` | – | DISPLAYED only |
| GET | `/mine` | ✓ | |
| POST | `/` | STUDENT/ADMIN | `{locationId, rating 1–5, comment≤500}`; one per user/location; anti-spam 5/10 min |
| PATCH | `/:id` | owner of review/ADMIN | |
| DELETE | `/:id` | owner/ADMIN | ADMIN soft-delete |
| POST/PATCH/DELETE | `/:id/reply` | OWNER/ADMIN | one reply per review; notifies reviewer |
| PATCH | `/:id/moderate` | ADMIN | `{status: DISPLAYED\|HIDDEN\|DELETED}` |

Rating aggregates (`Location.ratingAvg/Count`) are recomputed on every review write.

## Favorites — `/favorites`

| method | path | auth | notes |
|---|---|---|---|
| GET | `/?lat=&lng=` | ✓ | adds distance when coordinates given |
| POST | `/:locationId` | ✓ | idempotent add |
| DELETE | `/:locationId` | ✓ | |

## Promotions — `/promotions`

| method | path | auth | notes |
|---|---|---|---|
| GET | `/?category=&locationId=&q=&page=&limit=` | – | ACTIVE + within date window only |
| GET | `/:id` | – | public detail |
| GET | `/mine` | OWNER/ADMIN | own promotions any status |
| POST | `/` | OWNER/ADMIN | `{locationId, title, content, discountLabel?, conditions?, startDate, endDate}` → PENDING |
| PATCH/DELETE | `/:id` | OWNER/ADMIN | |
| POST | `/:id/decide` | ADMIN | `{decision: ACTIVE\|REJECTED, reason?}` — notifies owner |

## Reports — `/reports`

| method | path | auth | notes |
|---|---|---|---|
| POST | `/` | STUDENT/ADMIN | `{locationId, type, content?}`; blocks duplicate open report |
| GET | `/mine` | ✓ | |
| GET | `/?status=&page=&limit=` | ADMIN | |
| PATCH | `/:id/process` | ADMIN | `{status, adminNote?}` — notifies reporter |

## Notifications — `/notifications`

| method | path | auth |
|---|---|---|
| GET | `/?page=&limit=` | ✓ |
| PATCH | `/:id/read` | ✓ |
| POST | `/read-all` | ✓ |

## Store (owner dashboard) — `/store`

| method | path | auth | notes |
|---|---|---|---|
| GET | `/dashboard` | OWNER/ADMIN | stats + 5 latest reviews |
| GET | `/locations` | OWNER/ADMIN | own locations |
| GET | `/reviews?page=&limit=` | OWNER/ADMIN | reviews on own locations |
| POST | `/correction-requests` | OWNER/ADMIN | `{locationId, field?, description}` |
| GET | `/correction-requests` | OWNER/ADMIN | own requests |

## Admin — `/admin`

| method | path | auth | notes |
|---|---|---|---|
| GET | `/dashboard` | ADMIN | totals: users, locations, pending queues, reviews |
| GET | `/statistics` | ADMIN | 6-month user/review trends, category distribution, top rated |
| GET | `/users?role=&q=&status=&page=` | ADMIN | |
| PATCH | `/users/:id` | ADMIN | `{status: ACTIVE\|SUSPENDED}` (cannot suspend ADMIN) |
| GET/POST/PATCH/DELETE | `/categories…` | ADMIN | CRUD categories |
| GET | `/locations?status=&q=` | ADMIN | moderation queue |
| GET | `/reviews?status=&q=` | ADMIN | moderation queue |
| GET/PATCH | `/correction-requests…` | ADMIN | process correction requests |
