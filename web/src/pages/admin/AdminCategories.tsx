import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface Cat {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminCategories() {
  const [items, setItems] = useState<Cat[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', icon: '', description: '' });

  const load = useCallback(() => {
    api.get<Cat[]>('/admin/categories').then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.name || !form.slug) return setMsg('Tên và slug là bắt buộc.');
    try {
      await api.post('/admin/categories', {
        name: form.name,
        slug: form.slug,
        icon: form.icon || undefined,
        description: form.description || undefined,
      });
      setMsg('Đã tạo danh mục.');
      setForm({ name: '', slug: '', icon: '', description: '' });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
    }
  };

  const toggle = async (c: Cat) => {
    try {
      await api.patch(`/admin/categories/${c.id}`, { isActive: !c.isActive });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
    }
  };

  const del = async (c: Cat) => {
    if (!window.confirm(`Xóa danh mục "${c.name}"?`)) return;
    try {
      await api.del(`/admin/categories/${c.id}`);
      setMsg('Đã xóa danh mục.');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi');
    }
  };

  return (
    <div className="dashboard-page dashboard-page-wide">
      <Link to="/admin" className="text-sm text-primary-600 hover:underline">← Quay lại bảng quản trị</Link>
      <h1 className="text-2xl font-extrabold mt-2 mb-4">Quản lý danh mục</h1>
      {msg && <div className="chip bg-info/10 text-info w-full justify-center py-2 mb-4">{msg}</div>}

      <div className="card dashboard-section mb-6">
        <h2 className="dashboard-section-title">Thêm danh mục mới</h2>
        <div className="dashboard-form-grid">
          <label className="dashboard-field">Tên danh mục<input className="input" placeholder="Tên danh mục" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="dashboard-field">Slug<input className="input" placeholder="chu-thuong, so, gach" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
          <label className="dashboard-field">Icon<input className="input" placeholder="Emoji, tùy chọn" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
          <label className="dashboard-field">Mô tả<input className="input" placeholder="Mô tả, tùy chọn" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        </div>
        <button type="button" className="btn-primary mt-3" onClick={create}>+ Tạo danh mục</button>
      </div>

      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="card p-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{c.icon} {c.name} <span className="text-xs text-muted">({c.slug})</span></p>
              {c.description && <p className="text-xs text-muted">{c.description}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" className={`chip ${c.isActive ? 'bg-success/10 text-success' : 'bg-surface-2 text-muted'}`} onClick={() => toggle(c)}>
                {c.isActive ? 'Đang hiện' : 'Đã ẩn'}
              </button>
              <button type="button" className="chip bg-error/10 text-error" onClick={() => del(c)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
