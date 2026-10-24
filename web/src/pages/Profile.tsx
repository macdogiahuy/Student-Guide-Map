import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Sinh viên',
  STORE_OWNER: 'Chủ cửa hàng',
  ADMIN: 'Quản trị viên',
};

function requestError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    return error.message || fallback;
  }
  return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';
}

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; createdAt: string; location: { id: string; name: string } }[]>([]);
  const [reports, setReports] = useState<{ id: string; typeLabel: string; status: string; createdAt: string; location: { id: string; name: string } }[]>([]);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({ fullName: '', phone: '', storeName: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });

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
    setProfileErrors({});
    if (form.fullName.trim().length < 2) {
      setProfileErrors({ fullName: 'Họ và tên phải có ít nhất 2 ký tự.' });
      return;
    }
    if (form.phone && !/^[0-9+\s().-]{8,20}$/.test(form.phone)) {
      setProfileErrors({ phone: 'Số điện thoại không hợp lệ.' });
      return;
    }
    setSavingProfile(true);
    try {
      await api.patch('/users/me', {
        fullName: form.fullName,
        phone: form.phone || null,
        storeName: user?.role === 'STORE_OWNER' && form.storeName ? form.storeName : null,
      });
      await refreshUser();
      setMsg('Đã cập nhật hồ sơ.');
    } catch (err) {
      if (err instanceof ApiError && err.errors.length) {
        setProfileErrors(Object.fromEntries(err.errors.map((item) => {
          const [field, ...message] = item.split(': ');
          return [field, message.join(': ') || err.message];
        })));
      } else {
        setMsg(requestError(err, 'Không thể cập nhật hồ sơ.'));
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setPasswordErrors({});
    const errors: Record<string, string> = {};
    if (!pwd.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (pwd.newPassword.length < 8 || !/[A-Za-z]/.test(pwd.newPassword) || !/[0-9]/.test(pwd.newPassword)) {
      errors.newPassword = 'Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.';
    }
    if (pwd.newPassword !== pwd.confirm) {
      errors.confirm = 'Mật khẩu xác nhận không khớp.';
    }
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg('Đã đổi mật khẩu.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setPasswordErrors({ currentPassword: err.message });
      } else {
        setMsg(requestError(err, 'Không thể đổi mật khẩu.'));
      }
    } finally {
      setChangingPassword(false);
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
          id="profile-full-name"
          className="input"
          placeholder="Họ và tên"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
          minLength={2}
        />
        {profileErrors.fullName && <p className="text-xs text-error">{profileErrors.fullName}</p>}
        <input
          id="profile-phone"
          className="input"
          placeholder="Số điện thoại"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {profileErrors.phone && <p className="text-xs text-error">{profileErrors.phone}</p>}
        {user.role === 'STORE_OWNER' && (
          <input
            id="profile-store-name"
            className="input"
            placeholder="Tên cửa hàng"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
          />
        )}
        {profileErrors.storeName && <p className="text-xs text-error">{profileErrors.storeName}</p>}
        <button className="btn-primary" disabled={savingProfile}>{savingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </form>

      <form onSubmit={changePassword} className="card p-5 space-y-3">
        <h2 className="font-bold">Đổi mật khẩu</h2>
        <div>
          <label className="sr-only" htmlFor="current-password">Mật khẩu hiện tại</label>
          <div className="relative">
        <input
          id="current-password"
          className="input"
          type={showPasswords.current ? 'text' : 'password'}
          placeholder="Mật khẩu hiện tại"
          value={pwd.currentPassword}
          onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
          required
        />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted" aria-label={showPasswords.current ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'} onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}>{showPasswords.current ? 'Ẩn' : 'Hiện'}</button>
          </div>
          {passwordErrors.currentPassword && <p className="text-xs text-error mt-1">{passwordErrors.currentPassword}</p>}
        </div>
        <div>
          <label className="sr-only" htmlFor="new-password">Mật khẩu mới</label>
          <div className="relative">
        <input
          id="new-password"
          className="input"
          type={showPasswords.next ? 'text' : 'password'}
          placeholder="Mật khẩu mới (tối thiểu 8 ký tự, có chữ & số)"
          value={pwd.newPassword}
          onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
          required
          minLength={8}
        />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted" aria-label={showPasswords.next ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'} onClick={() => setShowPasswords((p) => ({ ...p, next: !p.next }))}>{showPasswords.next ? 'Ẩn' : 'Hiện'}</button>
          </div>
          {passwordErrors.newPassword && <p className="text-xs text-error mt-1">{passwordErrors.newPassword}</p>}
        </div>
        <div>
          <label className="sr-only" htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
          <div className="relative">
        <input
          id="confirm-password"
          className="input"
          type={showPasswords.confirm ? 'text' : 'password'}
          placeholder="Xác nhận mật khẩu mới"
          value={pwd.confirm}
          onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
          required
        />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted" aria-label={showPasswords.confirm ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'} onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}>{showPasswords.confirm ? 'Ẩn' : 'Hiện'}</button>
          </div>
          {passwordErrors.confirm && <p className="text-xs text-error mt-1">{passwordErrors.confirm}</p>}
        </div>
        <button className="btn-primary" disabled={changingPassword}>{changingPassword ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
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
