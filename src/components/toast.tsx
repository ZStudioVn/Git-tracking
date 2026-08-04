'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, string> = {
  success: 'border-l-green-500 bg-green-50 text-green-800',
  error: 'border-l-red-500 bg-red-50 text-red-800',
  info: 'border-l-blue-500 bg-blue-50 text-blue-800',
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: useCallback((message: string) => push('success', message), [push]),
    error: useCallback((message: string) => push('error', message), [push]),
    info: useCallback((message: string) => push('info', message), [push]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`flex items-start gap-2 rounded border border-l-4 px-3 py-2 text-sm shadow-md ${STYLES[toast.type]}`}
          >
            <span aria-hidden="true" className="font-bold">{ICONS[toast.type]}</span>
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              className="ml-1 text-xs opacity-60 hover:opacity-100"
              onClick={() => dismiss(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
