import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

describe('ToastContext', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('showToast adds a toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.showToast('Hello world', 'info');
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Hello world');
    expect(result.current.toasts[0].variant).toBe('info');
  });

  it('showToast defaults variant to info', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.showToast('Default variant');
    });
    expect(result.current.toasts[0].variant).toBe('info');
  });

  it('dismissToast removes a toast immediately', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.showToast('Temp', 'error');
    });
    expect(result.current.toasts).toHaveLength(1);
    const id = result.current.toasts[0].id;
    act(() => {
      result.current.dismissToast(id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('toast auto-removes after 5000 ms', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.showToast('Auto remove', 'success');
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('toast is still present just before 5000 ms', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
    act(() => {
      result.current.showToast('Not yet gone', 'warning');
    });
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('useToast throws when called outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within a ToastProvider',
    );
    spy.mockRestore();
  });
});
