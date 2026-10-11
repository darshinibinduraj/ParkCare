"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: number; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useMemo(
    () => (message: string) => {
      const id = Date.now();
      setToasts((current) => [...current, { id, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4000);
    },
    [],
  );
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="no-print fixed bottom-4 left-4 right-4 z-30 grid justify-items-center gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className="max-w-measure rounded-2xl border-2 border-line bg-card px-4 py-3 font-bold">
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
