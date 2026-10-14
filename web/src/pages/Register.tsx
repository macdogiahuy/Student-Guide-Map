import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'STUDENT' | 'STORE_OWNER',
    storeName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const { verifyOtp } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const code = await register(form);
      // Backend tắt OTP → đăng ký xong sang đăng nhập luôn
      if (!code) {
        navigate('/login', { state: { email: form.email } });
        return;
      }
      setDevOtp(code);
      setOtpSent(true);
      setEmailExists(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại.';
      if (msg.includes('đã được đăng ký') || msg.includes('da duoc dang ky')) {
        setEmailExists(true);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendForExisting = async () => {
    setError(null);
    try {
      const res = await api.post<{ devOtp?: string }>('/auth/resend-otp', { email: form.email });
      if (res.devOtp) setDevOtp(res.devOtp);
      setEmailExists(false);
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi lại được mã.');
    }
  };

  const confirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await verifyOtp(form.email, otp);
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã OTP không đúng.');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold mb-1">Đăng ký</h1>
        <p className="text-sm text-muted mb-5">Tạo tài khoản để đánh giá & lưu địa điểm.</p>
        {error && <div className="chip bg-error/10 text-error w-full justify-center py-2 mb-3">{error}</div>}

        {!otpSent ? (
          <>
            {emailExists && (
              <div className="chip bg-warning/10 text-warning w-full justify-center py-2 mb-3">
                Email <b>{form.email}</b> đã được đăng ký.
              </div>
            )}
            {emailExists && (
              <div className="flex gap-2 mb-3">
                <button type="button" className="btn-primary flex-1 text-sm" onClick={resendForExisting}>
                  Gửi lại mã OTP
                </button>
                <Link to="/login" className="btn-ghost flex-1 text-sm">
                  Đăng nhập
                </Link>
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
            <input
              className="input"
              placeholder="Họ và tên"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Mật khẩu (tối thiểu 8 ký tự, có chữ & số)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'STUDENT' | 'STORE_OWNER' })}
            >
              <option value="STUDENT">Tôi là sinh viên</option>
              <option value="STORE_OWNER">Tôi là chủ cửa hàng</option>
            </select>
            {form.role === 'STORE_OWNER' && (
              <input
                className="input"
                placeholder="Tên cửa hàng"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                required
              />
            )}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Đang đăng ký…' : 'Đăng ký'}
            </button>
          </form>
          </>
        ) : (
          <form onSubmit={confirmOtp} className="space-y-3">
            <p className="text-sm">
              Mã OTP đã gửi tới <b>{form.email}</b>. Nhập mã để kích hoạt tài khoản.
            </p>
            {devOtp && (
              <div className="chip bg-warning/10 text-warning w-full justify-center py-2">
                Mã OTP (dev): <b className="tracking-[0.3em]">{devOtp}</b>
              </div>
            )}
            <input
              className="input text-center tracking-[0.5em] text-lg"
              placeholder="••••••"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button className="btn-primary w-full">Xác nhận OTP</button>
            <button
              type="button"
              className="btn-ghost w-full text-sm"
              onClick={async () => {
                try {
                  const res = await api.post<{ devOtp?: string }>('/auth/resend-otp', { email: form.email });
                  if (res.devOtp) setDevOtp(res.devOtp);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Không gửi lại được mã.');
                }
              }}
            >
              Gửi lại mã OTP
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-muted text-center">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary-600 font-semibold">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
