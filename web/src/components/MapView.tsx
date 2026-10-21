import { useEffect, useRef } from 'react';
import vietmapgl from '@vietmap/vietmap-gl-js/dist/vietmap-gl';
import '@vietmap/vietmap-gl-js/dist/vietmap-gl.css';

const VIETMAP_KEY = import.meta.env.VITE_VIETMAP_API_KEY as string | undefined;

import { DEFAULT_CENTER } from '../lib/center';

export { DEFAULT_CENTER };
export const VIETMAP_STYLE = `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_KEY ?? ''}`;

/** Chuyển mọi request Vietmap sang proxy Vite same-origin để tránh CORS. */
function viaProxy(url: string): string {
  if (url.startsWith('https://maps.vietmap.vn/')) {
    return `${window.location.origin}/vietmap${url.slice('https://maps.vietmap.vn'.length)}`;
  }
  return url;
}

export interface MapPin {
  id: string;
  lng: number;
  lat: number;
  label?: string;
}

interface Props {
  pins: MapPin[];
  selectedId?: string | null;
  onPinClick?: (id: string) => void;
  onMapMove?: (center: { lat: number; lng: number }) => void;
  className?: string;
  showUserLocation?: boolean;
  /** Tuyến đường cần vẽ (đã decode), mỗi phần tử là [lng, lat]. */
  route?: [number, number][];
}

/**
 * Vietmap GL wrapper. Requires VITE_VIETMAP_API_KEY.
 * If the key is missing the map area renders a friendly placeholder.
 */
export default function MapView({
  pins,
  selectedId,
  onPinClick,
  onMapMove,
  className = '',
  showUserLocation = true,
  route,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<vietmapgl.Map | null>(null);
  const markersRef = useRef<Record<string, vietmapgl.Marker>>({});
  const routeRef = useRef<{ source: unknown; layer: unknown } | null>(null);
  const clickRef = useRef(onPinClick);
  const moveRef = useRef(onMapMove);
  clickRef.current = onPinClick;
  moveRef.current = onMapMove;

  useEffect(() => {
    if (!VIETMAP_KEY || !containerRef.current || mapRef.current) return;
    const map = new vietmapgl.Map({
      container: containerRef.current,
      style: viaProxy(VIETMAP_STYLE),
      center: DEFAULT_CENTER,
      zoom: 15,
      attributionControl: { compact: true },
      transformRequest: (url: string) => ({ url: viaProxy(url) }),
    });
    map.addControl(new vietmapgl.NavigationControl(), 'top-right');
    map.on('moveend', () => {
      const c = map.getCenter();
      moveRef.current?.({ lat: c.lat, lng: c.lng });
    });
    mapRef.current = map;
    return () => {
      try {
        map.remove();
      } catch {
        /* AbortError from in-flight tile fetches on unmount — ignore */
      }
      if (mapRef.current === map) mapRef.current = null;
      markersRef.current = {};
      routeRef.current = null;
    };
  }, []);

  // sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const keep = new Set(pins.map((p) => p.id));
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!keep.has(id)) {
        try {
          marker.remove();
        } catch {
          /* map already disposed */
        }
        delete markersRef.current[id];
      }
    }
    for (const pin of pins) {
      let marker = markersRef.current[pin.id];
      if (!marker) {
        const el = document.createElement('button');
        el.className =
          'size-8 rounded-full bg-primary-600 text-white text-xs font-bold shadow-lg border-2 border-white grid place-items-center cursor-pointer m-0 p-0';
        el.textContent = pin.label ?? '📍';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          clickRef.current?.(pin.id);
        });
        marker = new vietmapgl.Marker({ element: el, anchor: 'center', offset: [0, 0] })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
        markersRef.current[pin.id] = marker;
      } else {
        marker.setLngLat([pin.lng, pin.lat]);
      }
      const el = marker.getElement();
      el.classList.toggle('ring-4', pin.id === selectedId);
      el.classList.toggle('ring-primary/40', pin.id === selectedId);
    }
  }, [pins, selectedId]);

  // fly to selected
  useEffect(() => {
    const map = mapRef.current;
    const pin = pins.find((p) => p.id === selectedId);
    if (map && pin) {
      map.flyTo({ center: [pin.lng, pin.lat], zoom: 16, duration: 600 });
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // sync route polyline — wait until style is loaded (GL throws otherwise)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const id = 'sgm-route';
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let drawnOnce = false; // fitBounds only on first successful draw for this route

    const safeRemoveRoute = () => {
      try {
        if (!map.style) return; // already removed / style gone
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      } catch {
        /* map may already be disposed (StrictMode unmount) */
      }
    };

    const draw = (fit: boolean): boolean => {
      if (cancelled || mapRef.current !== map || !map.style) return false;
      safeRemoveRoute();
      if (!route || route.length < 2) return true;
      try {
        map.addSource(id, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route },
          },
        });
        map.addLayer({
          id,
          type: 'line',
          source: id,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 8],
            'line-opacity': 0.95,
          },
        });
        // white casing under route (Vietmap-style)
        const casingId = `${id}-casing`;
        if (map.getLayer(casingId)) map.removeLayer(casingId);
        map.addLayer(
          {
            id: casingId,
            type: 'line',
            source: id,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#ffffff',
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 12],
              'line-opacity': 0.85,
            },
          },
          id,
        ); // insert BELOW main route
        if (fit) {
          const lats = route.map((c) => c[1]);
          const lngs = route.map((c) => c[0]);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 64, duration: 600 },
          );
          drawnOnce = true;
        }
        return true;
      } catch {
        return false; // style reloaded mid-draw — retry
      }
    };

    const tryDraw = () => {
      if (cancelled || drawnOnce) return;
      if (map.isStyleLoaded() || map.loaded()) {
        if (draw(true)) return;
      }
      let attempts = 0;
      const schedule = () => {
        if (cancelled || drawnOnce || attempts >= 25) return;
        attempts += 1;
        retryTimer = setTimeout(() => {
          if (cancelled || drawnOnce) return;
          if ((map.isStyleLoaded() || map.loaded()) && draw(true)) return;
          schedule();
        }, 120);
      };
      schedule();
    };

    tryDraw();

    // Only listen for initial style load — never re-fitBounds on idle (that fights user pan/zoom)
    const onStyleReady = () => {
      if (!cancelled && !drawnOnce) tryDraw();
    };
    map.once('load', onStyleReady);
    map.once('styledata', onStyleReady);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      map.off('load', onStyleReady);
      map.off('styledata', onStyleReady);
      safeRemoveRoute();
    };
  }, [route]);

  // user location dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showUserLocation || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        let m = (map as unknown as { __userMarker?: vietmapgl.Marker }).__userMarker;
        if (!m) {
          const el = document.createElement('div');
          el.className =
            'size-4 rounded-full bg-info border-2 border-white shadow ring-4 ring-info/30';
          m = new vietmapgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
          (map as unknown as { __userMarker?: vietmapgl.Marker }).__userMarker = m;
        } else {
          m.setLngLat(lngLat);
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [showUserLocation]);

  if (!VIETMAP_KEY) {
    return (
      <div
        className={`grid place-items-center bg-surface-2 text-sm text-muted rounded-2xl ${className}`}
      >
        Thiếu VITE_VIETMAP_API_KEY — bản đồ chưa hoạt động.
      </div>
    );
  }

  return <div ref={containerRef} className={`rounded-2xl overflow-hidden ${className}`} />;
}
