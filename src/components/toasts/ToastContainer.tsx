import { useToast } from '../../context/ToastContext';
import type { ToastVariant } from '../../context/ToastContext';

const ICONS: Record<ToastVariant, string> = {
  error: '✕',
  success: '✓',
  warning: '⚠',
  info: 'ℹ',
};

const COLORS: Record<ToastVariant, string> = {
  error: 'var(--color-danger)',
  success: 'var(--color-accent)',
  warning: 'var(--color-warn)',
  info: 'var(--color-fg-2)',
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 rounded-lg border bg-raised px-3 py-2.5 text-sm shadow-lg animate-slide-in-right"
          style={{ borderColor: COLORS[toast.variant] }}
        >
          <span className="shrink-0" style={{ color: COLORS[toast.variant] }}>
            {ICONS[toast.variant]}
          </span>
          <span className="flex-1 text-fg">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
            className="ml-1 shrink-0 cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: COLORS[toast.variant] }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
