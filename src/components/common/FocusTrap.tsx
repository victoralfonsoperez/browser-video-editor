import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusTrapProps {
  children: ReactNode;
  onEscape?: () => void;
}

export function FocusTrap({ children, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  // Window-level Escape handler (catches events dispatched on window directly)
  useEffect(() => {
    if (!onEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape]);

  // Capture previously focused element and auto-focus first focusable child
  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const container = containerRef.current;
    if (!container) return;

    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      container.focus();
    }

    return () => {
      const prev = previouslyFocused.current;
      if (prev instanceof HTMLElement) {
        prev.focus();
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const container = containerRef.current;
    if (!container) return;

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      style={{ outline: 'none' }}
    >
      {children}
    </div>
  );
}
