import { Link } from 'react-router-dom';
import type { LocationListItem } from '../lib/types';

const PRICE_LABEL = ['', 'Giá rẻ', 'Giá vừa', 'Khá cao', 'Giá cao', 'Rất cao'];

function priceLabel(level: number) {
  const labels = ['Giá rẻ', 'Giá vừa', 'Khá cao', 'Giá cao', 'Rất cao'];
  return labels[Math.min(Math.max(Math.round(level), 1), labels.length) - 1];
}

function OpenBadge({ state, label }: { state: string; label: string }) {
  const color =
    state === 'OPEN'
      ? 'bg-success/10 text-success'
      : state === 'CLOSING_SOON'
        ? 'bg-warning/10 text-warning'
        : 'bg-surface-2 text-muted';
  return <span className={`chip ${color}`}>{label}</span>;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <span className="text-warning">★</span>
      {value > 0 ? value.toFixed(1) : 'Mới'}
    </span>
  );
}

export default function LocationCard({
  loc,
  onToggleFavorite,
}: {
  loc: LocationListItem;
  onToggleFavorite?: (loc: LocationListItem) => void;
}) {
  return (
    <article className="card overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative aspect-[16/9] bg-surface-2">
        {loc.imageUrl ? (
          <img
            src={loc.imageUrl}
            alt={loc.name}
            className="size-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="size-full grid place-items-center text-4xl">{loc.category.icon || '📍'}</div>
        )}
        {loc.hasPromotion && (
          <span className="chip absolute top-2 left-2 bg-accent text-white">🎉 {loc.promoTitle}</span>
        )}
        {onToggleFavorite && (
          <button
            aria-label="Yêu thích"
            className="absolute top-2 right-2 size-9 rounded-full bg-surface/90 grid place-items-center text-lg hover:scale-110 transition"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(loc);
            }}
          >
            {loc.isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <div className="p-3.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/locations/${loc.id}`} className="font-bold hover:text-primary-600 line-clamp-1">
            {loc.name}
          </Link>
          <Stars value={loc.ratingAvg} />
        </div>
        <p className="text-sm text-muted line-clamp-1">{loc.address}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="chip bg-primary-50 text-primary-600">{loc.category.name}</span>
          <span className="chip bg-surface-2 text-muted" title={`Mức giá: ${priceLabel(loc.priceLevel)}`}>
            {priceLabel(loc.priceLevel)}
          </span>
          <OpenBadge state={loc.openStatus.state} label={loc.openStatus.label} />
          {loc.distanceLabel && (
            <span className="chip bg-surface-2 text-muted">🚶 {loc.distanceLabel}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export { OpenBadge, Stars, priceLabel, PRICE_LABEL };
