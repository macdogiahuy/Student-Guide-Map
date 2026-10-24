import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { LocationListItem } from '../lib/types';
import LocationCard from '../components/LocationCard';
import { useAuth } from '../context/AuthContext';

export default function Favorites() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<LocationListItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    setError(null);
    api
      .get<{ items: LocationListItem[] }>('/favorites')
      .then((d) => setItems(d.items.map((item) => ({ ...item, isFavorite: true }))))
      .catch((e) => {
        setError(e instanceof ApiError && e.status === 401 ? 'Phiên đăng nhập đã hết hạn.' : 'Không thể tải danh sách yêu thích.');
      })
      .finally(() => setFetching(false));
  }, [user]);

  const remove = async (loc: LocationListItem) => {
    setError(null);
    setItems((prev) => prev.filter((p) => p.id !== loc.id));
    try {
      await api.del(`/favorites/${loc.id}`);
    } catch (e) {
      setItems((prev) => [loc, ...prev]);
      setError(e instanceof Error ? e.message : 'Không thể bỏ yêu thích.');
    }
  };

  if (loading) return <p className="p-10 text-center text-muted">Đang tải…</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-5">Địa điểm yêu thích</h1>
      {fetching ? (
        <p className="py-16 text-center text-muted">Đang tải danh sách yêu thích…</p>
      ) : error ? (
        <p role="alert" className="py-16 text-center text-error">{error}</p>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-muted">
          Chưa có địa điểm nào.{' '}
          <Link to="/" className="text-primary-600 font-semibold">
            Khám phá ngay →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((loc) => (
            <LocationCard key={loc.id} loc={loc} onToggleFavorite={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
