# Student Guide Map — Stitch Design Brief & Design System

> Source of truth for UI/UX. This document is the design input for **Stitch** (and the
> specification the frontend must implement). Reference inspiration:
> `https://www.yumgo.vn/` — used for mood only, **not** copied.
>
> Style keywords: **trẻ trung · hiện đại · tối giản · tươi sáng · thân thiện với sinh viên**.

---

## 0. Stitch generation prompt (copy/paste)

Use this prompt in Stitch to generate the initial screens, then reconcile with the
canonical tokens in §1–§3 below.

```
Design a responsive web app "Student Guide Map" for FPT University students to discover
places around campus (food, coffee, printing, stationery, laundry, bike repair, pharmacy,
parking, convenience stores).

Style: young, modern, minimal, bright, friendly, inspired by yumgo.vn but original.
Mobile-first with bottom navigation on mobile, sidebar/dashboard layout for admin & store
owner areas. Rounded cards, soft shadows, generous whitespace, pill filters, large
touch targets (min 44px).

Colors: primary orange #FF6B35, secondary deep navy #10243E, accent teal #06D6A0,
background #FFF9F5, surface #FFFFFF, text #1B1B1F, muted #6B7280, border #EDE7E1,
success #16A34A, warning #F59E0B, error #EF4444, info #3B82F6.

Font: "Be Vietnam Pro" (fallback Inter, system-ui) — Vietnamese diacritics friendly.
Scale: 12/14/16/18/20/24/30/36/48.

Screens: Home, Search results, Map (list/map toggle), Location detail, Promotions,
Favorites, Login/Register/Forgot password, Profile, My reviews, My reports,
Notifications, Store owner dashboard + location/promotion/review management,
Admin dashboard + user/location/promotion/review/report/category management.

Map: OpenStreetMap + Leaflet, markers with price/rating chips, user location dot,
bottom sheet on mobile, side panel on desktop, "Chỉ đường" (directions) button.
```

---

## 1. Color system

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-primary` | Primary (Orange) | `#FF6B35` | CTAs, links, active nav, brand |
| `--color-primary-600` | Primary hover | `#E85A26` | Hover/pressed |
| `--color-primary-50` | Primary soft | `#FFF0E9` | Badges, soft backgrounds |
| `--color-secondary` | Secondary (Navy) | `#10243E` | Headings on dark, dashboard sidebar |
| `--color-accent` | Accent (Teal) | `#06D6A0` | Promotions, "Đang mở" status, highlights |
| `--color-bg` | Background | `#FFF9F5` | Page background |
| `--color-surface` | Surface | `#FFFFFF` | Cards, sheets, modals |
| `--color-surface-2` | Surface subtle | `#FDF4EE` | Hover rows, section bands |
| `--color-text` | Text | `#1B1B1F` | Body text |
| `--color-text-muted` | Muted | `#6B7280` | Secondary text, captions |
| `--color-border` | Border | `#EDE7E1` | Dividers, input borders |
| `--color-success` | Success | `#16A34A` | Approved, open, saved |
| `--color-warning` | Warning | `#F59E0B` | Pending approval, closing soon |
| `--color-error` | Error | `#EF4444` | Validation, rejected, destructive |
| `--color-info` | Info | `#3B82F6` | Info toasts, in-progress |

Contrast: body text `#1B1B1F` on `#FFFFFF` ≈ 16.5:1; muted `#6B7280` on white ≈ 5.0:1
(AA); white on `#FF6B35` ≈ 3.1:1 → **only for ≥18px bold or large UI**, buttons use
`#FFFFFF` text on `#E85A26` (≈ 3.6:1) with bold label; small text on orange uses navy.

### Status color mapping (from requirements §3.7)

