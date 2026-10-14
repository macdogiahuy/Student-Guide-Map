import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Sinh viên',
  STORE_OWNER: 'Chủ cửa hàng',
  ADMIN: 'Quản trị viên',
};

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; createdAt: string; location: { id: string; name: string } }[]>([]);
  const [reports, setReports] = useState<{ id: string; typeLabel: string; status: string; createdAt: string; location: { id: string; name: string } }[]>([]);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({ fullName: '', phone: '', storeName: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setForm({ fullName: user.fullName, phone: user.phone ?? '', storeName: user.storeName ?? '' });
    api.get<{ items: typeof reviews }>('/reviews/mine?limit=20').then((d) => setReviews(d.items)).catch(() => undefined);
    api.get<{ items: typeof reports }>('/reports/mine?limit=20').then((d) => setReports(d.items)).catch(() => undefined);
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.patch('/users/me', {
        fullName: form.fullName,
        phone: form.phone || null,
        storeName: user?.role === 'STORE_OWNER' && form.storeName ? form.storeName : null,
      });
      await refreshUser();
      setMsg('Đã cập nhật hồ sơ.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (pwd.newPassword !== pwd.confirm) {
      setMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    try {
      await api.post('/users/me/change-password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg('Đã đổi mật khẩu.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    }
  };

  if (loading || !user) return <p className="p-10 text-center text-muted">Đang tải…</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      {msg && <div className="chip bg-info/10 text-info w-full justify-center py-2">{msg}</div>}

      <div className="card p-6 flex items-center gap-4">
        <div className="size-16 rounded-2xl bg-primary-50 text-primary-600 grid place-items-center text-2xl font-extrabold">
          {user.fullName.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-extrabold">{user.fullName}</h1>
          <p className="text-sm text-muted">{user.email}</p>
          <span className="chip bg-primary-50 text-primary-600 mt-1">{ROLE_LABEL[user.role]}</span>
          {user.storeName && <span className="chip bg-surface-2 text-muted mt-1 ml-1">{user.storeName}</span>}
        </div>
      </div>

      <form onSubmit={saveProfile} className="card p-5 space-y-3">
        <h2 className="font-bold">Cập nhật hồ sơ</h2>
        <input
          className="input"
          placeholder="Họ và tên"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
          minLength={2}
        />
        <input
          className="input"
          placeholder="Số điện thoại"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {user.role === 'STORE_OWNER' && (
          <input
            className="input"
            placeholder="Tên cửa hàng"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
          />
        )}
        <button className="btn-primary">Lưu thay đổi</button>
      </form>

      <form onSubmit={changePassword} className="card p-5 space-y-3">
        <h2 className="font-bold">Đổi mật khẩu</h2>
        <input
          className="input"
          type="password"
          placeholder="Mật khẩu hiện tại"
          value={pwd.currentPassword}
          onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Mật khẩu mới (tối thiểu 8 ký tự, có chữ & số)"
          value={pwd.newPassword}
          onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
          required
          minLength={8}
        />
        <input
          className="input"
          type="password"
          placeholder="Xác nhận mật khẩu mới"
          value={pwd.confirm}
          onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
          required
        />
        <button className="btn-primary">Đổi mật khẩu</button>
      </form>

      <section className="card p-5">
        <h2 className="font-bold mb-3">Đánh giá của tôi ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">Chưa có đánh giá nào.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-line last:border-0 pb-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{r.location.name}</span>
                  <span className="text-warning">{'★'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="text-muted mt-0.5">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-bold mb-3">Báo cáo của tôi ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted">Chưa có báo cáo nào.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="text-sm border-b border-line last:border-0 pb-2 flex justify-between gap-2">
                <span>
                  <span className="font-semibold">{r.typeLabel}</span> — {r.location.name}
                </span>
                <span className="chip bg-surface-2 text-muted shrink-0">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
