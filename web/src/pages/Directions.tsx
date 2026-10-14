import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import MapView, { DEFAULT_CENTER } from '../components/MapView';

type Vehicle = 'motorcycle' | 'car' | 'walking';

interface Dest {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface RouteStep {
  text: string;
  streetName: string;
  sign: number;
  signIcon: string;
  signLabel: string;
  distanceMeters: number;
  durationSeconds: number;
  heading: number | null;
  interval: [number, number] | null;
}

interface RouteToll {
  id: number;
  name: string;
  address: string;
  type: string;
  price: number;
}

interface RouteData {
  polyline: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  tollCost: number;
  tolls: RouteToll[];
}

const VEHICLE_LABEL: Record<Vehicle, string> = {
  motorcycle: '🏍️ Xe máy',
  car: '🚗 Ô tô',
  walking: '🚶 Đi bộ',
};

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const fmtDur = (s: number) => {
  if (s < 60) return `${Math.max(1, Math.round(s))} giây`;
  const min = Math.max(1, Math.round(s / 60));
  return min < 60 ? `${min} phút` : `${Math.floor(min / 60)} giờ ${min % 60} phút`;
};
const fmtVnd = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`) + ' ₫';

function getOrigin(timeoutMs = 6000): Promise<{ lat: number; lng: number; fallback: boolean }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0], fallback: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, fallback: false }),
      () => resolve({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0], fallback: true }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

/** Dạng mũi tên lớn cho banner điều hướng — dùng SVG-like unicode */
const BIG_ARROW: Record<string, string> = {
  '🚀': '⬆️',
  '↪️': '↰',
  '↗️': '↱',
  '⤴️': '↱',
  '↩️': '↰',
  '🏁': '●',
  '➡️': '↑',
  '⬆️': '↑',
};

export default function Directions() {
  const { id = '' } = useParams();
  const [dest, setDest] = useState<Dest | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle>('motorcycle');
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeErr, setRouteErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<Dest>(`/locations/${id}`)
      .then(setDest)
      .catch(() => setLoadErr('Không tìm thấy địa điểm.'));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    getOrigin().then((o) => {
      if (cancelled) return;
      setOrigin({ lat: o.lat, lng: o.lng });
      setUsedFallback(o.fallback);
    });
    return () => { cancelled = true; };
  }, []);

  const fetchRoute = useCallback(async () => {
    if (!id || !origin) return;
    setLoading(true);
    setRouteErr(null);
    setStepIdx(0);
    try {
      const r = await api.get<RouteData>(
        `/locations/${id}/route?fromLat=${origin.lat}&fromLng=${origin.lng}&vehicle=${vehicle}`,
      );
      setRoute(r);
    } catch (e) {
      setRouteErr(e instanceof Error ? e.message : 'Không tính được tuyến đường.');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [id, origin, vehicle]);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  const current = route?.steps?.[stepIdx] ?? null;
  const next = route?.steps?.[stepIdx + 1] ?? null;

  const pins = dest
    ? [
        { id: dest.id, lng: dest.lng, lat: dest.lat, label: '📍' },
        ...(origin ? [{ id: '__origin', lng: origin.lng, lat: origin.lat, label: 'A' }] : []),
      ]
    : [];

  const vietmapLink =
    dest && origin
      ? `https://maps.vietmap.vn/api/route?points=${origin.lat},${origin.lng}|${dest.lat},${dest.lng}&vehicle=${vehicle}`
      : dest
        ? `https://maps.vietmap.vn/?lat=${dest.lat}&lng=${dest.lng}&zoom=17`
        : '#';