| Domain | State | Color |
|---|---|---|
| Location | Chờ duyệt `PENDING` | warning |
| Location | Đã duyệt / Đang hoạt động `APPROVED/ACTIVE` | success |
| Location | Từ chối `REJECTED` | error |
| Location | Tạm ngưng `SUSPENDED` | muted |
| Location | Đã đóng cửa (time-based) `CLOSED` | neutral grey |
| Promotion | Chờ duyệt `PENDING` | warning |
| Promotion | Đang hoạt động `ACTIVE` | accent teal |
| Promotion | Hết hạn `EXPIRED` | muted |
| Promotion | Bị từ chối `REJECTED` | error |
| Report | Chưa xử lý `PENDING` | error (attention) |
| Report | Đang xử lý `IN_PROGRESS` | info |
| Report | Đã xử lý `RESOLVED` | success |
| Report | Từ chối `REJECTED` | muted |
| Review | Đang hiển thị `DISPLAYED` | success |
| Review | Bị ẩn `HIDDEN` | warning |
| Review | Bị xóa vi phạm `DELETED` | error |

---

## 2. Typography

- **Font family:** `"Be Vietnam Pro", Inter, system-ui, sans-serif` (excellent Vietnamese
  diacritics; self-host or Google Fonts).
- **Scale (px / line-height):**

| Token | Size / LH | Weight | Use |
|---|---|---|---|
| `display` | 48 / 1.1 | 800 | Hero headline (desktop), 32px mobile |
| `h1` | 36 / 1.2 | 700 | Page title, 28px mobile |
| `h2` | 30 / 1.25 | 700 | Section title, 24px mobile |
| `h3` | 24 / 1.3 | 600 | Card group title, 20px mobile |
| `h4` | 20 / 1.35 | 600 | Card title |
| `body-lg` | 18 / 1.6 | 400 | Lead paragraph |
| `body` | 16 / 1.6 | 400 | Default body |
| `body-sm` | 14 / 1.5 | 400 | Card meta, list secondary |
| `caption` | 12 / 1.4 | 500 | Badges, timestamps, helper text |
| `button` | 16 / 1 | 600 | Buttons (14px for small) |
| `input` | 16 / 1.4 | 400 | Inputs (16px prevents iOS zoom) |

Rules: never below 12px; headings use `--color-secondary` or `--color-text`; muted text
only for non-essential info.

---

## 3. Spacing, radius, elevation, motion

- **Spacing:** 4px base — `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- **Radius:** `sm 8` (inputs), `md 12` (buttons), `lg 16` (cards), `xl 24` (sheets/modals),
  `full 999` (pills, avatars).
- **Elevation:** `shadow-sm` hairline, `shadow-md` cards (0 4px 16px rgba(16,36,62,.08)),
  `shadow-lg` modals/sheets, plus 1px `--color-border` on cards.
- **Motion:** 150–200ms ease-out for hover/press; skeleton shimmer 1.2s; sheet slide-up
  240ms `cubic-bezier(.32,.72,0,1)`; respect `prefers-reduced-motion`.
- **Grid:** 12-col, max-width `1200px`, gutter `24px` desktop / `16px` mobile.

---

## 4. Layout shells

### 4.1 Public / Student shell
- **Desktop:** sticky top navbar (logo · search · categories · nav links · user menu),
  content, fat footer.
- **Mobile (<768px):** compact top bar (logo + search icon + bell), **bottom nav**
  (Trang chủ · Tìm kiếm · Bản đồ · Ưu đãi · Yêu thích) + FAB for profile when logged out.
- Search results/map pages: sticky filter bar under navbar.

### 4.2 Store owner shell
- Desktop: left sidebar (Dashboard, Địa điểm, Ưu đãi, Đánh giá, Yêu cầu sửa, Hồ sơ).
- Mobile: top bar + bottom nav (Dashboard · Địa điểm · Ưu đãi · Đánh giá · Tài khoản).

### 4.3 Admin shell
- Desktop: dark navy sidebar (`--color-secondary`), grouped nav, content with
  page header + stat cards + tables.
- Mobile: hamburger drawer sidebar; tables become stacked cards.

---

## 5. Component library

All components defined with states: `default · hover · focus-visible · active · disabled ·
loading · error` where applicable. Focus ring: `2px solid #FF6B35` + `2px` offset.

