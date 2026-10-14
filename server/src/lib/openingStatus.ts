import type { DayOfWeek, OpeningHour, Promotion } from '@prisma/client';

const DAY_ORDER: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** JS getDay(): 0=Sun..6=Sat → our DayOfWeek */
export function todayDay(now = new Date()): DayOfWeek {
  const map: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return map[now.getDay()];
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export type OpenState = 'OPEN' | 'CLOSING_SOON' | 'CLOSED';

export interface OpenStatus {
  state: OpenState;
  label: string;
  /** minutes until closing when OPEN, minutes until opening when CLOSED */
  minutes: number;
}

/**
 * Compute OPEN / CLOSED purely from opening hours + current time.
 * Never hardcoded. Handles overnight shifts (close < open) and 24h (00:00-23:59).
 */
export function getOpenStatus(hours: OpeningHour[], now = new Date()): OpenStatus {
  const day = todayDay(now);
  const today = hours.find((h) => h.day === day);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (today && !today.isClosed) {
    const open = toMinutes(today.openTime);
    const close = toMinutes(today.closeTime);

    if (close > open) {
      if (nowMin >= open && nowMin < close) {
        const left = close - nowMin;
        return left <= 30
          ? { state: 'CLOSING_SOON', label: `Sắp đóng (còn ${left}′)`, minutes: left }
          : { state: 'OPEN', label: 'Đang mở', minutes: left };
      }
      if (nowMin < open) {
        return { state: 'CLOSED', label: `Đã đóng · Mở ${today.openTime}`, minutes: open - nowMin };
      }
    } else {
      // overnight: open 22:00 → close 02:00
      if (nowMin >= open || nowMin < close) {
        const left = nowMin >= open ? close + 1440 - nowMin : close - nowMin;
        return left <= 30
          ? { state: 'CLOSING_SOON', label: `Sắp đóng (còn ${left}′)`, minutes: left }
          : { state: 'OPEN', label: 'Đang mở', minutes: left };
      }
      return { state: 'CLOSED', label: `Đã đóng · Mở ${today.openTime}`, minutes: open - nowMin };
    }
  }

  // find next opening day
  const idx = DAY_ORDER.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const next = hours.find((h) => h.day === DAY_ORDER[(idx + i) % 7]);
    if (next && !next.isClosed) {
      const suffix = i === 1 ? `Mở ${next.openTime} hôm nay` : `Mở ${next.openTime} ${i === 2 ? 'ngày mai' : DAY_ORDER[(idx + i) % 7]}`;
      return { state: 'CLOSED', label: `Đã đóng · ${suffix}`, minutes: 0 };
    }
  }
  return { state: 'CLOSED', label: 'Đã đóng', minutes: 0 };
}

/** Expire promotions whose endDate passed (status flip used by services/queries). */
export function isPromotionExpired(p: Promotion, now = new Date()): boolean {
  return p.endDate < now || p.status === 'EXPIRED';
}

export function promotionVisible(p: Promotion, now = new Date()): boolean {
  return p.status === 'ACTIVE' && p.startDate <= now && p.endDate >= now;
}
