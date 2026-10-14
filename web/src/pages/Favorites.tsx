import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { LocationListItem } from '../lib/types';
import LocationCard from '../components/LocationCard';
import { useAuth } from '../context/AuthContext';

export default function Favorites() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<LocationListItem[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ items: LocationListItem[] }>('/favorites')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [user]);

  const remove = async (loc: LocationListItem) => {
    await api.del(`/favorites/${loc.id}`).catch(() => undefined);
    setItems((prev) => prev.filter((p) => p.id !== loc.id));
  };

  if (loading) return <p className="p-10 text-center text-muted">Đang tải…</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-5">❤️ Địa điểm yêu thích</h1>
      {items.length === 0 ? (
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
