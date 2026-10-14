# ERD — Student Guide Map

PostgreSQL schema (Prisma). Source of truth: `server/prisma/schema.prisma`.

## Entities

```
User 1──∞ Location          (owner, STORE_OWNER/ADMIN)
User 1──∞ Review
User 1──∞ Favorite ──∞ Location
User 1──∞ Report
User 1──∞ CorrectionRequest
User 1──∞ RefreshToken
User 1──∞ Notification

Category 1──∞ Location
Location 1──∞ LocationImage
Location 1──∞ OpeningHour     (unique: locationId+day)
Location 1──∞ PriceReference
Location 1──∞ Promotion
Location 1──∞ Review 1──1 ReviewReply (owner = STORE_OWNER/ADMIN)
Location 1──∞ Report
Location 1──∞ CorrectionRequest
```

## Tables

### User
| column | type | notes |
|---|---|---|
| id | cuid | PK |
| fullName | text | |
| email | text | unique |
| passwordHash | text | bcrypt |
| phone | text? | |
| role | enum | STUDENT / STORE_OWNER / ADMIN |
| status | enum | PENDING_VERIFICATION / ACTIVE / SUSPENDED |
| avatarUrl | text? | |
| storeName | text? | STORE_OWNER profile |
| emailVerifiedAt | timestamp? | set on OTP verify |

### Location
| column | type | notes |
|---|---|---|
| id | cuid | PK |
| name, address, description | text | |
| lat / lng | float8 | haversine computed server-side, never stored |
| phone | text? | |
| categoryId | FK → Category | |
| ownerId | FK → User | |
| priceLevel | int 1–5 | |
| priceRange | text? | display string |
| status | enum | PENDING → APPROVED / REJECTED / SUSPENDED |
| activeStatus | enum | ACTIVE / INACTIVE (soft hide) |
| ratingAvg / ratingCount | float/int | **derived** from DISPLAYED reviews, recomputed on write |
| viewCount | int | incremented on detail view |
| approvedAt | timestamp? | |
| rejectionReason | text? | required when REJECTED |

### OpeningHour
`(locationId, day)` unique. `openTime`/`closeTime` as `"HH:mm"` text; `isClosed` flag per day.
Open/closed state is **computed** (`getOpenStatus`) — never stored.

### Review
`(userId, locationId)` unique. `rating` 1–5, `comment` ≤500. Status: DISPLAYED / HIDDEN / DELETED (admin soft-delete keeps history).

### Promotion
Owner creates → PENDING → admin ACTIVE / REJECTED. Auto-flip ACTIVE→EXPIRED when `endDate < now()`.

### Report
Student reports wrong info: type WRONG_ADDRESS / WRONG_PRICE / WRONG_HOURS / CLOSED / OTHER.
Status PENDING → IN_PROGRESS → RESOLVED / REJECTED. One open report per (user, location, type).

### RefreshToken / OtpToken
Refresh: sha256-hashed rotating token, 7d TTL, revoked on rotate.
OTP: sha256(code + JWT_SECRET), 6 digits, 10 min TTL, purpose VERIFY_EMAIL / RESET_PASSWORD.

## Indexes (high-traffic paths)
- Location: `(status, activeStatus)`, `(categoryId)`, `(ownerId)`, GIN trigram-free ILIKE via name/address text
- OpeningHour: unique `(locationId, day)`
- Review: `(locationId, status)`, unique `(userId, locationId)`
- Promotion: `(status, endDate)`, `(locationId)`
- Favorite: unique `(userId, locationId)`
- Report: `(status)`, `(reporterId, locationId, type)`

## Delete rules (deliberate)
- Deleting Category with locations → blocked (hide instead)
- Deleting Location → cascades images/hours/prices/promotions; reviews soft-kept via moderation history choice (schema uses Restrict on review→location to preserve integrity; use activeStatus to hide)
- Deleting User (admin) → blocked if ADMIN; locations owned → must reassign first
