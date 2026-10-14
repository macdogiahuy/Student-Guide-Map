import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Notification, Paged } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const TYPE_ICON: Record<string, string> = {
  LOCATION_APPROVED: '✅',
  LOCATION_REJECTED: '⛔',
  PROMOTION_APPROVED: '🎉',
  PROMOTION_REJECTED: '⛔',
  REPORT_UPDATE: '📋',
  SYSTEM: '📢',
};

const TYPE_TONE: Record<string, 'info' | 'success' | 'error' | 'warning'> = {
  LOCATION_APPROVED: 'success',
  LOCATION_REJECTED: 'error',
  PROMOTION_APPROVED: 'success',
  PROMOTION_REJECTED: 'error',
  REPORT_UPDATE: 'warning',
  SYSTEM: 'info',
};

export default function Notifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [active, setActive] = useState<Notification | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  const load = () => {
    if (!user) return;
    api
      .get<Paged<Notification>>('/notifications?limit=50')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  };
  useEffect(load, [user]);

  const markAll = async () => {
    await api.post('/notifications/read-all').catch(() => undefined);
    load();
  };

  const markOne = async (n: Notification) => {
    setActive(n);
    if (!n.readAt) {
      await api.patch(`/notifications/${n.id}/read`).catch(() => undefined);
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
  };

  const goLink = () => {
    if (active?.link) {
      setActive(null);
      navigate(active.link);
    }
  };

  if (loading) return <p className="p-10 text-center text-muted">Đang tải…</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold">🔔 Thông báo</h1>
        <button className="btn-ghost text-sm" onClick={markAll}>
          Đọc tất cả
        </button>
      </div>
      {items.length === 0 ? (
        <p className="py-16 text-center text-muted">Chưa có thông báo.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => markOne(n)}
              className={`card p-4 block w-full text-left hover:shadow-md transition-shadow ${n.readAt ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start gap-2">
                {!n.readAt && <span className="mt-1.5 size-2 rounded-full bg-primary-600 shrink-0" />}
                <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? 'ℹ️'}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-sm text-muted mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-muted mt-1">
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal hiển thị chi tiết thông báo — lời nhắn admin */}
      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title ?? ''}
        tone={active ? (TYPE_TONE[active.type] ?? 'info') : 'info'}
      >
        {active && (
          <div className="space-y-4">
            <div className="text-[15px] leading-relaxed whitespace-pre-line">{active.body}</div>
            <p className="text-xs text-muted">
              {new Date(active.createdAt).toLocaleString('vi-VN')}
            </p>
            <div className="flex gap-2">
              {active.link && (
                <button className="btn-primary flex-1 text-sm" onClick={goLink}>
                  Xem chi tiết →
                </button>
              )}
              <button className="btn-ghost text-sm" onClick={() => setActive(null)}>
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
