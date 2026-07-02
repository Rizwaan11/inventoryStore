'use client';
import { useState, useEffect, useCallback } from 'react';

let toastId = 0;
let globalAddToast = null;

export function toast(message, type = 'success') {
  if (globalAddToast) globalAddToast({ id: ++toastId, message, type });
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    setToasts((prev) => [...prev, { ...t, exiting: false }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, exiting: true } : x))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 250);
    }, 3000);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => { globalAddToast = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl pointer-events-auto ${
            t.exiting ? 'toast-exit' : 'toast-enter'
          }`}
          style={{
            background: t.type === 'error' ? 'rgba(239,68,68,0.12)' :
                        t.type === 'warning' ? 'rgba(234,179,8,0.12)' :
                        'rgba(34,197,94,0.12)',
            border: `1px solid ${t.type === 'error' ? 'rgba(239,68,68,0.3)' :
                                   t.type === 'warning' ? 'rgba(234,179,8,0.3)' :
                                   'rgba(34,197,94,0.3)'}`,
            color: t.type === 'error' ? '#f87171' :
                   t.type === 'warning' ? '#fde047' :
                   '#4ade80',
            backdropFilter: 'blur(12px)',
            minWidth: '220px',
          }}
        >
          {t.type === 'success' && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {t.type === 'error' && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {t.type === 'warning' && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
