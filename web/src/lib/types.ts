export interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Envelope<T> {
  success: boolean;
  data: T;
  message: string | null;
  errors: string[];
}

export type Role = 'STUDENT' | 'STORE_OWNER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  avatarUrl: string | null;
  storeName: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string | null;
}

export interface OpenStatus {
  state: 'OPEN' | 'CLOSING_SOON' | 'CLOSED';
  label: string;
}

export interface LocationListItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  priceLevel: number;
  priceRange: string | null;
  ratingAvg: number;
  ratingCount: number;
  category: Category;
  ownerName: string | null;
  imageUrl: string | null;
  hasPromotion: boolean;
  promoTitle: string | null;
  openStatus: OpenStatus;
  distanceKm: number | null;
  distanceLabel: string | null;
  walkingMinutes: number | null;
  isFavorite?: boolean;
}

export interface OpeningHour {
  id: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface PriceReference {
  id: string;
  itemName: string;
  price: number;
}

export interface Promotion {
  id: string;
  title: string;
  content: string;
  discountLabel: string | null;
  conditions: string | null;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
  location?: { id: string; name: string; address: string; imageUrl: string | null; ratingAvg: number };
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  status: 'DISPLAYED' | 'HIDDEN' | 'DELETED';
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
  reply?: { id: string; content: string; owner: { fullName: string; storeName: string | null } } | null;
}

export interface LocationDetail extends LocationListItem {
  description: string | null;
  viewCount: number;
  status: string;
  images: { id: string; url: string }[];
  openingHours: OpeningHour[];
  priceReferences: PriceReference[];
  promotions: Promotion[];
  ratingBreakdown: Record<string, number>;
  isFavorite: boolean;
  myReview: Review | null;
  owner: { id: string; storeName: string | null; fullName: string; phone: string | null };
  walkingMinutes: number | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
