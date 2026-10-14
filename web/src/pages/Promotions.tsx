import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Paged, Promotion } from '../lib/types';

export default function Promotions() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (q) params.set('q', q);
        const data = await api.get<Paged<Promotion>>(`/promotions?${params}`);
        setItems(data.items);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-4">🎉 Ưu đãi đang hoạt động</h1>
      <input
        className="input mb-5 max-w-md"
        placeholder="Tìm ưu đãi…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <p className="text-muted">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">Chưa có ưu đãi nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((p) => (
            <article key={p.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {p.location?.imageUrl && (
                  <img
                    src={p.location.imageUrl}
                    alt=""
                    className="size-16 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="font-bold line-clamp-1">{p.title}</h2>
                  {p.location && (
                    <Link
                      to={`/locations/${p.location.id}`}
                      className="text-sm text-primary-600 font-semibold hover:underline line-clamp-1 block"
                    >
                      {p.location.name} →
                    </Link>
                  )}
                  <p className="text-sm text-muted mt-1 line-clamp-2">{p.content}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {p.discountLabel && <span className="chip bg-accent/10 text-accent">{p.discountLabel}</span>}
                    <span className="chip bg-surface-2 text-muted">
                      HSD: {new Date(p.endDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
