/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient, DayOfWeek } from '@prisma/client';

const prisma = new PrismaClient();

// FPT University Đà Nẵng (Khu K, KĐT Công nghệ FPT, P. Ngũ Hành Sơn)
// Photon/OSM: campus ≈ 15.9675°N, 108.2604°E

const DEFAULT_HOURS: { day: DayOfWeek; openTime: string; closeTime: string; isClosed: boolean }[] = (
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as DayOfWeek[]
).map((day) => ({ day, openTime: '07:00', closeTime: '22:00', isClosed: day === 'SUN' }));

/** Write a simple SVG placeholder image so cards are not empty in dev. */
function imgUrl(file: string): string {
  // Prod seed: point image URLs at object storage (Vercel Blob) instead of local /uploads.
  const base = (process.env.SEED_IMAGE_BASE_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/${file}` : `/uploads/${file}`;
}
function makePlaceholder(name: string, from: string, to: string): string {
  const dir = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `seed-${name}.svg`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <circle cx="640" cy="120" r="70" fill="#ffffff" opacity="0.18"/>
  <text x="50%" y="52%" font-family="sans-serif" font-size="42" fill="#ffffff" text-anchor="middle" opacity="0.95">${name}</text>
</svg>`;
  fs.writeFileSync(file, svg, 'utf8');
  return imgUrl(`seed-${name}.svg`);
}

async function main() {
  console.log('Seeding Student Guide Map…');

  // reset (dev only)
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.correctionRequest.deleteMany(),
    prisma.report.deleteMany(),
    prisma.reviewReply.deleteMany(),
    prisma.review.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.priceReference.deleteMany(),
    prisma.locationImage.deleteMany(),
    prisma.openingHour.deleteMany(),
    prisma.location.deleteMany(),
    prisma.category.deleteMany(),
    prisma.otpToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ── Users ──
  // Tài khoản test ngắn gọn (đều đã xác thực, không cần OTP)
  const adminTest = await prisma.user.create({
    data: {
      fullName: 'Admin',
      email: 'admin@test.com',
      passwordHash: hash('123456'),
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '0900000000',
    },
  });
  const shopTest = await prisma.user.create({
    data: {
      fullName: 'Shop Owner',
      email: 'shop@test.com',
      passwordHash: hash('123456'),
      role: 'STORE_OWNER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      storeName: 'Quán Cafe Test',
      phone: '0900000010',
    },
  });
  const studentTest = await prisma.user.create({
    data: {
      fullName: 'Sinh Viên Test',
      email: 'user@test.com',
      passwordHash: hash('123456'),
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '0900000020',
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: 'Quản Trị Viên',
      email: 'admin@sgm.local',
      passwordHash: hash('Admin@123'),
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '0900000001',
    },
  });

  const owner1 = await prisma.user.create({
    data: {
      fullName: 'Nguyễn Văn Chủ',
      email: 'owner1@sgm.local',
      passwordHash: hash('Owner@123'),
      role: 'STORE_OWNER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      storeName: 'Nhà Hàng Gia Đình Tuấn',
      phone: '0900000002',
    },
  });
  const owner2 = await prisma.user.create({
    data: {
      fullName: 'Trần Thị Đối Tác',
      email: 'owner2@sgm.local',
      passwordHash: hash('Owner@123'),
      role: 'STORE_OWNER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      storeName: 'Cà phê Bean House',
      phone: '0900000003',
    },
  });
  const owner3 = await prisma.user.create({
    data: {
      fullName: 'Lê Văn Dịch Vụ',
      email: 'owner3@sgm.local',
      passwordHash: hash('Owner@123'),
      role: 'STORE_OWNER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      storeName: 'Dịch vụ sinh viên EduPrint',
      phone: '0900000004',
    },
  });

  const students = await Promise.all(
    ['Sinh Viên A', 'Sinh Viên B', 'Sinh Viên C', 'Sinh Viên D', 'Sinh Viên E', 'Sinh Viên F'].map(
      (fullName, i) =>
        prisma.user.create({
          data: {
            fullName,
            email: `student${i + 1}@sgm.local`,
            passwordHash: hash('Student@123'),
            role: 'STUDENT',
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
            phone: `091100000${i + 1}`,
          },
        }),
    ),
  );

  // ── Categories ──
  const catData = [
    { name: 'Ăn uống', slug: 'an-uong', icon: 'utensils', sortOrder: 1 },
    { name: 'Cà phê', slug: 'ca-phe', icon: 'coffee', sortOrder: 2 },
    { name: 'In ấn', slug: 'in-an', icon: 'printer', sortOrder: 3 },
    { name: 'Văn phòng phẩm', slug: 'van-phong-pham', icon: 'pencil', sortOrder: 4 },
    { name: 'Giặt ủi', slug: 'gat-ui', icon: 'washing-machine', sortOrder: 5 },
    { name: 'Sửa xe', slug: 'sua-xe', icon: 'wrench', sortOrder: 6 },
    { name: 'Nhà thuốc', slug: 'nha-thuoc', icon: 'pill', sortOrder: 7 },
    { name: 'Gửi xe', slug: 'gui-xe', icon: 'car', sortOrder: 8 },
    { name: 'Cửa hàng tiện lợi', slug: 'tien-loi', icon: 'store', sortOrder: 9 },
    { name: 'Khác', slug: 'khac', icon: 'pin', sortOrder: 10 },
  ];
  const categories: Record<string, { id: string; slug: string }> = {};
  for (const c of catData) {
    const created = await prisma.category.create({ data: c });
    categories[c.slug] = { id: created.id, slug: created.slug };
  }

  // Owner test có 1 địa điểm để vào /store là thấy dữ liệu
  {
    const cafeTest = await prisma.location.create({
      data: {
        name: 'Quán Cafe Test',
        description: 'Địa điểm demo gắn với tài khoản shop@test.com.',
        address: 'Shophouse trung tâm KĐT FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
        lat: 15.9770,
        lng: 108.2590,
        phone: '0900000010',
        categoryId: categories['ca-phe'].id,
        ownerId: shopTest.id,
        priceLevel: 1,
        priceRange: '20.000 – 45.000₫',
        status: 'APPROVED',
        approvedAt: new Date(Date.now() - 10 * 86400_000),
        openingHours: { create: DEFAULT_HOURS },
        images: {
          create: [{ url: imgUrl('seed-trees-coffee.jpg'), isPrimary: true, sortOrder: 0 }],
        },
      },
    });
    await prisma.review.create({
      data: {
        locationId: cafeTest.id,
        userId: studentTest.id,
        rating: 5,
        comment: 'Đồ uống ngon, giá hợp lý cho sinh viên!',
        status: 'DISPLAYED',
        createdAt: new Date(Date.now() - 2 * 86400_000),
      },
    });
    await prisma.favorite.create({
      data: { userId: studentTest.id, locationId: cafeTest.id },
    });
    await prisma.notification.create({
      data: {
        userId: shopTest.id,
        type: 'LOCATION_APPROVED',
        title: 'Địa điểm đã được duyệt',
        body: '"Quán Cafe Test" đang hiển thị trên bản đồ cho sinh viên.',
        link: '/store/locations',
      },
    });
  }

  // Real photo in uploads/ (downloaded Unsplash assets). Falls back to SVG if missing.
  function seedImage(key: string, name: string, from: string, to: string): string {
    const dir = path.resolve(process.cwd(), 'uploads');
    const jpg = path.join(dir, `${key}.jpg`);
    if (fs.existsSync(jpg)) return imgUrl(`${key}.jpg`);
    return makePlaceholder(name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18) || key, from, to);
  }

  // ── Locations ──
  // Absolute lat/lng around FPT University Đà Nẵng (15.9675, 108.2604)
  // + known streets: Nam Kỳ Khởi Nghĩa, Trần Đại Nghĩa, Ngũ Hành Sơn, FPT Plaza.
  const locDefs = [
    {
      name: 'TREES Coffee & Tea - Khu Đô Thị FPT',
      slug: 'ca-phe',
      owner: owner2.id,
      // Lô 01, Khu B2A-11, KĐT FPT — shophouse row NE of campus
      lat: 15.9782,
      lng: 108.2591,
      priceLevel: 2,
      priceRange: '25.000 – 55.000₫',
      phone: '0236 7300 999',
      address: 'Lô 01, Khu B2A-11, Khu Đô Thị FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Cà phê & trà trong khu đô thị FPT – không gian thoáng, hợp học nhóm, 07:00–22:00.',
      rating: 4.7,
      count: 21,
      img: 'seed-trees-coffee',
    },
    {
      name: 'Cơm tấm shophouse FPT',
      slug: 'an-uong',
      owner: owner1.id,
      // Shophouse B2, Nam Kỳ Khởi Nghĩa
      lat: 15.9771,
      lng: 108.2578,
      priceLevel: 1,
      priceRange: '25.000 – 40.000₫',
      phone: '0987654321',
      address: 'Trục Shophouse B2, KĐT FPT, đường Nam Kỳ Khởi Nghĩa, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Cơm tấm sườn, cơm gà, cơm niêu – quán cơm sinh viên trong khu shophouse FPT.',
      rating: 4.5,
      count: 12,
      img: 'seed-com-tam-fpt',
    },
    {
      name: 'HuaCha - Trà Sữa Ô Long Hoa (Ngũ Hành Sơn)',
      slug: 'ca-phe',
      owner: owner2.id,
      // 85 Ngũ Hành Sơn (southern stretch toward beach / Mỹ An)
      lat: 16.0082,
      lng: 108.2501,
      priceLevel: 1,
      priceRange: '25.000 – 45.000₫',
      phone: '0905 000 111',
      address: '85 đường Ngũ Hành Sơn, P. Mỹ An, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Trà sữa ô long đặc sản HuaCha – ship nhanh khu Mỹ An – FPT.',
      rating: 4.4,
      count: 18,
      img: 'seed-huacha',
    },
    {
      name: 'Ding Tea Ngũ Hành Sơn',
      slug: 'ca-phe',
      owner: owner2.id,
      // 248 Ngũ Hành Sơn
      lat: 16.0034,
      lng: 108.2518,
      priceLevel: 1,
      priceRange: '20.000 – 40.000₫',
      phone: '0905 000 222',
      address: '248 đường Ngũ Hành Sơn, P. Mỹ An, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Chuỗi trà sữa Ding Tea – hạt dẻ, matcha, giá học sinh.',
      rating: 4.1,
      count: 15,
      img: 'seed-dingtea',
    },
    {
      name: 'EduPrint In ấn FPT',
      slug: 'in-an',
      owner: owner3.id,
      // FPT Plaza 4 / Plaza cluster
      lat: 15.9818,
      lng: 108.2622,
      priceLevel: 1,
      priceRange: '500 – 1.500₫/trang',
      phone: '0987654325',
      address: 'Tầng 1, shophouse FPT Plaza, KĐT FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'In đen trắng, in màu, photo, đóng gáy luận văn. Gấp trong ngày cho sinh viên FPT.',
      rating: 4.6,
      count: 30,
      img: 'seed-print-fpt',
    },
    {
      name: 'Văn phòng phẩm Văn Minh',
      slug: 'van-phong-pham',
      owner: owner3.id,
      // Shophouse B2.15
      lat: 15.9768,
      lng: 108.2584,
      priceLevel: 1,
      priceRange: '5.000 – 100.000₫',
      phone: '0987654326',
      address: 'Shophouse B2.15, trục Shophouse KĐT FPT City, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Bút, vở, bảng, dụng cụ vẽ – đủ đồ cho học kỳ mới.',
      rating: 4.0,
      count: 6,
      img: 'seed-vpp',
    },
    {
      name: 'Giặt ủi Sạch Sẽ FPT',
      slug: 'gat-ui',
      owner: owner3.id,
      // Staff housing block south of campus
      lat: 15.9658,
      lng: 108.2618,
      priceLevel: 1,
      priceRange: '7.000 – 15.000₫/kg',
      phone: '0987654327',
      address: 'Khu nhà ở nhân viên FPT, KĐT FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Giặt sấy theo kg, nhận trả trong 24h.',
      rating: 4.3,
      count: 11,
      img: 'seed-giat-ui',
    },
    {
      name: 'Sửa xe máy Nam Kỳ',
      slug: 'sua-xe',
      owner: owner1.id,
      // Nam Kỳ Khởi Nghĩa frontage west of campus
      lat: 15.9746,
      lng: 108.2555,
      priceLevel: 1,
      priceRange: '20.000 – 300.000₫',
      phone: '0987654328',
      address: 'Mặt tiền đường Nam Kỳ Khởi Nghĩa, KĐT FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Sửa xe máy, vá lốp, thay dầu, rửa xe giá sinh viên.',
      rating: 4.4,
      count: 18,
      img: 'seed-sua-xe',
    },
    {
      name: 'Nhà thuốc FPT Long Châu',
      slug: 'nha-thuoc',
      owner: owner1.id,
      // FPT Plaza 1
      lat: 15.9810,
      lng: 108.2614,
      priceLevel: 2,
      priceRange: '10.000 – 200.000₫',
      phone: '1800 6928',
      address: 'Shophouse FPT Plaza 1, KĐT FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Thuốc, thực phẩm chức năng, tư vấn dược sĩ – chuỗi Nhà thuốc FPT Long Châu.',
      rating: 4.5,
      count: 9,
      img: 'seed-long-chau',
    },
    {
      name: 'Bãi gửi xe ĐH FPT',
      slug: 'gui-xe',
      owner: owner3.id,
      // Cổng Khu K (campus main)
      lat: 15.9684,
      lng: 108.2596,
      priceLevel: 1,
      priceRange: '3.000 – 10.000₫/ngày',
      phone: '0987654330',
      address: 'Cổng Khu K, Trường ĐH FPT, KĐT Công nghệ FPT, P. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Bãi xe có bảo vệ 24/7, che mưa che nắng – gần cổng trường ĐH FPT.',
      rating: 4.2,
      count: 14,
      img: 'seed-gui-xe',
    },
    {
      name: 'Tiện lợi FPT City',
      slug: 'tien-loi',
      owner: owner2.id,
      // Central shophouse plaza
      lat: 15.9762,
      lng: 108.2588,
      priceLevel: 2,
      priceRange: '10.000 – 150.000₫',
      phone: '0987654331',
      address: 'Shophouse trung tâm KĐT FPT, đường Nam Kỳ Khởi Nghĩa, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Tiệm tiện lợi: đồ ăn nhanh, đồ uống, đồ dùng cá nhân – mở cửa sáng đến khuya.',
      rating: 4.0,
      count: 17,
      img: 'seed-circle-k',
    },
    {
      name: 'Bún đậu mắm tôm FPT',
      slug: 'an-uong',
      owner: owner1.id,
      // Võ Chí Công corridor (west of FPT)
      lat: 15.9825,
      lng: 108.2486,
      priceLevel: 1,
      priceRange: '25.000 – 40.000₫',
      phone: '0987654332',
      address: 'Shophouse Võ Chí Công, KĐT FPT / Hòa Quý, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Bún đậu mắm tôm, nem cua bể, chả rán – quán quen của sinh viên.',
      rating: 4.6,
      count: 25,
      img: 'seed-bun-dau',
    },
    {
      name: 'Bánh mì & bánh ngọt Bake House FPT',
      slug: 'khac',
      owner: owner2.id,
      // Near FPT Complex / Trần Đại Nghĩa
      lat: 15.9795,
      lng: 108.2635,
      priceLevel: 2,
      priceRange: '15.000 – 70.000₫',
      phone: '0987654333',
      address: 'Shophouse gần FPT Complex, KĐT Công nghệ FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      description: 'Bánh mì, bánh ngọt, bánh sinh nhật đặt theo yêu cầu.',
      rating: 4.3,
      count: 7,
      img: 'seed-banh-mi',
    },
  ];

  const locations = [] as { id: string; name: string; ownerId: string; categoryId: string }[];
  for (const [i, l] of locDefs.entries()) {
    const cat = categories[l.slug];
    const loc = await prisma.location.create({
      data: {
        name: l.name,
        description: l.description,
        address: l.address,
        lat: l.lat,
        lng: l.lng,
        phone: l.phone,
        categoryId: cat.id,
        ownerId: l.owner,
        priceLevel: l.priceLevel,
        priceRange: l.priceRange,
        status: 'APPROVED',
        approvedAt: new Date(Date.now() - (30 - i) * 86400_000),
        openingHours: { create: DEFAULT_HOURS },
        images: {
          create: [
            {
              url: seedImage(l.img ?? `img${i}`, l.name, '#FF6B35', '#10243E'),
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      },
      include: { images: true },
    });
    locations.push({ id: loc.id, name: loc.name, ownerId: loc.ownerId, categoryId: loc.categoryId });
  }

  // two pending locations for the admin approval queue
  for (const [i, l] of [
    {
      name: 'Nướng BBQ Đêm FPT',
      slug: 'an-uong',
      lat: 15.9832,
      lng: 108.2568,
      address: 'Mặt tiền Võ Chí Công, KĐT FPT, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
      priceLevel: 2,
      priceRange: '50.000 – 120.000₫',
      img: 'seed-bbq',
    },
    {
      name: 'Giặt là Mini Hòa Hải',
      slug: 'gat-ui',
      lat: 15.9720,
      lng: 108.2540,
      address: 'Khu shophouse Hòa Hải, gần KĐT FPT, Q. Ngũ Hành Sơn, Đà Nẵng',
      priceLevel: 1,
      priceRange: '8.000 – 20.000₫',
      img: 'seed-giat-la',
    },
  ].entries()) {
    await prisma.location.create({
      data: {
        name: l.name,
        description: 'Địa điểm mới do chủ cửa hàng đăng ký, đang chờ duyệt.',
        address: l.address,
        lat: l.lat,
        lng: l.lng,
        phone: `09876544${40 + i}`,
        categoryId: categories[l.slug].id,
        ownerId: owner3.id,
        priceLevel: l.priceLevel,
        priceRange: l.priceRange,
        status: 'PENDING',
        openingHours: { create: DEFAULT_HOURS },
        images: {
          create: [
            {
              url: seedImage(l.img, l.name, '#FF6B35', '#10243E'),
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  // ── Price references (price comparison) ──
  const priceSets: Record<string, { itemName: string; price: number }[]> = {
    'Cơm tấm shophouse FPT': [
      { itemName: 'Cơm tấm sườn', price: 35000 },
      { itemName: 'Cơm gà xối mỡ', price: 32000 },
      { itemName: 'Cơm niêu thịt kho', price: 40000 },
    ],
    'Bún đậu mắm tôm FPT': [
      { itemName: 'Bún đậu mắm tôm', price: 30000 },
      { itemName: 'Nem cua bể (4 cái)', price: 25000 },
      { itemName: 'Chả rán', price: 20000 },
    ],
    'TREES Coffee & Tea - Khu Đô Thị FPT': [
      { itemName: 'Cà phê sữa đá', price: 29000 },
      { itemName: 'Bạc xỉu', price: 35000 },
      { itemName: 'Trà đào cam sả', price: 39000 },
    ],
    'HuaCha - Trà Sữa Ô Long Hoa (Ngũ Hành Sơn)': [
      { itemName: 'Trà sữa ô long', price: 35000 },
      { itemName: 'Trà sữa trân châu', price: 32000 },
      { itemName: 'Trà đào', price: 32000 },
    ],
    'Ding Tea Ngũ Hành Sơn': [
      { itemName: 'Trà sữa hạt dẻ', price: 30000 },
      { itemName: 'Trà sữa matcha', price: 35000 },
      { itemName: 'Bánh mì trứng', price: 15000 },
    ],
  };
  for (const loc of locations) {
    const set = priceSets[loc.name];
    if (set) {
      await prisma.priceReference.createMany({
        data: set.map((s) => ({ locationId: loc.id, ...s })),
      });
    }
  }

  // ── Reviews (real rows; aggregates recomputed afterwards) ──
  const commentBank = [
    'Đồ ăn ngon, giá hợp lý, cô chủ nhiệt tình. Sẽ quay lại!',
    'Không gian sạch sẽ, phục vụ nhanh. Hợp nhóm bạn học.',
    'Chất lượng ổn so với giá sinh viên, recommend!',
    'Hơi đông vào giờ trưa nhưng chờ không lâu.',
    'Vị trí thuận tiện, đi bộ 5 phút từ ký túc xá.',
    'Nhân viên thân thiện, nói được cả tiếng Anh.',
    'Đúng vị, hợp khẩu vị, sẽ giới thiệu cho các bạn.',
    'Giá hơi cao một chút so với quán bên cạnh.',
    'Đồ uống đậm vị, ngồi học bài thoải mái.',
    'Lần đầu thử, khá ấn tượng so với kỳ vọng.',
  ];
  const ratingPattern = [5, 4, 5, 3, 4, 5, 4, 5, 4, 5, 3, 4];
  let firstReviewId: string | null = null;
  let pIdx = 0;
  for (const [i, loc] of locations.entries()) {
    const n = 2 + (i % 3); // 2..4 reviews per location
    for (let k = 0; k < n; k++) {
      const student = students[(i + k) % students.length];
      if (loc.ownerId === student.id) continue;
      const rev = await prisma.review.create({
        data: {
          locationId: loc.id,
          userId: student.id,
          rating: ratingPattern[pIdx++ % ratingPattern.length],
          comment: commentBank[(i * 3 + k) % commentBank.length],
          createdAt: new Date(Date.now() - (30 - i - k) * 86400_000),
        },
      });
      if (i === 0 && k === 0) firstReviewId = rev.id;
    }
  }
  // owner reply
  if (firstReviewId) {
    await prisma.reviewReply.create({
      data: {
        reviewId: firstReviewId,
        ownerId: locations[0].ownerId,
        content: 'Cảm ơn bạn đã đánh giá! Hẹn gặp lại bạn tuần này nhé.',
      },
    });
  }

  // recompute rating aggregates from the actual reviews
  for (const loc of locations) {
    const agg = await prisma.review.aggregate({
      where: { locationId: loc.id, status: 'DISPLAYED' },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.location.update({
      where: { id: loc.id },
      data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count },
    });
  }

  // ── Favorites ──
  await prisma.favorite.createMany({
    data: [
      { userId: students[0].id, locationId: locations[0].id },
      { userId: students[0].id, locationId: locations[4].id },
      { userId: students[1].id, locationId: locations[2].id },
    ],
    skipDuplicates: true,
  });

  // ── Promotions ──
  const now = Date.now();
  await prisma.promotion.create({
    data: {
      locationId: locations[2].id,
      title: 'Giảm 20% cho sinh viên FPT',
      content: 'Giảm 20% tất cả đồ uống khi xuất trình thẻ sinh viên, áp dụng từ thứ 2 đến thứ 6.',
      discountLabel: '-20%',
      conditions: 'Không áp dụng cùng khuyến mãi khác. Một tài khoản một lần mỗi ngày.',
      startDate: new Date(now - 7 * 86400_000),
      endDate: new Date(now + 30 * 86400_000),
      status: 'ACTIVE',
      approvedAt: new Date(now - 6 * 86400_000),
    },
  });
  await prisma.promotion.create({
    data: {
      locationId: locations[11].id,
      title: 'Combo 2 tặng 1 giờ vàng',
      content: 'Mua 2 tặng 1 từ 14:00 – 17:00 tất cả các ngày trong tuần.',
      discountLabel: 'Combo 2+1',
      conditions: 'Chỉ áp dụng cho size vừa trở lên.',
      startDate: new Date(now + 3 * 86400_000),
      endDate: new Date(now + 45 * 86400_000),
      status: 'PENDING',
    },
  });
  await prisma.promotion.create({
    data: {
      locationId: locations[4].id,
      title: 'In free 10 trang đầu tháng',
      content: 'Miễn phí 10 trang A4 đen trắng cho đơn từ 50 trang trở lên.',
      discountLabel: 'Tặng 10 trang',
      conditions: 'Mỗi sinh viên một lần mỗi tháng.',
      startDate: new Date(now - 30 * 86400_000),
      endDate: new Date(now + 20 * 86400_000),
      status: 'ACTIVE',
      approvedAt: new Date(now - 29 * 86400_000),
    },
  });
  await prisma.promotion.create({
    data: {
      locationId: locations[6].id,
      title: 'Giặt 5kg tặng 1kg',
      content: 'Giặt từ 5kg được tặng thêm 1kg.',
      startDate: new Date(now - 60 * 86400_000),
      endDate: new Date(now + 10 * 86400_000),
      status: 'REJECTED',
      rejectionReason: 'Nội dung chưa rõ thời gian áp dụng. Vui lòng bổ sung.',
    },
  });

  // ── Reports ──
  await prisma.report.create({
    data: {
      locationId: locations[10].id,
      reporterId: students[1].id,
      type: 'WRONG_HOURS',
      content: 'Tối qua 23h sang vẫn mở mà hệ thống ghi đóng cửa 22h.',
      status: 'PENDING',
    },
  });
  await prisma.report.create({
    data: {
      locationId: locations[6].id,
      reporterId: students[2].id,
      type: 'WRONG_PRICE',
      content: 'Giá giặt khô đã tăng lên 18.000₫/kg.',
      status: 'RESOLVED',
      adminNote: 'Đã xác minh với cửa hàng và cập nhật giá tham khảo.',
      processedById: admin.id,
      processedAt: new Date(now - 2 * 86400_000),
    },
  });

  // ── Correction request ──
  await prisma.correctionRequest.create({
    data: {
      locationId: locations[1].id,
      requesterId: owner1.id,
      field: 'phone',
      description: 'Số điện thoại quán đã đổi thành 0987 654 399, vui lòng cập nhật.',
      status: 'PENDING',
    },
  });

  // ── Notifications ──
  await prisma.notification.createMany({
    data: [
      {
        userId: owner3.id,
        type: 'LOCATION_REJECTED',
        title: 'Địa điểm bị từ chối',
        body: 'Quán Nướng BBQ Đêm chưa đủ thông tin. Vui lòng bổ sung mô tả và giờ mở cửa.',
        link: '/store/locations',
      },
      {
        userId: owner2.id,
        type: 'PROMOTION_APPROVED',
        title: 'Ưu đãi đã được duyệt',
        body: 'Ưu đãi "Giảm 20% cho sinh viên FPT" tại TREES Coffee đang hiển thị cho sinh viên.',
        link: '/store/promotions',
      },
      {
        userId: students[0].id,
        type: 'REPORT_UPDATE',
        title: 'Báo cáo của bạn đã được xử lý',
        body: 'Báo cáo "Sai giá" tại Giặt ủi Sạch Sẽ FPT đã được cập nhật.',
        link: '/me/reports',
      },
    ],
  });

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.location.count(),
    prisma.review.count(),
    prisma.promotion.count(),
    prisma.report.count(),
  ]);
  console.log(
    `Seed done → users=${counts[0]} categories=${counts[1]} locations=${counts[2]} reviews=${counts[3]} promotions=${counts[4]} reports=${counts[5]}`,
  );
  console.log('Accounts (test — password 123456):');
  console.log('  admin@test.com  / 123456  (ADMIN)');
  console.log('  shop@test.com   / 123456  (STORE_OWNER)');
  console.log('  user@test.com   / 123456  (STUDENT)');
  console.log('Accounts (legacy):');
  console.log('  admin@sgm.local / Admin@123');
  console.log('  owner1..3@sgm.local / Owner@123');
  console.log('  student1..6@sgm.local / Student@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