### Navigation
| Component | Notes |
|---|---|
| `NavbarDesktop` | Logo, inline search, links: Trang chủ, Bản đồ, Ưu đãi; user dropdown |
| `NavbarMobile` | Logo, search icon → full-screen search, bell, avatar |
| `BottomNav` | 4–5 items, active = primary color + filled icon, safe-area inset |
| `UserMenu` | Avatar, name, role chip; items: Hồ sơ, Đánh giá của tôi, Báo cáo, Đăng xuất |
| `AuthMenu` | Đăng nhập (ghost) + Đăng ký (primary button) |
| `Sidebar` | Store/Admin variants, collapsible, active item soft-primary bg |
| `Breadcrumbs`, `Pagination`, `Tabs` | |

### Search
| Component | Notes |
|---|---|
| `SearchBar` | 48px pill, icon left, clear button, `/` shortcut hint, debounce 300ms |
| `SearchSuggestions` | Recent + category + matching locations (keyboard navigable) |
| `FilterBar` | Horizontal pill row: Danh mục, Khoảng giá, Đánh giá ≥, Đang mở, Có ưu đãi, Sắp xếp |
| `FilterDrawer` | Mobile bottom sheet with all filters + "Xóa lọc" / "Áp dụng" |
| `SortDropdown` | Gần nhất · Giá rẻ · Đánh giá cao · Mới nhất |
| `ResultCard` | Image, name, category chip, rating, price level, distance, open status, promo badge, ❤ |

### Categories
`CategoryCard` (icon in tinted circle + label, tap = filter), `CategoryCarousel`
(snap-scroll on mobile, grid on desktop).

### Location
`LocationCard`, `LocationListItem` (compact, list mode), `MapMarker` (price pill,
active state enlarges + z-index), `UserLocationDot`, `LocationPopup` (desktop popup) /
`LocationBottomSheet` (mobile), `PriceLevel` (₫ · ₫₫ · ₫₫₫), `DistanceBadge`
(m / km, walking time ≈ 80 m/min), `OpenStatusPill` (Đang mở · Sắp đóng · Đã đóng —
computed from opening hours, never hardcoded), `RatingStars` (display + interactive),
`FavoriteButton` (optimistic toggle, heart fill animation), `ImageGallery` (thumbs,
lightbox), `InfoRow` (phone/address/hours), `DirectionsButton` (opens OSM/Google),
`ReportMenu` (5 report reasons).

### Promotions
`PromotionCard` (teal ribbon, % hoặc "Combo", validity range, condition), `PromotionBadge`,
`PromotionDetailModal` (code copy, conditions, time range), `PromotionFilter` (category).

### Reviews
`ReviewCard` (avatar, stars, date, body, owner reply indented with shop badge, actions),
`RatingBreakdown` (5→1 bars), `RatingSelector` (large clickable stars + keyboard),
`ReviewForm` (stars + textarea 500 chars + submit, validation), `ReviewReplyForm`,
`ReviewModerationMenu` (admin: ẩn/xóa).

### Map
`MapContainer` (Leaflet, OSM tiles), `MapControls` (zoom, locate-me, list/map toggle),
`MapListToggle` (segmented control), `MapSkeleton`.

### Forms
`Input`, `Textarea`, `Select` (custom listbox), `TimePicker`/`TimeRange` (opening hours
grid: 7 rows × open/close + "Nghỉ" switch), `ImageUpload` (drag & drop, preview, ≤5MB,
jpg/png/webp only, remove), `DatePicker`, `Checkbox`, `Radio`, `Switch`, `FormField`
(label + hint + error slot).

### Feedback
`Toast` (success/error/info, top-right desktop, bottom mobile), `Modal`,
`ConfirmDialog` (destructive red action), `EmptyState` (illustration + title + hint +
CTA), `ErrorState` (retry button), `LoadingSkeleton` (card/list/table variants),
`Spinner`, `InlineAlert`, `StatusBadge` (maps §1 status colors), `ProgressSteps`
(approval workflow), `StatCard` (admin dashboards).

---

## 6. Screen inventory (39 screens)

