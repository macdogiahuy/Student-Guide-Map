import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Category, LocationDetail, Review } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

interface DashStats {
  stats: {
    totalLocations: number;
    pendingLocations: number;
    approvedLocations: number;
    activePromos: number;
    pendingPromos: number;
    newReviews: number;
    openCorrections: number;
  };
  recentReviews: (Review & { location: { id: string; name: string } })[];
}

type StoreLoc = LocationDetail & {
  status: string;
  rejectionReason?: string | null;
  priceRange?: string | null;
  category?: { id: string };
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  SUSPENDED: 'Tạm ngưng',
};

export default function StoreDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dash, setDash] = useState<DashStats | null>(null);
  const [locations, setLocations] = useState<StoreLoc[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [tab, setTab] = useState<'overview' | 'locations' | 'new' | 'promotions'>('overview');
  const [msg, setMsg] = useState<string | null>(null);

  // edit form
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    description: '',
    categoryId: '',
    priceLevel: 2,
    lat: 15.9675,
    lng: 108.2604,
    phone: '',
    priceRange: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectLoc, setRejectLoc] = useState<StoreLoc | null>(null);

  // new-location form
  const [form, setForm] = useState({
    name: '',
    address: '',
    description: '',
    categoryId: '',
    priceLevel: 2,
    lat: 15.9675,
    lng: 108.2604,
    phone: '',
  });

  // promotion form
  const [promo, setPromo] = useState({
    locationId: '',
    title: '',
    content: '',
    discountLabel: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
  });
  const [promos, setPromos] = useState<{ id: string; title: string; status: string; endDate: string; location: { name: string } }[]>([]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'locations' || requestedTab === 'promotions' || requestedTab === 'new') {
      setTab(requestedTab);
    } else if (!requestedTab) {
      setTab('overview');
    }
  }, [searchParams]);

  const loadAll = useCallback(async () => {
    const [d, l, p] = await Promise.all([
      api.get<DashStats>('/store/dashboard'),
      api.get<{ items: StoreLoc[] }>('/store/locations'),
      api.get<{ items: typeof promos }>('/promotions/mine'),
    ]);
    setDash(d);
    setLocations(l.items);
    setPromos(p.items);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && (!user || user.role === 'STUDENT')) navigate('/');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadAll().catch(() => undefined);
    api.get<Category[]>('/categories').then(setCats).catch(() => undefined);
  }, [user, loadAll]);

  const createLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations', { ...form, priceLevel: Number(form.priceLevel) });
      setMsg('Đã gửi địa điểm — chờ quản trị viên phê duyệt.');
      setTab('locations');
      setForm({ ...form, name: '', address: '', description: '' });
      loadAll();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    }
  };

  const openEdit = (l: StoreLoc) => {
    setEditId(l.id);
    setEditForm({
      name: l.name,
      address: l.address,
      description: l.description ?? '',
      categoryId: l.category?.id ?? '',
      priceLevel: l.priceLevel,
      lat: l.lat,
      lng: l.lng,
      phone: l.phone ?? '',
      priceRange: l.priceRange ?? '',
    });
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.patch(`/locations/${editId}`, {
        name: editForm.name,
        address: editForm.address,
        description: editForm.description || null,
        categoryId: editForm.categoryId,
        priceLevel: Number(editForm.priceLevel),
        lat: editForm.lat,
        lng: editForm.lng,
        phone: editForm.phone || null,
        priceRange: editForm.priceRange || null,
      });
      setMsg('Đã cập nhật thông tin địa điểm.');
      setEditOpen(false);
      loadAll();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi khi lưu');
    } finally {
      setEditSaving(false);
    }
  };

  const showReject = (l: StoreLoc) => {
    setRejectLoc(l);
    setRejectOpen(true);
  };

  const createPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/promotions', {
        ...promo,
        startDate: new Date(promo.startDate).toISOString(),
        endDate: new Date(promo.endDate).toISOString(),
      });
      setMsg('Đã gửi ưu đãi — chờ quản trị viên phê duyệt.');
      setTab('promotions');
      loadAll();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    }
  };

  if (loading || !dash) return <p className="p-10 text-center text-muted">Đang tải…</p>;

  const tabKeys = ['overview', 'locations', 'new', 'promotions'] as const;
  const moveTab = (current: typeof tab, direction: 1 | -1) => {
    const index = tabKeys.indexOf(current);
    const next = tabKeys[(index + direction + tabKeys.length) % tabKeys.length];
    setTab(next);
    document.getElementById(`store-tab-${next}`)?.focus();
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <h1 className="font-extrabold">Bảng điều khiển cửa hàng</h1>
          <p className="text-sm text-muted mt-1">Xin chào, {user?.storeName ?? user?.fullName}</p>
        </div>
      </div>

      {msg && <div className="chip bg-info/10 text-info w-full justify-center py-2 mb-4">{msg}</div>}

      <div className="dashboard-tabs" role="tablist" aria-label="Khu vực cửa hàng">
        {(
          [
            ['overview', 'Tổng quan'],
            ['locations', 'Địa điểm'],
            ['new', '+ Địa điểm mới'],
            ['promotions', 'Ưu đãi'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`store-tab-${key}`}
            aria-controls={`store-panel-${key}`}
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            className={`dashboard-tab ${tab === key ? 'dashboard-tab-active' : ''}`}
            onClick={() => setTab(key)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                moveTab(key, 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                moveTab(key, -1);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div id={`store-panel-${tab}`} role="tabpanel" aria-labelledby={`store-tab-${tab}`} tabIndex={0}>
      {tab === 'overview' && (
        <div className="dashboard-kpis">
          {(
            [
              ['Tổng địa điểm', dash.stats.totalLocations],
              ['Chờ duyệt', dash.stats.pendingLocations],
              ['Đã duyệt', dash.stats.approvedLocations],
              ['Ưu đãi active', dash.stats.activePromos],
              ['Đánh giá mới (30 ngày)', dash.stats.newReviews],
              ['Ưu đãi chờ duyệt', dash.stats.pendingPromos],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="card dashboard-kpi">
              <p className="text-xs text-muted">{label}</p>
              <p className="dashboard-kpi-value">{value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'overview' && (
        <section className="card dashboard-section">
          <h2 className="dashboard-section-title">Đánh giá gần đây</h2>
          {dash.recentReviews.length === 0 ? (
            <p className="text-sm text-muted">Chưa có đánh giá.</p>
          ) : (
            dash.recentReviews.map((r) => (
              <div key={r.id} className="border-b border-line last:border-0 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">{r.location.name}</span>
                  <span className="text-warning">{'★'.repeat(r.rating)}</span>
                </div>
                <p className="text-muted">{r.comment}</p>
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'locations' && (
        <div className="space-y-3">
          {locations.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-sm text-muted">{l.address}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                    <span
                      className={`chip ${
                        l.status === 'APPROVED'
                          ? 'bg-success/10 text-success'
                          : l.status === 'PENDING'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-error/10 text-error'
                      }`}
                    >
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                    <span className="chip bg-surface-2 text-muted">★ {l.ratingAvg.toFixed(1)}</span>
                  </div>
                  {l.status === 'REJECTED' && l.rejectionReason && (
                    <button
                      className="mt-2 text-xs text-error underline underline-offset-2 hover:text-error/80"
                      onClick={() => showReject(l)}
                    >
                      Xem lý do từ chối →
                    </button>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-primary text-sm" onClick={() => openEdit(l)}>
                    ✏️ Sửa
                  </button>
                  <button className="btn-ghost text-sm" onClick={() => navigate(`/locations/${l.id}`)}>
                    Chi tiết →
                  </button>
                </div>
              </div>
            </div>
          ))}
          {locations.length === 0 && <p className="text-muted">Chưa có địa điểm nào.</p>}
        </div>
      )}

      {tab === 'new' && (
        <form onSubmit={createLocation} className="card dashboard-section dashboard-form max-w-lg">
          <h2 className="font-bold">Thêm địa điểm mới</h2>
          <label className="dashboard-field">Tên địa điểm<input className="input" placeholder="Tên địa điểm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="dashboard-field">Địa chỉ<input className="input" placeholder="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
          <label className="dashboard-field">Mô tả<textarea className="input" rows={3} placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="dashboard-field">Danh mục<select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="">Chọn danh mục…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="dashboard-field">Vĩ độ<input className="input" type="number" step="any" placeholder="Vĩ độ (lat)" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} required /></label>
            <label className="dashboard-field">Kinh độ<input className="input" type="number" step="any" placeholder="Kinh độ (lng)" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} required /></label>
          </div>
          <label className="dashboard-field">Mức giá<select className="input" value={form.priceLevel} onChange={(e) => setForm({ ...form, priceLevel: Number(e.target.value) })}>
            <option value={1}>Giá thấp (1)</option>
            <option value={2}>Trung bình (2)</option>
            <option value={3}>Cao (3)</option>
            <option value={4}>Cao cấp (4)</option>
            <option value={5}>Premium (5)</option>
          </select></label>
          <label className="dashboard-field">Số điện thoại<input className="input" placeholder="Số điện thoại (tuỳ chọn)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <button className="btn-primary w-full">Gửi phê duyệt</button>
        </form>
      )}

      {tab === 'promotions' && (
        <div className="dashboard-grid">
          <form onSubmit={createPromo} className="card dashboard-section dashboard-form">
            <h2 className="dashboard-section-title">Tạo ưu đãi mới</h2>
            <label className="dashboard-field">Địa điểm<select className="input" value={promo.locationId} onChange={(e) => setPromo({ ...promo, locationId: e.target.value })} required>
              <option value="">Chọn địa điểm…</option>
              {locations.filter((l) => l.status === 'APPROVED').map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select></label>
            <label className="dashboard-field">Tiêu đề<input className="input" placeholder="Tiêu đề" value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })} required /></label>
            <label className="dashboard-field">Nội dung<textarea className="input" rows={2} placeholder="Nội dung" value={promo.content} onChange={(e) => setPromo({ ...promo, content: e.target.value })} required /></label>
            <label className="dashboard-field">Nhãn giảm giá<input className="input" placeholder="Ví dụ: -20%" value={promo.discountLabel} onChange={(e) => setPromo({ ...promo, discountLabel: e.target.value })} /></label>
            <div className="dashboard-form-grid">
              <label className="text-xs text-muted">Từ<input className="input mt-1" type="date" value={promo.startDate} onChange={(e) => setPromo({ ...promo, startDate: e.target.value })} required /></label>
              <label className="text-xs text-muted">Đến<input className="input mt-1" type="date" value={promo.endDate} onChange={(e) => setPromo({ ...promo, endDate: e.target.value })} required /></label>
            </div>
            <button className="btn-primary w-full">Gửi phê duyệt</button>
          </form>

          <div className="space-y-3">
            <h2 className="font-bold">Ưu đãi của tôi</h2>
            {promos.length === 0 && <p className="text-sm text-muted">Chưa có ưu đãi.</p>}
            {promos.map((p) => (
              <div key={p.id} className="card p-3.5 flex justify-between items-center gap-2">
                <div>
                  <p className="font-semibold text-sm">{p.title}</p>
                  <p className="text-xs text-muted">{p.location.name}</p>
                </div>
                <span
                  className={`chip shrink-0 ${
                    p.status === 'ACTIVE'
                      ? 'bg-accent/10 text-accent'
                      : p.status === 'PENDING'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-surface-2 text-muted'
                  }`}
                >
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Modal sửa địa điểm */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Sửa thông tin địa điểm" tone="info">
        <form onSubmit={saveEdit} className="dashboard-form">
          <label className="dashboard-field">Tên địa điểm<input className="input" placeholder="Tên địa điểm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></label>
          <label className="dashboard-field">Địa chỉ<input className="input" placeholder="Địa chỉ" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} required /></label>
          <label className="dashboard-field">Mô tả<textarea className="input" rows={3} placeholder="Mô tả" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label>
          <label className="dashboard-field">Danh mục<select className="input" value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })} required>
            <option value="">Chọn danh mục…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="dashboard-field">Vĩ độ<input className="input" type="number" step="any" placeholder="Vĩ độ (lat)" value={editForm.lat} onChange={(e) => setEditForm({ ...editForm, lat: Number(e.target.value) })} required /></label>
            <label className="dashboard-field">Kinh độ<input className="input" type="number" step="any" placeholder="Kinh độ (lng)" value={editForm.lng} onChange={(e) => setEditForm({ ...editForm, lng: Number(e.target.value) })} required /></label>
          </div>
          <label className="dashboard-field">Mức giá<select className="input" value={editForm.priceLevel} onChange={(e) => setEditForm({ ...editForm, priceLevel: Number(e.target.value) })}>
            <option value={1}>Giá thấp (1)</option>
            <option value={2}>Trung bình (2)</option>
            <option value={3}>Cao (3)</option>
            <option value={4}>Cao cấp (4)</option>
            <option value={5}>Premium (5)</option>
          </select></label>
          <label className="dashboard-field">Số điện thoại<input className="input" placeholder="Số điện thoại (tuỳ chọn)" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></label>
          <label className="dashboard-field">Khoảng giá<input className="input" placeholder="Ví dụ: 15k–40k" value={editForm.priceRange} onChange={(e) => setEditForm({ ...editForm, priceRange: e.target.value })} /></label>
          <button className="btn-primary w-full" disabled={editSaving}>
            {editSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </form>
      </Modal>

      {/* Modal lý do từ chối */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Lý do từ chối" tone="error">
        {rejectLoc && (
          <div className="space-y-3">
            <p className="text-sm">
              <b>{rejectLoc.name}</b> bị quản trị viên từ chối.
            </p>
            <div className="rounded-xl bg-error/10 border border-error/30 p-4 text-sm leading-relaxed text-error">
              {rejectLoc.rejectionReason || 'Không có lý do cụ thể.'}
            </div>
            <p className="text-xs text-muted">
              Vui lòng chỉnh sửa thông tin và gửi lại để được duyệt.
            </p>
            <button
              className="btn-primary w-full"
              onClick={() => {
                setRejectOpen(false);
                openEdit(rejectLoc);
              }}
            >
              ✏️ Sửa &amp; gửi lại
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
