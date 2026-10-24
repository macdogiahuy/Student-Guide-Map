import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-50 text-primary-600' : 'text-muted hover:bg-surface-2 hover:text-ink'
  }`;

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `mobile-nav-link ${isActive ? 'mobile-nav-link-active' : ''}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY >= 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dashboardNav =
    user?.role === 'ADMIN'
      ? [
          { to: '/admin', label: 'Tổng quan', icon: '●' },
          { to: '/admin/categories', label: 'Danh mục', icon: '≡' },
          { to: '/admin/statistics', label: 'Thống kê', icon: '▥' },
          { to: '/profile', label: 'Tài khoản', icon: '○' },
        ]
      : user?.role === 'STORE_OWNER'
        ? [
            { to: '/store', label: 'Tổng quan', icon: '●' },
            { to: '/store?tab=locations', label: 'Địa điểm', icon: '◇' },
            { to: '/store?tab=promotions', label: 'Ưu đãi', icon: '▣' },
            { to: '/profile', label: 'Tài khoản', icon: '○' },
          ]
        : [
            { to: '/', label: 'Trang chủ', icon: '●' },
            { to: '/promotions', label: 'Ưu đãi', icon: '▣' },
            { to: location.pathname === '/' ? '/?view=map' : '/', label: 'Bản đồ', icon: '◇' },
            { to: user ? '/favorites' : '/login', label: 'Yêu thích', icon: '♡' },
          ];

  const dashboardNavClass = (item: (typeof dashboardNav)[number], isActive: boolean) => {
    if (user?.role !== 'STORE_OWNER') return mobileNavClass({ isActive });
    const requestedTab = new URLSearchParams(location.search).get('tab');
    const itemTab = new URL(item.to, window.location.origin).searchParams.get('tab');
    const storeTabActive = itemTab ? requestedTab === itemTab : !requestedTab;
    return mobileNavClass({ isActive: isActive && storeTabActive });
  };

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
          <nav className="hidden md:flex items-center gap-1 ml-auto" aria-label="Điều hướng chính">
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
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <>
                <NavLink to="/notifications" className={navClass} aria-label="Thông báo">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                  </svg>
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
          <div className="flex sm:hidden items-center gap-1 ml-auto">
            {user ? (
              <>
                <NavLink to="/notifications" className={navClass} aria-label="Thông báo">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                  </svg>
                </NavLink>
                <NavLink to="/profile" className={navClass} aria-label="Hồ sơ">
                  {user.fullName.split(' ').slice(-1)[0]}
                </NavLink>
              </>
            ) : (
              <Link to="/login" className="btn-ghost">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1" id="main-content">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        Student Guide Map — dành cho sinh viên FPT · Bản đồ bởi Vietmap
      </footer>
      <nav className="mobile-bottom-nav md:hidden" aria-label="Điều hướng mobile">
        {dashboardNav.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/admin' || item.to === '/store' || item.to === '/'}
            className={({ isActive }) => dashboardNavClass(item, isActive)}
          >
            <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          aria-label="Về đầu trang"
          onClick={scrollToTop}
        >
          ↑
        </button>
      )}
    </div>
  );
}
