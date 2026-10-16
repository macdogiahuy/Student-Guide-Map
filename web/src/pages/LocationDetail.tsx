import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { LocationDetail, Review } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { OpenBadge } from '../components/LocationCard';

// vietmap-gl is heavy — split it out of the main bundle.
const MapView = lazy(() => import('../components/MapView'));

const DAY_LABEL: Record<string, string> = {
  MON: 'Thứ 2',
  TUE: 'Thứ 3',
  WED: 'Thứ 4',
  THU: 'Thứ 5',
  FRI: 'Thứ 6',
  SAT: 'Thứ 7',
  SUN: 'Chủ nhật',
};

export default function LocationDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loc, setLoc] = useState<LocationDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('WRONG_ADDRESS');
  const [reportContent, setReportContent] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Detail + reviews are independent — fetch in parallel instead of waterfall.
    const [data, rv] = await Promise.all([
      api.get<LocationDetail>(`/locations/${id}`),
      api.get<{ items: Review[] }>(`/reviews?locationId=${id}&limit=20`),
    ]);
    setLoc(data);
    setReviews(rv.items);
  }, [id]);

  useEffect(() => {
    load().catch(() => setLoc(null));
  }, [load]);

  if (!loc) {
    return <div className="py-24 text-center text-muted">Không tìm thấy địa điểm.</div>;
  }

  const toggleFav = async () => {
    if (!user) return navigate('/login');
    if (loc.isFavorite) await api.del(`/favorites/${loc.id}`);
    else await api.post(`/favorites/${loc.id}`);
    setLoc({ ...loc, isFavorite: !loc.isFavorite });
  };

  const submitReview = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/reviews', { locationId: loc.id, rating, comment: comment || undefined });
      setMsg('Đã gửi đánh giá!');
      setComment('');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
    }
  };

  const submitReport = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/reports', {
        locationId: loc.id,
        type: reportType,
        content: reportContent || undefined,
      });
      setMsg('Đã gửi báo cáo. Cảm ơn bạn!');
      setReportOpen(false);
      setReportContent('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {msg && (
        <div className="chip bg-info/10 text-info w-full justify-center py-2">{msg}</div>
      )}

      {/* Gallery */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(loc.images.length ? loc.images : [{ id: 'placeholder', url: '' }]).slice(0, 4).map((img, i) => (
          <div
            key={img.id}
            className={`rounded-xl bg-surface-2 overflow-hidden aspect-[4/3] ${i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-[4/3]' : ''}`}
          >
            {img.url ? (
              <img src={img.url} alt={loc.name} className="size-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            ) : (
              <div className="size-full grid place-items-center text-3xl">{loc.category.icon || '📍'}</div>
            )}
          </div>
        ))}
      </div>

      {/* Head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{loc.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-warning font-semibold">★ {loc.ratingAvg.toFixed(1)}</span>
            <span className="text-muted">({loc.ratingCount} đánh giá)</span>
            <OpenBadge state={loc.openStatus.state} label={loc.openStatus.label} />
            <span className="chip bg-primary-50 text-primary-600">{loc.category.name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={toggleFav}>
            {loc.isFavorite ? '❤️ Đã lưu' : '🤍 Yêu thích'}
          </button>
          <button className="btn-primary" onClick={() => navigate(`/directions/${loc.id}`)}>
            🧭 Chỉ đường
          </button>
        </div>
      </div>

      <p className="text-muted whitespace-pre-line">{loc.description}</p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Info */}
        <div className="card p-4 space-y-3 text-sm">
          <h2 className="font-bold text-base">Thông tin</h2>
          <p>📍 {loc.address}</p>
          {loc.phone && <p>📞 <a href={`tel:${loc.phone}`} className="text-primary-600">{loc.phone}</a></p>}
          {loc.priceRange && <p>💰 {loc.priceRange}</p>}
          <p>🚶 Cách bạn {loc.distanceLabel ?? '—'}{loc.walkingMinutes ? ` (~${loc.walkingMinutes} phút đi bộ)` : ''}</p>

          <h3 className="font-bold pt-2">Giờ mở cửa</h3>
          <table className="w-full text-xs">
            <tbody>
              {loc.openingHours.map((h) => (
                <tr key={h.id} className="border-b border-line last:border-0">
                  <td className="py-1.5">{DAY_LABEL[h.day]}</td>
                  <td className="py-1.5 text-right text-muted">
                    {h.isClosed ? 'Nghỉ' : `${h.openTime} – ${h.closeTime}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loc.priceReferences.length > 0 && (
            <>
              <h3 className="font-bold pt-2">Bảng giá tham khảo</h3>
              <table className="w-full text-xs">
                <tbody>
                  {loc.priceReferences.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="py-1.5">{p.itemName}</td>
                      <td className="py-1.5 text-right font-semibold">
                        {p.price.toLocaleString('vi-VN')}₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="pt-2">
            <button className="text-error font-semibold text-xs" onClick={() => setReportOpen(true)}>
              🚩 Báo cáo thông tin sai
            </button>
          </div>
        </div>

        {/* Map + promos */}
        <div className="space-y-4">
          <Suspense fallback={<div className="grid place-items-center bg-surface-2 rounded-2xl h-64 text-sm text-muted">Đang tải bản đồ…</div>}>
            <MapView
              pins={[{ id: loc.id, lng: loc.lng, lat: loc.lat, label: '📍' }]}
              selectedId={loc.id}
              className="h-64"
            />
          </Suspense>
          {loc.promotions.length > 0 && (
            <div className="card p-4">
              <h2 className="font-bold text-base mb-2">🎉 Ưu đãi đang áp dụng</h2>
              {loc.promotions.map((p) => (
                <div key={p.id} className="border-b border-line last:border-0 py-2">
                  <p className="font-semibold text-sm">{p.title}</p>
                  <p className="text-xs text-muted">{p.content}</p>
                  {p.discountLabel && <span className="chip bg-accent/10 text-accent mt-1">{p.discountLabel}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="card p-4">
        <h2 className="font-bold text-base mb-3">Đánh giá ({reviews.length})</h2>

        {/* rating breakdown */}
        <div className="mb-4 space-y-1">
          {[5, 4, 3, 2, 1].map((r) => {
            const count = loc.ratingBreakdown[String(r)] ?? 0;
            const pct = loc.ratingCount ? (count / loc.ratingCount) * 100 : 0;
            return (
              <div key={r} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-muted">{r}★</span>
                <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-muted">{count}</span>
              </div>
            );
          })}
        </div>

        {user && !loc.myReview && (
          <div className="border border-line rounded-xl p-3 mb-4">
            <p className="text-sm font-semibold mb-2">Viết đánh giá của bạn</p>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  className={`text-2xl ${r <= rating ? 'text-warning' : 'text-line'}`}
                  onClick={() => setRating(r)}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="input mb-2"
              rows={3}
              maxLength={500}
              placeholder="Chia sẻ trải nghiệm…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button className="btn-primary" onClick={submitReview}>
              Gửi đánh giá
            </button>
          </div>
        )}
        {!user && (
          <p className="text-sm text-muted mb-4">
            <Link to="/login" className="text-primary-600 font-semibold">Đăng nhập</Link> để viết đánh giá.
          </p>
        )}
        {loc.myReview && (
          <p className="chip bg-success/10 text-success mb-4">Bạn đã đánh giá địa điểm này ({loc.myReview.rating}★).</p>
        )}

        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-line last:border-0 pb-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="size-8 rounded-full bg-primary-50 text-primary-600 grid place-items-center font-bold">
                  {r.user.fullName.charAt(0)}
                </span>
                <span className="font-semibold">{r.user.fullName}</span>
                <span className="text-warning">{'★'.repeat(r.rating)}</span>
                <span className="text-xs text-muted ml-auto">
                  {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
              {r.reply && (
                <div className="mt-2 ml-6 bg-surface-2 rounded-xl p-2.5 text-sm">
                  <span className="font-semibold text-primary-600">
                    {r.reply.owner.storeName ?? r.reply.owner.fullName}{' '}
                  </span>
                  <span className="text-xs text-muted">đã phản hồi</span>
                  <p className="mt-0.5">{r.reply.content}</p>
                </div>
              )}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-muted">Chưa có đánh giá nào.</p>}
        </div>
      </section>

      {/* Report modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setReportOpen(false)}>
          <div className="card p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">Báo cáo thông tin sai</h3>
            <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="WRONG_ADDRESS">Sai địa chỉ</option>
              <option value="WRONG_PRICE">Sai giá</option>
              <option value="WRONG_HOURS">Sai giờ mở cửa</option>
              <option value="CLOSED">Địa điểm đã đóng cửa</option>
              <option value="OTHER">Thông tin khác sai</option>
            </select>
            <textarea
              className="input"
              rows={3}
              placeholder="Mô tả chi tiết (không bắt buộc)"
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setReportOpen(false)}>
                Hủy
              </button>
              <button className="btn-primary" onClick={submitReport}>
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
