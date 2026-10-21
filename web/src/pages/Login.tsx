import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Login() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpMsg, setOtpMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'STORE_OWNER' ? '/store' : '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại.';
      if (msg.includes('chưa được xác thực') || msg.includes('chua duoc xac thuc')) {
        setPendingVerify(true);
        setError(null);
        // Gửi lại OTP và hiển thị mã dev
        try {
          const res = await api.post<{ devOtp?: string }>('/auth/resend-otp', { email });
          if (res.devOtp) setDevOtp(res.devOtp);
          setOtpMsg('Tài khoản chưa xác thực. Mã OTP mới đã được gửi.');
        } catch {
          setOtpMsg('Tài khoản chưa xác thực. Vui lòng nhập mã OTP.');
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await verifyOtp(email, otp);
      // Sau khi xác thực xong, đăng nhập lại
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'STORE_OWNER' ? '/store' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã OTP không đúng.');
    }
  };

  const resend = async () => {
    try {
      const res = await api.post<{ devOtp?: string }>('/auth/resend-otp', { email });
      if (res.devOtp) setDevOtp(res.devOtp);
      setOtpMsg('Đã gửi lại mã OTP.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi lại được mã.');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        {!pendingVerify ? (
          <>
            <h1 className="text-2xl font-extrabold mb-1">Đăng nhập</h1>
            <p className="text-sm text-muted mb-5">Chào mừng bạn quay lại Student Guide Map.</p>
            {error && <div className="chip bg-error/10 text-error w-full justify-center py-2 mb-3">{error}</div>}
            <form onSubmit={submit} className="space-y-3">
              <label className="sr-only" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="sr-only" htmlFor="login-password">Mật khẩu</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
            </form>
            <p className="mt-4 text-sm text-muted text-center">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-primary-600 font-semibold">
                Đăng ký
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold mb-1">Xác thực tài khoản</h1>
            <p className="text-sm text-muted mb-3">
              Tài khoản <b>{email}</b> chưa được xác thực. Nhập mã OTP để kích hoạt.
            </p>
            {otpMsg && <div className="chip bg-info/10 text-info w-full justify-center py-2 mb-3">{otpMsg}</div>}
            {devOtp && (
              <div className="chip bg-warning/10 text-warning w-full justify-center py-2 mb-3">
                Mã OTP (dev): <b className="tracking-[0.3em]">{devOtp}</b>
              </div>
            )}
            {error && <div className="chip bg-error/10 text-error w-full justify-center py-2 mb-3">{error}</div>}
            <form onSubmit={confirmOtp} className="space-y-3">
              <label className="sr-only" htmlFor="login-otp">Mã OTP</label>
              <input
                id="login-otp"
                className="input text-center tracking-[0.5em] text-lg"
                placeholder="••••••"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <button className="btn-primary w-full">Xác nhận OTP</button>
              <button type="button" className="btn-ghost w-full text-sm" onClick={resend}>
                Gửi lại mã OTP
              </button>
            </form>
            <p className="mt-4 text-sm text-muted text-center">
              <button className="text-primary-600 font-semibold" onClick={() => { setPendingVerify(false); setError(null); }}>
                Quay lại đăng nhập
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
