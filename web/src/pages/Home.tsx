import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LocationCard from '../components/LocationCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { DEFAULT_CENTER } from '../lib/center';
import type { Category, LocationListItem, Paged } from '../lib/types';

// vietmap-gl is heavy (~700KB) — split it out of the main bundle.
const MapView = lazy(() => import('../components/MapView'));

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
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'map'>(
    searchParams.get('view') === 'map' ? 'map' : 'list',
  );
  const [q, setQ] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const favoriteRequests = useRef(new Set<string>());
  const locationsCache = useRef(
    new Map<string, { items: LocationListItem[]; total: number }>(),
  );
  const requestId = useRef(0);
  const limit = 12;

  useEffect(() => {
    setView(searchParams.get('view') === 'map' ? 'map' : 'list');
  }, [searchParams]);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCats).catch(() => setCats([]));
  }, []);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
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
    const cacheKey = params.toString();
    const cached = locationsCache.current.get(cacheKey);
    if (cached) {
      setItems(cached.items);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<Paged<LocationListItem>>(`/locations?${params}`);
      if (currentRequest !== requestId.current) return;
      locationsCache.current.set(cacheKey, { items: data.items, total: data.meta.total });
      setItems(data.items);
      setTotal(data.meta.total);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [searchQuery, category, sort, openOnly, promoOnly, minRating, radius, center, page]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    void load();
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
    if (favoriteRequests.current.has(loc.id)) return;
    favoriteRequests.current.add(loc.id);
    const next = !loc.isFavorite;
    setItems((prev) => prev.map((p) => (p.id === loc.id ? { ...p, isFavorite: next } : p)));
    for (const [key, cached] of locationsCache.current) {
      if (cached.items.some((item) => item.id === loc.id)) {
        locationsCache.current.set(key, {
          ...cached,
          items: cached.items.map((item) =>
            item.id === loc.id ? { ...item, isFavorite: next } : item,
          ),
        });
      }
    }
    try {
      if (next) await api.post(`/favorites/${loc.id}`);
      else await api.del(`/favorites/${loc.id}`);
    } catch (error) {
      setItems((prev) => prev.map((p) => (p.id === loc.id ? { ...p, isFavorite: loc.isFavorite } : p)));
      for (const [key, cached] of locationsCache.current) {
        if (cached.items.some((item) => item.id === loc.id)) {
          locationsCache.current.set(key, {
            ...cached,
            items: cached.items.map((item) =>
              item.id === loc.id ? { ...item, isFavorite: loc.isFavorite } : item,
            ),
          });
        }
      }
      setFavoriteMessage(error instanceof Error ? error.message : 'Không thể cập nhật yêu thích.');
    } finally {
      favoriteRequests.current.delete(loc.id);
    }
  };

  const changeView = (nextView: 'list' | 'map') => {
    setView(nextView);
    navigate(nextView === 'map' ? '/?view=map' : '/', { replace: true });
  };

  return (
    <div>
      {favoriteMessage && (
        <div role="alert" className="mx-auto max-w-6xl px-4 pt-3 text-sm text-error">
          {favoriteMessage}
        </div>
      )}
      {/* Hero */}
      <section className="bg-primary-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            Khám phá địa điểm quanh trường
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
            <button
              className="btn bg-secondary text-white"
              type="button"
              onClick={() => setSearchQuery(q)}
            >
              Tìm kiếm
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Filters */}
        <div className="mb-3 flex items-center gap-2 md:hidden">
          <button
            type="button"
            className="btn-ghost"
            aria-expanded={filtersOpen}
            aria-controls="home-filter-controls"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
        </div>
        <div
          id="home-filter-controls"
          className={`${filtersOpen ? 'flex' : 'hidden'} flex-wrap items-center gap-2 mb-3`}
        >
          <select
            className="input filter-control"
            aria-label="Danh mục"
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
            className="input filter-control"
            aria-label="Sắp xếp"
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
            type="button"
            className={`chip border ${openOnly ? 'bg-success/10 text-success border-success' : 'bg-surface border-line text-muted'}`}
            aria-pressed={openOnly}
            onClick={() => {
              setOpenOnly((v) => !v);
              setPage(1);
            }}
          >
            Đang mở
          </button>
          <button
            type="button"
            className={`chip border ${promoOnly ? 'bg-accent text-white border-accent' : 'bg-surface border-line text-muted'}`}
            aria-pressed={promoOnly}
            onClick={() => {
              setPromoOnly((v) => !v);
              setPage(1);
            }}
          >
            Có ưu đãi
          </button>
          <select
            className="input filter-control"
            aria-label="Mức đánh giá tối thiểu"
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
            className="input filter-control"
            aria-label="Khoảng cách"
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
        </div>
        <div className="mb-4 flex w-full overflow-hidden rounded-xl border border-line md:ml-auto md:w-fit">
          <button
            type="button"
            className={`flex-1 px-3 py-2 text-sm font-semibold md:flex-none ${view === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-surface text-muted'}`}
            aria-pressed={view === 'list'}
            onClick={() => changeView('list')}
          >
            Danh sách
          </button>
          <button
            type="button"
            className={`flex-1 px-3 py-2 text-sm font-semibold md:flex-none ${view === 'map' ? 'bg-primary-50 text-primary-600' : 'bg-surface text-muted'}`}
            aria-pressed={view === 'map'}
            onClick={() => changeView('map')}
          >
            Bản đồ
          </button>
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
          <div className="home-map-layout">
            <div className="home-map-results space-y-3" aria-label="Danh sách địa điểm trên bản đồ">
              {items.map((loc) => (
                <button
                  key={loc.id}
                  className={`home-map-result w-full text-left card p-3 hover:shadow-md ${selected === loc.id ? 'ring-2 ring-primary' : ''}`}
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
            <div className="home-map-canvas">
              <Suspense
                fallback={<div className="grid place-items-center bg-surface-2 rounded-2xl home-map-height text-sm text-muted">Đang tải bản đồ…</div>}
              >
                <MapView
                  pins={pins}
                  selectedId={selected}
                  onPinClick={(id) => setSelected(id)}
                  onMapMove={setCenter}
                  className="home-map-height"
                />
              </Suspense>
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
