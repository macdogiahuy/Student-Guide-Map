import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Category, LocationListItem, Paged } from '../lib/types';
import LocationCard from '../components/LocationCard';
import MapView, { DEFAULT_CENTER } from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SORTS = [
  { value: 'nearest', label: 'Gần nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price', label: 'Giá rẻ' },
  { value: 'newest', label: 'Mới nhất' },
] as const;

const RADII = [
  { value: '', label: 'Mọi khoảng cách' },
  { value: '1', label: '≤ 1 km' },
  { value: '2', label: '≤ 2 km' },
  { value: '5', label: '≤ 5 km' },
  { value: '10', label: '≤ 10 km' },
] as const;

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('nearest');
  const [openOnly, setOpenOnly] = useState(false);
  const [promoOnly, setPromoOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [radius, setRadius] = useState('5'); // mặc định: trong 5km quanh FPT Đà Nẵng
  const [center, setCenter] = useState({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] });
  const [items, setItems] = useState<LocationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const limit = 12;

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCats).catch(() => setCats([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (sort) params.set('sort', sort);
      if (openOnly) params.set('open', 'true');
      if (promoOnly) params.set('hasPromotion', 'true');
      if (minRating) params.set('minRating', String(minRating));
      if (radius) params.set('radiusKm', radius);
      params.set('lat', String(center.lat));
      params.set('lng', String(center.lng));
      params.set('page', String(page));
      params.set('limit', String(limit));
      const data = await api.get<Paged<LocationListItem>>(`/locations?${params}`);
      setItems(data.items);
      setTotal(data.meta.total);
    } finally {
      setLoading(false);
    }
  }, [q, category, sort, openOnly, promoOnly, minRating, radius, center, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const pins = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        lng: i.lng,
        lat: i.lat,
        label: String(Math.round(i.priceLevel)),
      })),
    [items],
  );

  const toggleFav = async (loc: LocationListItem) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (loc.isFavorite) {
      await api.del(`/favorites/${loc.id}`).catch(() => undefined);
      setItems((prev) => prev.map((p) => (p.id === loc.id ? { ...p, isFavorite: false } : p)));
    } else {
      await api.post(`/favorites/${loc.id}`).catch(() => undefined);
      setItems((prev) => prev.map((p) => (p.id === loc.id ? { ...p, isFavorite: true } : p)));
    }
  };

  const debounceRef = useRef(q);
  debounceRef.current = q;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            Khám phá địa điểm quanh trường 🎓
          </h1>
          <p className="mt-2 text-white/85 max-w-xl">
            Quán ăn, cà phê, in ấn, sửa xe… tất cả cho sinh viên FPT — đánh giá thật, ưu đãi thật.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <input
              className="input flex-1 !border-0 !ring-0 text-ink"
              placeholder="Tìm quán ăn, cà phê, dịch vụ…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <button className="btn bg-secondary text-white" onClick={load}>
              🔍 Tìm kiếm
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            className="input !w-auto"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả danh mục</option>
            {cats.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input !w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            className={`chip border ${openOnly ? 'bg-success/10 text-success border-success' : 'bg-surface border-line text-muted'}`}
            onClick={() => {
              setOpenOnly((v) => !v);
              setPage(1);
            }}
          >
            Đang mở
          </button>
          <button
            className={`chip border ${promoOnly ? 'bg-accent text-white border-accent' : 'bg-surface border-line text-muted'}`}
            onClick={() => {
              setPromoOnly((v) => !v);
              setPage(1);
            }}
          >
            Có ưu đãi
          </button>
          <select
            className="input !w-auto"
            value={minRating}
            onChange={(e) => {
              setMinRating(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={0}>Đánh giá</option>
            <option value={3}>≥ 3★</option>
            <option value={4}>≥ 4★</option>
            <option value={4.5}>≥ 4.5★</option>
          </select>
          <select
            className="input !w-auto"
            value={radius}
            onChange={(e) => {
              setRadius(e.target.value);
              setPage(1);
            }}
          >
            {RADII.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="ml-auto inline-flex rounded-xl border border-line overflow-hidden">
            <button
              className={`px-3 py-2 text-sm font-semibold ${view === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-surface text-muted'}`}
              onClick={() => setView('list')}
            >
              ☰ Danh sách
            </button>
            <button
              className={`px-3 py-2 text-sm font-semibold ${view === 'map' ? 'bg-primary-50 text-primary-600' : 'bg-surface text-muted'}`}
              onClick={() => setView('map')}
            >
              🗺️ Bản đồ
            </button>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="py-20 text-center text-muted">Đang tải địa điểm…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-muted">Không tìm thấy địa điểm phù hợp.</div>
        ) : view === 'list' ? (
          <>
            <p className="text-sm text-muted mb-3">{total} địa điểm</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((loc) => (
                <LocationCard key={loc.id} loc={loc} onToggleFavorite={toggleFav} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  className="btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>
                <span className="px-4 py-2 text-sm text-muted self-center">
                  {page}/{totalPages}
                </span>
                <button
                  className="btn-ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 max-h-[70vh] overflow-y-auto space-y-3">
              {items.map((loc) => (
                <button
                  key={loc.id}
                  className={`w-full text-left card p-3 hover:shadow-md ${selected === loc.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelected(loc.id)}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold line-clamp-1">{loc.name}</span>
                    <span className="text-sm text-warning font-semibold shrink-0">
                      ★ {loc.ratingAvg > 0 ? loc.ratingAvg.toFixed(1) : 'Mới'}
                    </span>
                  </div>
                  <p className="text-xs text-muted line-clamp-1">{loc.address}</p>
                  <p className="text-xs mt-1">{loc.openStatus.label}</p>
                </button>
              ))}
            </div>
            <div className="lg:col-span-3">
              <MapView
                pins={pins}
                selectedId={selected}
                onPinClick={(id) => setSelected(id)}
                onMapMove={setCenter}
                className="h-[70vh]"
              />
              {selected && (
                <div className="mt-3">
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/locations/${selected}`)}
                  >
                    Xem chi tiết →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
