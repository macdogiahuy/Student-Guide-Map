import 'dotenv/config';

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: num(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  db: {
    url: process.env.DATABASE_URL ?? '',
    urlTest: process.env.DATABASE_URL_TEST ?? '',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    bcryptRounds: 10,
    otpLength: 6,
    otpTtlMinutes: 10,
    /** false = đăng ký kích hoạt ngay, không gửi OTP email (mặc định dev). Set AUTH_REQUIRE_EMAIL_OTP=1 để bật lại. */
    requireEmailOtp: process.env.AUTH_REQUIRE_EMAIL_OTP === '1',
  },
  upload: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxSize: num(process.env.MAX_UPLOAD_SIZE, 5 * 1024 * 1024),
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM ?? 'Student Guide Map <no-reply@studentguidemap.local>',
  },
  map: {
    defaultLat: num(process.env.DEFAULT_CENTER_LAT, 15.9675),
    defaultLng: num(process.env.DEFAULT_CENTER_LNG, 108.2604),
  },
  vietmap: {
    apiKey: process.env.VIETMAP_API_KEY ?? '',
  },
} as const;

export type AppConfig = typeof config;
