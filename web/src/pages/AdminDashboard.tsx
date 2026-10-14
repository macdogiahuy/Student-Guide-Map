import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

type DecideAction = {
  kind: 'loc' | 'promo';
  id: string;
  name: string;
  decision: string;
} | null;

interface AdminDash {
  stats: Record<string, number>;
  recentLocations: { id: string; name: string; address?: string; status: string; createdAt: string; owner: { fullName: string } }[];
  recentReports: { id: string; type: string; status: string; createdAt: string; location: { name: string }; reporter: { fullName: string } }[];
}

const LOC_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ duyệt', cls: 'bg-warning/10 text-warning' },
  APPROVED: { label: 'Đã duyệt', cls: 'bg-success/10 text-success' },
  REJECTED: { label: 'Từ chối', cls: 'bg-error/10 text-error' },
  SUSPENDED: { label: 'Tạm ngưng', cls: 'bg-surface-2 text-muted' },
};

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dash, setDash] = useState<AdminDash | null>(null);
  const [tab, setTab] = useState<'overview' | 'locations' | 'promotions' | 'reports' | 'reviews' | 'users'>('overview');
  const [pendingLocs, setPendingLocs] = useState<AdminDash['recentLocations']>([]);
  const [pendingPromos, setPendingPromos] = useState<{ id: string; title: string; location: { name: string }; createdAt: string }[]>([]);
  const [reports, setReports] = useState<{ id: string; typeLabel: string; status: string; content: string | null; location: { name: string }; reporter: { fullName: string } }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [decide, setDecide] = useState<DecideAction>(null);
  const [decideReason, setDecideReason] = useState('');

  const loadAll = useCallback(async () => {
    const [d, locs, promos, reps] = await Promise.all([
      api.get<AdminDash>('/admin/dashboard'),
      api.get<{ items: AdminDash['recentLocations'] }>('/admin/locations?status=PENDING&limit=50'),
      api.get<{ items: { id: string; title: string; status: string; location: { name: string }; createdAt: string }[] }>('/admin/promotions?status=PENDING&limit=50'),
      api.get<{ items: any[] }>('/reports?status=PENDING&limit=50'),
    ]);
    setDash(d);
    setPendingLocs(locs.items);
    setPendingPromos(promos.items);
    setReports(reps.items as any);
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) navigate('/');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) loadAll().catch(() => undefined);
  }, [user, loadAll]);

  const openDecideLoc = (id: string, name: string, decision: 'APPROVED' | 'REJECTED') => {
    setDecideReason('');
    setDecide({ kind: 'loc', id, name, decision });
  };

  const openDecidePromo = (id: string, name: string, decision: 'ACTIVE' | 'REJECTED') => {
    setDecideReason('');
    setDecide({ kind: 'promo', id, name, decision });
  };

  const confirmDecide = async () => {
    if (!decide) return;
    if (decide.decision === 'REJECTED' && !decideReason.trim()) return;
    try {
      if (decide.kind === 'loc') {
        await api.post(`/locations/${decide.id}/decide`, {
          decision: decide.decision,
          reason: decideReason.trim() || undefined,
        });
        setPendingLocs((p) => p.filter((l) => l.id !== decide.id));
      } else {
        await api.post(`/promotions/${decide.id}/decide`, {
          decision: decide.decision,
          reason: decideReason.trim() || undefined,
        });
        setPendingPromos((p) => p.filter((x) => x.id !== decide.id));
      }
      setMsg(decide.decision === 'REJECTED' || decide.decision === 'APPROVED' || decide.decision === 'ACTIVE' ? 'Đã xử lý.' : 'Đã xử lý.');
      setDecide(null);
      loadAll();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
      setDecide(null);
    }
  };

  const [reportAction, setReportAction] = useState<{ id: string; status: string; note: string } | null>(null);

  const openProcessReport = (id: string, status: string) => {
    setReportAction({ id, status, note: '' });
  };

  const confirmProcessReport = async () => {
    if (!reportAction) return;
    try {
      await api.patch(`/reports/${reportAction.id}/process`, {
        status: reportAction.status,
        adminNote: reportAction.note.trim() || undefined,
      });
      setMsg('Đã cập nhật báo cáo.');
      setReports((p) => p.filter((r) => r.id !== reportAction.id));
      setReportAction(null);
      loadAll();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
      setReportAction(null);
    }
  };

  const moderateReview = async (id: string, status: string) => {
    try {
      await api.patch(`/reviews/${id}/moderate`, { status });
      setMsg('Đã kiểm duyệt đánh giá.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
    }
  };

  if (loading || !dash) return <p className="p-10 text-center text-muted">Đang tải…</p>;

  const s = dash.stats;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-1">Bảng quản trị</h1>
      <p className="text-sm text-muted mb-5">Xin chào, {user?.fullName} 👋</p>

      {msg && <div className="chip bg-info/10 text-info w-full justify-center py-2 mb-4">{msg}</div>}

      <div className="flex gap-1 mb-5 border-b border-line overflow-x-auto">
        {(
          [
            ['overview', 'Tổng quan'],
            ['locations', `Duyệt địa điểm (${s.pendingLocations ?? 0})`],
            ['promotions', `Duyệt ưu đãi (${s.pendingPromotions ?? 0})`],
            ['reports', `Báo cáo (${s.pendingReports ?? 0})`],
            ['reviews', 'Kiểm duyệt đánh giá'],
            ['users', 'Người dùng'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${
              tab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-muted'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {(
              [
                ['Sinh viên', s.totalStudents],
                ['Chủ cửa hàng', s.totalStoreOwners],
                ['Tổng địa điểm', s.totalLocations],
                ['Chờ duyệt địa điểm', s.pendingLocations],
                ['Đã duyệt', s.approvedLocations],
                ['Ưu đãi active', s.activePromotions],
                ['Báo cáo chờ xử lý', s.pendingReports],
                ['Đánh giá hiển thị', s.displayedReviews],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="text-2xl font-extrabold text-primary-600">{value ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <section className="card p-5">
              <h2 className="font-bold mb-3">Địa điểm mới nhất</h2>
              {dash.recentLocations.map((l) => (
                <div key={l.id} className="border-b border-line last:border-0 py-2 text-sm flex justify-between gap-2">
                  <Link to={`/locations/${l.id}`} className="font-semibold hover:text-primary-600">{l.name}</Link>
                  <span className={`chip shrink-0 ${LOC_STATUS[l.status]?.cls}`}>{LOC_STATUS[l.status]?.label}</span>
                </div>
              ))}
            </section>
            <section className="card p-5">
              <h2 className="font-bold mb-3">Báo cáo mới nhất</h2>
              {dash.recentReports.map((r) => (
                <div key={r.id} className="border-b border-line last:border-0 py-2 text-sm">
                  <span className="font-semibold">{r.location.name}</span>
                  <span className="text-muted"> — {r.type} ({r.reporter.fullName})</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}

      {tab === 'locations' && (
        <div className="space-y-3">
          {pendingLocs.length === 0 && <p className="text-muted">Không có địa điểm chờ duyệt. 🎉</p>}
          {pendingLocs.map((l) => (
            <div key={l.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to={`/locations/${l.id}`} className="font-semibold hover:text-primary-600">{l.name}</Link>
                <p className="text-sm text-muted">{l.address} · chủ: {l.owner.fullName}</p>
                <p className="text-xs text-muted">{new Date(l.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-sm" onClick={() => openDecideLoc(l.id, l.name, 'APPROVED')}>✓ Duyệt</button>
                <button className="btn-ghost text-sm !text-error" onClick={() => openDecideLoc(l.id, l.name, 'REJECTED')}>✕ Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'promotions' && (
        <div className="space-y-3">
          {pendingPromos.length === 0 && <p className="text-muted">Không có ưu đãi chờ duyệt. 🎉</p>}
          {pendingPromos.map((p) => (
            <div key={p.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted">Địa điểm: {p.location.name}</p>
                <p className="text-xs text-muted">{new Date(p.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-sm" onClick={() => openDecidePromo(p.id, p.title, 'ACTIVE')}>✓ Duyệt</button>
                <button className="btn-ghost text-sm !text-error" onClick={() => openDecidePromo(p.id, p.title, 'REJECTED')}>✕ Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-muted">Không có báo cáo chờ xử lý.</p>}
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.typeLabel} — {r.location.name}</p>
                  <p className="text-sm text-muted">bởi {r.reporter.fullName}</p>
                  {r.content && <p className="text-sm mt-1">{r.content}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-sm" onClick={() => openProcessReport(r.id, 'RESOLVED')}>Đã xử lý</button>
                  <button className="btn-ghost text-sm" onClick={() => openProcessReport(r.id, 'IN_PROGRESS')}>Đang xử lý</button>
                  <button className="btn-ghost text-sm !text-error" onClick={() => openProcessReport(r.id, 'REJECTED')}>Từ chối</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <ReviewsModeration onDone={moderateReview} />
      )}

      {tab === 'users' && (
        <UsersPanel />
      )}

      {/* shortcuts */}
      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        <Link to="/admin/categories" className="card p-4 hover:shadow-md">
          <p className="font-bold">📂 Quản lý danh mục</p>
          <p className="text-sm text-muted">Thêm / sửa / ẩn danh mục địa điểm</p>
        </Link>
        <Link to="/admin/statistics" className="card p-4 hover:shadow-md">
          <p className="font-bold">📊 Thống kê</p>
          <p className="text-sm text-muted">Xu hướng người dùng, đánh giá, địa điểm theo danh mục</p>
        </Link>
      </div>

      {/* Decide modal — địa điểm / ưu đãi */}
      <Modal
        open={!!decide}
        onClose={() => setDecide(null)}
        title={decide?.decision === 'REJECTED' ? 'Lý do từ chối' : 'Xác nhận duyệt'}
        tone={decide?.decision === 'REJECTED' ? 'error' : 'success'}
      >
        {decide && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {decide.kind === 'loc' ? 'Địa điểm' : 'Ưu đãi'}: <b className="text-ink">{decide.name}</b>
            </p>
            {decide.decision === 'REJECTED' ? (
              <>
                <textarea
                  className="input min-h-[96px] resize-y"
                  placeholder="Nhập lý do từ chối (gửi cho chủ shop)…"
                  value={decideReason}
                  onChange={(e) => setDecideReason(e.target.value)}
                  autoFocus
                />
                <button
                  className="btn-primary w-full !bg-error"
                  disabled={!decideReason.trim()}
                  onClick={confirmDecide}
                >
                  Gửi lý do &amp; từ chối
                </button>
              </>
            ) : (
              <button className="btn-primary w-full" onClick={confirmDecide}>
                ✓ Xác nhận duyệt
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Process report modal */}
      <Modal
        open={!!reportAction}
        onClose={() => setReportAction(null)}
        title="Xử lý báo cáo"
        tone={
          reportAction?.status === 'REJECTED'
            ? 'error'
            : reportAction?.status === 'RESOLVED'
              ? 'success'
              : 'warning'
        }
      >
        {reportAction && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Trạng thái:{' '}
              <b className="text-ink">
                {reportAction.status === 'RESOLVED'
                  ? 'Đã giải quyết'
                  : reportAction.status === 'REJECTED'
                    ? 'Bị từ chối'
                    : 'Đang xử lý'}
              </b>
              <br />
              Lời nhắn này sẽ gửi cho người báo cáo và chủ shop.
            </p>
            <textarea
              className="input min-h-[96px] resize-y"
              placeholder="Ghi chú admin (tuỳ chọn)…"
              value={reportAction.note}
              onChange={(e) => setReportAction({ ...reportAction, note: e.target.value })}
              autoFocus
            />
            <button className="btn-primary w-full" onClick={confirmProcessReport}>
              Gửi &amp; cập nhật
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ReviewsModeration({ onDone }: { onDone: (id: string, status: string) => void }) {
  const [items, setItems] = useState<{ id: string; rating: number; comment: string | null; status: string; user: { fullName: string }; location: { name: string } }[]>([]);
  const [status, setStatus] = useState('DISPLAYED');

  useEffect(() => {
    api
      .get<{ items: typeof items }>(`/admin/reviews?status=${status}&limit=50`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [status]);

  return (
    <div>
      <select className="input !w-auto mb-3" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="DISPLAYED">Đang hiển thị</option>
        <option value="HIDDEN">Bị ẩn</option>
      </select>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-muted">Không có đánh giá.</p>}
        {items.map((r) => (
          <div key={r.id} className="card p-4 flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-sm">
                <span className="font-semibold">{r.user.fullName}</span>{' '}
                <span className="text-warning">{'★'.repeat(r.rating)}</span>{' '}
                <span className="text-muted">— {r.location.name}</span>
              </p>
              {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
            </div>
            <div className="flex gap-2">
              {r.status !== 'HIDDEN' && (
                <button className="btn-ghost text-sm" onClick={() => { onDone(r.id, 'HIDDEN'); setItems((p) => p.filter((x) => x.id !== r.id)); }}>
                  Ẩn
                </button>
              )}
              {r.status !== 'DISPLAYED' && (
                <button className="btn-primary text-sm" onClick={() => { onDone(r.id, 'DISPLAYED'); setItems((p) => p.filter((x) => x.id !== r.id)); }}>
                  Hiển thị
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersPanel() {
  const [items, setItems] = useState<{ id: string; fullName: string; email: string; role: string; status: string }[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get<{ items: typeof items }>(`/admin/users?limit=50${q ? `&q=${encodeURIComponent(q)}` : ''}`)
        .then((d) => setItems(d.items))
        .catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const toggle = async (u: { id: string; status: string }) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${u.id}`, { status: next });
      setItems((p) => p.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Lỗi');
    }
  };

  return (
    <div>
      <input className="input max-w-md mb-3" placeholder="Tìm người dùng…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card divide-y divide-line">
        {items.map((u) => (
          <div key={u.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold">{u.fullName} <span className="text-muted font-normal">({u.role})</span></p>
              <p className="text-muted">{u.email}</p>
            </div>
            <button
              className={`chip ${u.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
              onClick={() => toggle(u)}
            >
              {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="p-4 text-muted">Không có người dùng.</p>}
      </div>
    </div>
  );
}