### A. Public / Student (1–16)
| # | Screen | Key elements |
|---|---|---|
| 1 | Trang chủ | Hero search, category grid, địa điểm nổi bật, ưu đãi carousel, gần bạn (geolocation) |
| 2 | Tìm kiếm | Search bar, filter bar/suggestions, list results + empty state |
| 3 | Kết quả | List ↔ Map toggle, sort, pagination/load-more, result count |
| 4 | Bản đồ | Leaflet map, markers, user dot, bottom sheet/popup, chỉ đường |
| 5 | Chi tiết địa điểm | Gallery, info, open status, rating + breakdown, promotions, reviews, actions (❤, đánh giá, báo cáo, chỉ đường) |
| 6 | Ưu đãi | Grid of promotion cards, category filter, validity |
| 7 | Chi tiết ưu đãi | Nội dung, thời gian áp dụng, điều kiện, link địa điểm |
| 8 | Yêu thích | Saved list, remove, empty state |
| 9 | Đăng nhập | Email + password, lỗi sai credentials, link đăng ký/quên MK |
| 10 | Đăng ký | Họ tên, email, mật khẩu (strength), OTP verify step |
| 11 | Quên mật khẩu | Email → OTP → reset |
| 12 | Đặt lại mật khẩu | New password + confirm |
| 13 | Hồ sơ | Avatar, name, email, phone, đổi mật khẩu, tabs |
| 14 | Đánh giá của tôi | List with sửa/xóa |
| 15 | Báo cáo của tôi | List with status badges |
| 16 | Thông báo | Grouped by date, unread dot, mark all read |

### B. Store Owner (17–29)
| # | Screen | Key elements |
|---|---|---|
| 17 | Store dashboard | Stat cards: địa điểm, chờ duyệt, ưu đãi, đánh giá mới; recent activity |
| 18 | Store profile | Tên cửa hàng, người đại diện, SĐT, email, địa chỉ |
| 19 | Quản lý địa điểm | Table/cards with status badges, actions |
| 20 | Thêm địa điểm | Form: tên, danh mục, địa chỉ + map picker, SĐT, mô tả, giá, giờ mở cửa, ảnh → submit chờ duyệt |
| 21 | Sửa địa điểm | Same form prefilled; pending changes note |
| 22 | Giờ mở cửa | 7-day grid with open/close/ nghỉ |
| 23 | Quản lý hình ảnh | Upload, reorder, delete, main image |
| 24 | Quản lý ưu đãi | List + status |
| 25 | Thêm ưu đãi | Tiêu đề, nội dung, % / combo, thời gian, điều kiện → submit |
| 26 | Sửa ưu đãi | Prefilled |
| 27 | Đánh giá | Received reviews + reply button |
| 28 | Phản hồi đánh giá | Reply textarea (edit/delete own reply) |
| 29 | Yêu cầu chỉnh sửa | Correction request form + history list |

### C. Admin (30–39)
| # | Screen | Key elements |
|---|---|---|
| 30 | Admin dashboard | Real stats: students, owners, locations, pending, promotions, reports, reviews |
| 31 | Quản lý sinh viên | Searchable table, khóa/mở khóa tài khoản |
| 32 | Quản lý cửa hàng | Table, duyệt/tạm ngưng |
| 33 | Quản lý địa điểm | Full CRUD table with filters |
| 34 | Duyệt địa điểm | Pending queue + detail review + Duyệt/Từ chối (lý do) |
| 35 | Duyệt ưu đãi | Pending queue + Duyệt/Từ chối |
| 36 | Quản lý đánh giá | Filter by status, ẩn/xóa vi phạm |
| 37 | Xử lý báo cáo | Queue by status, xem chi tiết, cập nhật thông tin, đổi trạng thái |
| 38 | Quản lý danh mục | CRUD categories (icon, tên, slug, thứ tự) |
| 39 | Thống kê | Charts: users growth, locations by category, reviews, reports resolution |

Plus system screens: 40. Xác thực OTP, 41. 404, 42. 403, 43. Giỏ/lưới trạng thái lỗi.

---

## 7. User flows