  if (loadErr) {
    return (
      <div className="h-dvh grid place-items-center bg-bg">
        <div className="text-center space-y-4">
          <p className="text-muted">{loadErr}</p>
          <Link to="/" className="btn-primary">Về trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-surface-2">
      {dest && (
        <MapView
          pins={pins}
          selectedId={dest.id}
          route={route?.polyline}
          className="absolute inset-0 !rounded-none h-full w-full"
          showUserLocation
        />
      )}

      {/* ── Top navigation banner (Vietmap Live Map style) ── */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 pointer-events-none">
        <div className="mx-auto max-w-xl space-y-2 pointer-events-auto">
          {/* back row */}
          <div className="flex items-center gap-2">
            <Link
              to={`/locations/${id}`}
              className="btn-ghost !min-h-9 !py-1.5 !px-3 text-sm bg-surface/95 backdrop-blur shadow-lg"
            >
              ←
            </Link>
            <div className="flex-1 min-w-0 bg-surface/95 backdrop-blur shadow-lg rounded-xl px-3 py-1.5">
              <p className="text-[11px] text-muted leading-tight">Đến</p>
              <p className="font-bold text-sm truncate">{dest?.name ?? '…'}</p>
            </div>
          </div>

          {/* big maneuver card */}
          {current && !loading && (
            <div className="bg-surface/95 backdrop-blur shadow-2xl rounded-2xl border border-line overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3.5">
                {/* huge maneuver icon */}
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-primary-600 text-white grid place-items-center text-4xl font-black shadow-lg">
                  {BIG_ARROW[current.signIcon] ?? '⬆️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-extrabold leading-none text-ink">
                    {fmtDist(current.distanceMeters)}
                  </p>
                  <p className="text-sm font-semibold text-muted mt-1 truncate">
                    {current.text || current.signLabel}
                  </p>
                </div>
                {/* step counter */}
                <button
                  className="shrink-0 chip bg-surface-2 text-muted text-xs"
                  onClick={() => setShowAllSteps((v) => !v)}
                >
                  {stepIdx + 1}/{route?.steps.length}
                </button>
              </div>
              {/* next preview strip */}
              {next && (
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2 border-t border-line bg-surface-2/60 text-left"
                  onClick={() => setStepIdx((i) => Math.min(i + 1, (route?.steps.length ?? 1) - 1))}
                >
                  <span className="text-lg shrink-0">{BIG_ARROW[next.signIcon] ?? '➡️'}</span>
                  <span className="text-xs text-muted truncate">
                    Sau đó: <b className="text-ink">{next.text || next.signLabel}</b>
                    {next.streetName && <span className="text-primary-600"> · {next.streetName}</span>}
                  </span>
                  <span className="ml-auto text-xs text-muted shrink-0">{fmtDist(next.distanceMeters)}</span>
                </button>
              )}
              {/* advance control */}
              <div className="flex border-t border-line divide-x divide-line">
                <button
                  className="flex-1 py-2 text-sm font-semibold text-muted hover:bg-surface-2 disabled:opacity-40"
                  disabled={stepIdx === 0}
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                >
                  ← Trước
                </button>
                <button
                  className="flex-1 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                  disabled={!next}
                  onClick={() => setStepIdx((i) => Math.min(i + 1, (route?.steps.length ?? 1) - 1))}
                >
                  Tiếp →
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-surface/95 backdrop-blur shadow-xl rounded-xl px-4 py-3 text-sm text-muted text-center">
              Đang tính tuyến đường…
            </div>
          )}
          {routeErr && (
            <div className="bg-error/10 backdrop-blur shadow-xl rounded-xl px-4 py-3 text-sm text-error text-center border border-error/30">
              {routeErr}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom sheet: summary + all steps ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 pointer-events-none">
        <div className="mx-auto max-w-xl bg-surface/95 backdrop-blur shadow-2xl rounded-2xl border border-line overflow-hidden pointer-events-auto">
          {/* vehicle tabs */}
          <div className="flex border-b border-line">
            {(Object.keys(VEHICLE_LABEL) as Vehicle[]).map((v) => (
              <button
                key={v}
                onClick={() => setVehicle(v)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  vehicle === v
                    ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600'
                    : 'text-muted hover:bg-surface-2'
                }`}
              >
                {VEHICLE_LABEL[v]}
              </button>
            ))}
          </div>

          {/* summary row */}
          {route && !loading && (
            <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line text-sm">
              <span className="font-extrabold">🛣️ {fmtDist(route.distanceMeters)}</span>
              <span className="text-muted">~ {fmtDur(route.durationSeconds)}</span>
              {route.tollCost > 0 && (
                <span className="chip bg-warning/10 text-warning text-xs">💰 {fmtVnd(route.tollCost)}</span>
              )}
              {usedFallback && (
                <span className="chip bg-info/10 text-info text-xs">Từ trường ĐH FPT</span>
              )}
              <a
                href={vietmapLink}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-primary-600 font-semibold underline shrink-0"
              >
                Vietmap ↗
              </a>
            </div>
          )}

          {/* collapsible steps list */}
          <button
            className="w-full px-4 py-2.5 text-sm font-semibold text-left flex items-center justify-between hover:bg-surface-2"
            onClick={() => setShowAllSteps((v) => !v)}
          >
            <span>📋 Hướng dẫn từng bước ({route?.steps.length ?? 0})</span>
            <span className="text-muted">{showAllSteps ? '▲' : '▼'}</span>
          </button>
          {showAllSteps && route?.steps && (
            <div className="max-h-64 overflow-y-auto border-t border-line">
              <ol className="px-3 py-2">
                {route.steps.map((s, i) => (
                  <li key={i}>
                    <button
                      className={`w-full flex gap-3 py-2.5 px-2 rounded-xl text-left transition-colors ${
                        i === stepIdx ? 'bg-primary-50' : 'hover:bg-surface-2'
                      }`}
                      onClick={() => { setStepIdx(i); setShowAllSteps(false); }}
                    >
                      <span className="shrink-0 size-9 rounded-xl bg-primary-600 text-white grid place-items-center text-lg font-bold">
                        {BIG_ARROW[s.signIcon] ?? '➡️'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink leading-snug">
                          {s.text || s.signLabel}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {fmtDist(s.distanceMeters)}
                          {s.durationSeconds > 0 && ` · ${fmtDur(s.durationSeconds)}`}
                          {s.streetName && (
                            <span className="text-primary-600 font-medium"> · {s.streetName}</span>
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
              {/* tolls */}
              {route.tolls.length > 0 && (
                <div className="px-4 py-3 border-t border-line text-xs">
                  <p className="font-semibold text-warning mb-1">🚧 {route.tolls.length} trạm thu phí</p>
                  {route.tolls.map((t) => (
                    <p key={t.id} className="text-muted">
                      {t.name} {t.price > 0 && <b className="text-ink">{fmtVnd(t.price)}</b>}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* loading overlay before dest loads */}
      {!dest && !loadErr && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-surface-2/60 backdrop-blur-sm">
          <div className="card p-5 text-sm text-muted">Đang tải địa điểm…</div>
        </div>
      )}
    </div>
  );
}
