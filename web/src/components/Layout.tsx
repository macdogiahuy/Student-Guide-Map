import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-50 text-primary-600' : 'text-muted hover:bg-surface-2 hover:text-ink'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white">
              SG
            </span>
            <span className="hidden sm:inline">
              Student <span className="text-primary-600">Guide</span> Map
            </span>
          </Link>
          <nav className="flex items-center gap-1 ml-auto">
            <NavLink to="/" end className={navClass}>
              Trang chủ
            </NavLink>
            <NavLink to="/promotions" className={navClass}>
              Ưu đãi
            </NavLink>
            {user && (
              <NavLink to="/favorites" className={navClass}>
                Yêu thích
              </NavLink>
            )}
            {user?.role === 'STORE_OWNER' && (
              <NavLink to="/store" className={navClass}>
                Cửa hàng
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className={navClass}>
                Quản trị
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NavLink to="/notifications" className={navClass} aria-label="Thông báo">
                  🔔
                </NavLink>
                <NavLink to="/profile" className={navClass}>
                  {user.fullName.split(' ').slice(-1)[0]}
                </NavLink>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn-primary">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        Student Guide Map — dành cho sinh viên FPT · Bản đồ bởi Vietmap
      </footer>
    </div>
  );
}
