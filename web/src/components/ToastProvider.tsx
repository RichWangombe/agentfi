"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info" | "warning";
type Toast = { id: string; kind: ToastKind; title?: string; msg: string; ttlMs?: number };

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider/>");
  return ctx;
};

function ToastItem({ t, onClose }: { t: Toast; onClose: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const paused = useRef(false);
  const ttl = t.ttlMs ?? 4000;

  const tick = (ts: number) => {
    if (paused.current) { raf.current = requestAnimationFrame(tick); return; }
    if (start.current === null) start.current = ts;
    const elapsed = ts - start.current;
    const pct = Math.max(0, 100 - (elapsed / ttl) * 100);
    setProgress(pct);
    if (elapsed >= ttl) onClose(t.id);
    else raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const color = t.kind === "success" ? "emerald" : t.kind === "error" ? "rose" : t.kind === "warning" ? "amber" : "sky";

  return (
    <div
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      className={`pointer-events-auto w-[360px] rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl ring-1 ring-black/10 backdrop-blur`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-1 h-2.5 w-2.5 rounded-full bg-${color}-400`} />
          <div className="flex-1">
            {t.title && <div className="text-sm font-semibold">{t.title}</div>}
            <div className="text-sm text-slate-300">{t.msg}</div>
          </div>
          <button
            onClick={() => onClose(t.id)}
            className="rounded p-1 text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded bg-white/10">
          <div
            className={`h-full bg-${color}-500 transition-[width] duration-100`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const push = useCallback<Ctx["push"]>((t) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setItems((xs) => [{ ...t, id }, ...xs].slice(0, 5));
  }, []);

  const ctx = useMemo<Ctx>(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      {/* container */}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-[360px] flex-col gap-3">
        {items.map((t) => (
          <ToastItem key={t.id} t={t} onClose={remove} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
