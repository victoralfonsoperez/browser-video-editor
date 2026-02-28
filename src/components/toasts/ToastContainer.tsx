import { useToast } from '../../context/ToastContext';
import type { ToastVariant } from '../../context/ToastContext';

const ICONS: Record<ToastVariant, string> = {
  error: '✕',
  success: '✓',
  warning: '⚠',
  info: 'ℹ',
};

const COLORS: Record<ToastVariant, string> = {
  error: '#f55a5a',
  success: '#c8f55a',
  warning: '#f5a623',
  info: '#aaa',
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 rounded-lg border bg-[#1a1a1e] px-3 py-2.5 text-sm shadow-lg"
          style={{ borderColor: COLORS[toast.variant] }}
        >
          <span className="shrink-0" style={{ color: COLORS[toast.variant] }}>
            {ICONS[toast.variant]}
          </span>
          <span className="flex-1 text-[#e0e0e0]">{toast.message}</span>
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
