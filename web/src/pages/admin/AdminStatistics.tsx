import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface Stats {
  usersByMonth: { month: string; count: number }[];
  reviewsByMonth: { month: string; count: number }[];
  locationsByCategory: { category: string; count: number }[];
  reportsByStatus: { status: string; count: number }[];
  promotionsByStatus: { status: string; count: number }[];
  topRated: { id: string; name: string; ratingAvg: number; ratingCount: number }[];
}

export default function AdminStatistics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Stats>('/admin/statistics').then(setStats).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="p-10 text-center text-error">{err}</div>;
  if (!stats) return <p className="p-10 text-center text-muted">Đang tải…</p>;

  const maxU = Math.max(...stats.usersByMonth.map((x) => x.count), 1);
  const maxR = Math.max(...stats.reviewsByMonth.map((x) => x.count), 1);
  const maxC = Math.max(...stats.locationsByCategory.map((x) => x.count), 1);

  const bar = (label: string, value: number, max: number, color: string) => (
    <div key={label} className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0 text-muted">{label}</span>
      <div className="flex-1 bg-surface-2 rounded-full h-3 overflow-hidden">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-8 text-right font-semibold">{value}</span>
    </div>
  );

  return (
    <div className="dashboard-page dashboard-page-wide">
      <Link to="/admin" className="text-sm text-primary-600 hover:underline">← Quay lại bảng quản trị</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-5">Thống kê</h1>

      <div className="dashboard-grid">
        <section className="card dashboard-section">
          <h2 className="dashboard-section-title">Người dùng mới / tháng</h2>
          {stats.usersByMonth.map((x) => bar(x.month, x.count, maxU, 'bg-primary-600'))}
        </section>

        <section className="card dashboard-section">
          <h2 className="dashboard-section-title">Đánh giá mới / tháng</h2>
          {stats.reviewsByMonth.map((x) => bar(x.month, x.count, maxR, 'bg-info'))}
        </section>

        <section className="card dashboard-section">
          <h2 className="dashboard-section-title">Địa điểm theo danh mục</h2>
          {stats.locationsByCategory.map((x) => bar(x.category, x.count, maxC, 'bg-accent'))}
        </section>

        <section className="card dashboard-section">
          <h2 className="dashboard-section-title">Báo cáo theo trạng thái</h2>
          {stats.reportsByStatus.map((x) => (
            <div key={x.status} className="flex justify-between text-sm py-1 border-b border-line last:border-0">
              <span className="text-muted">{x.status}</span>
              <span className="font-semibold">{x.count}</span>
            </div>
          ))}
          <h2 className="font-bold mt-4 mb-2">Ưu đãi theo trạng thái</h2>
          {stats.promotionsByStatus.map((x) => (
            <div key={x.status} className="flex justify-between text-sm py-1 border-b border-line last:border-0">
              <span className="text-muted">{x.status}</span>
              <span className="font-semibold">{x.count}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="card dashboard-section mt-5">
        <h2 className="dashboard-section-title">🏆 Top địa điểm được đánh giá cao</h2>
        {stats.topRated.map((l, i) => (
          <div key={l.id} className="flex items-center justify-between py-2 border-b border-line last:border-0 text-sm">
            <span>#{i + 1} <Link to={`/locations/${l.id}`} className="font-semibold hover:text-primary-600">{l.name}</Link></span>
            <span className="text-warning font-bold">★ {l.ratingAvg.toFixed(1)} <span className="text-muted font-normal">({l.ratingCount})</span></span>
          </div>
        ))}
      </section>
    </div>
  );
}
