# Student Guide Map (Trưng Nữ Vương / FPT student map)

Nền tảng khám phá địa điểm dành cho sinh viên: tìm quán ăn, cà phê, dịch vụ quanh trường — trên **bản đồ Vietmap**, có đánh giá, ưu đãi, báo cáo sai thông tin và phân quyền Sinh viên / Chủ cửa hàng / Quản trị viên.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + **Vietmap GL JS** |
| Backend | Express 4 + TypeScript + Zod + JWT (access + rotating refresh cookie) |
| Database | PostgreSQL 17 + Prisma ORM |
| Tests | Vitest + Supertest (API), tsc strict |
| Upload | multer (jpeg/png/webp ≤ 5MB) |

## Quick start

```bash
# 1. PostgreSQL (trust auth on 127.0.0.1) + databases
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE student_guide_map;"
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE student_guide_map_test;"

# 2. Backend
cd server
cp .env.example .env        # set DATABASE_URL, JWT secrets, VIETMAP key
npm install
npx prisma migrate dev
npm run seed
npm run dev                 # http://localhost:4000/api/v1

# 3. Frontend
cd ../web
cp .env.example .env        # VITE_API_URL, VITE_VIETMAP_API_KEY
npm install
npm run dev                 # http://localhost:5173
```

## Seed accounts

| role | email | password |
|---|---|---|
| Admin | admin@sgm.local | Admin@123 |
| Chủ cửa hàng | owner1..3@sgm.local | Owner@123 |
| Sinh viên | student1..6@sgm.local | Student@123 |

## Commands

```bash
npm run dev          # API dev (tsx watch)
npm run typecheck    # tsc --noEmit
npm test             # vitest run (33 API tests)
npm run seed         # reset + seed demo data
```

## Docs

- `docs/REQUIREMENTS.md` — checklist yêu cầu
- `docs/ARCHITECTURE.md` — kiến trúc FE/BE/DB
- `docs/ERD.md` — mô hình dữ liệu
- `docs/API.md` — API reference `/api/v1`
- `design.md` — design system & UI brief (Stitch)

## Map (Vietmap)

Frontend dùng `@vietmap/vietmap-gl-js` với style URL
`https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=<key>`.
Key lấy từ [Vietmap Console](https://maps.vietmap.vn/console-v2/) — đặt vào `VITE_VIETMAP_API_KEY` (web) và `VIETMAP_API_KEY` (server, cho geocode/routing proxy).
