'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  msg: string;
  variant: ToastVariant;
}

interface ToastApi {
  toast: (msg: string, variant?: ToastVariant) => void;
}

const ToastCtx = createContext<ToastApi>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

/**
 * Single-toast provider — pixel-matched to the HTML reference's
 * `.toast` style (top center, dark pill, fades after 2s).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastState[]>([]);

  const toast = useCallback((msg: string, variant: ToastVariant = 'default') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, msg, variant }]);
  }, []);

  // auto-dismiss after the CSS animation finishes (toastIn 0.3s + 2s + toastOut 0.3s)
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((t) =>
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== t.id));
      }, 2600),
    );
    return () => timers.forEach(clearTimeout);
  }, [items]);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {items.map((t, i) => (
        <div
          key={t.id}
          className="toast"
          style={{
            top: 60 + i * 40,
            background:
              t.variant === 'success'
                ? '#065F46'
                : t.variant === 'error'
                ? '#991B1B'
                : t.variant === 'info'
                ? '#1E3A8A'
                : '#111827',
          }}
        >
          {t.msg}
        </div>
      ))}
    </ToastCtx.Provider>
  );
}
