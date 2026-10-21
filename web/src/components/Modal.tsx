import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  tone?: 'info' | 'success' | 'error' | 'warning';
}

const TONE: Record<string, { icon: string; border: string; bg: string }> = {
  info: { icon: 'ℹ️', border: 'border-info/40', bg: 'bg-info/5' },
  success: { icon: '✅', border: 'border-success/40', bg: 'bg-success/5' },
  error: { icon: '⛔', border: 'border-error/40', bg: 'bg-error/5' },
  warning: { icon: '⚠️', border: 'border-warning/40', bg: 'bg-warning/5' },
};

export default function Modal({ open, onClose, title, children, tone = 'info' }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const t = TONE[tone] ?? TONE.info;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl border-2 ${t.border} ${t.bg} shadow-2xl animate-none`}
        style={{ animation: 'modalIn .2s ease-out' }}
      >
        <div className="flex items-start gap-3 p-5 pb-0">
          <span className="text-2xl shrink-0 mt-0.5" aria-hidden>
            {t.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="modal-title" className="font-extrabold text-base leading-snug pr-2">{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-5 pt-3 pb-5 text-sm text-ink/90 leading-relaxed">{children}</div>
        <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}`}</style>
      </div>
    </div>
  );
}