### 7.1 Student (core)
```
Trang chủ → Tìm kiếm (keyword/danh mục) → Bộ lọc (gần nhất/giá rẻ/đánh giá cao/
đang mở/có ưu đãi) → Kết quả (Danh sách ↔ Bản đồ) → Chi tiết địa điểm
→ (So sánh: quay lại kết quả, mở 2–3 tab hoặc bảng so sánh theo giá/distance/rating)
→ Chỉ đường (mở bản đồ) → ❤ Yêu thích → Đánh giá 1–5★ + nhận xét → Gửi báo cáo sai
→ Thông báo
```
Alt: Trang chủ → Danh mục → Kết quả → Chi tiết → Ưu đãi.

### 7.2 Store owner
```
Đăng ký tài khoản cửa hàng → Đăng nhập → Đăng ký địa điểm (form + map picker + ảnh +
giờ mở cửa) → PENDING → Admin duyệt → APPROVED (hiển thị) → Tạo ưu đãi → PENDING →
Admin duyệt → ACTIVE → Xem/phản hồi đánh giá → Gửi yêu cầu chỉnh sửa thông tin
```

### 7.3 Admin
```
Đăng nhập → Dashboard (số liệu thật) → Hàng chờ duyệt địa điểm → Xem chi tiết →
Duyệt/Từ chối (có lý do) → Duyệt ưu đãi → Xử lý báo cáo (PENDING → IN_PROGRESS →
RESOLVED/REJECTED) → Ẩn/xóa đánh giá vi phạm → Quản lý danh mục → Thống kê
```

### 7.4 Auth
```
Đăng ký → OTP xác thực → Đăng nhập (JWT) → Quên mật khẩu → OTP → Đặt lại mật khẩu →
Đăng nhập lại
```

### 7.5 Notifications emitted
`location.approved|rejected`, `promotion.approved|rejected`, `report.updated`,
`review.reply`, `account.verified`, `password.reset`.

---

## 8. Responsive strategy

| Breakpoint | Behavior |
|---|---|
| `< 640` (mobile) | Bottom nav, filter drawer (sheet), map full-screen with bottom sheet card, single-column cards, stacked tables |
| `640–1023` (tablet) | 2-col grids, top nav collapses to hamburger, map 50/50 split |
| `≥ 1024` (desktop) | Full navbar, 3–4 col card grids, map + side list panel, sidebar dashboards, hover states |
| `≥ 1280` | Max-width 1200px centered |

Rules: never "shrink desktop" — reflow; touch targets ≥ 44×44px; `env(safe-area-inset-bottom)`
for bottom nav; images `loading="lazy"`; map height `calc(100dvh - header)` on mobile.

---

## 9. Accessibility

- Semantic landmarks (`header/nav/main/aside/footer`), one `h1` per page.
- All interactive elements keyboard reachable; visible focus ring; skip-link.
- Forms: `<label for>`, `aria-describedby` for hints/errors, `aria-invalid`,
  errors summarized at top + inline.
- Star rating: `role="radiogroup"` + arrow keys.
- Map: list view is the accessible equivalent; markers have `aria-label`.
- Color never sole indicator (status = icon + text + color).
- `aria-live="polite"` for toasts and result counts; `role="alert"` for errors.
- Contrast ≥ 4.5:1 body, ≥ 3:1 large text & UI borders.

---

## 10. Content / microcopy (Vietnamese)

- Empty search: **“Không tìm thấy địa điểm phù hợp.”** + hint “Thử bỏ bớt bộ lọc…”
- Load error: **“Không thể tải dữ liệu. Vui lòng thử lại.”** + “Thử lại”
- Success: “Đã lưu đánh giá của bạn.” / “Đã thêm vào Yêu thích.”
- Open status: “Đang mở” / “Sắp đóng (còn 30′)” / “Đã đóng · Mở 06:00”
- Approval: “Đang chờ quản trị viên phê duyệt.”
- Directions button: “Chỉ đường”.

---

## 11. Design → implementation checklist

- [ ] Tokens (colors, type, spacing, radius, shadows) in `tokens` config (Tailwind theme)
- [ ] All §5 components implemented as reusable components
- [ ] All §6 screens implemented with real API data (no mock data in production screens)
- [ ] All §7 flows work end-to-end
- [ ] Responsive per §8, accessible per §9
- [ ] Loading / empty / error states on every data screen
