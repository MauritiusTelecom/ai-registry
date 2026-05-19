"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type ReportTarget = {
  id: string;
  title: string;
  provider: string;
};

type ReportContextValue = {
  target: ReportTarget | null;
  open: (target: ReportTarget) => void;
  close: () => void;
};

const ReportContext = createContext<ReportContextValue>({
  target: null,
  open: () => {},
  close: () => {}
});

export function ReportProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const open = useCallback((t: ReportTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);
  return (
    <ReportContext.Provider value={{ target, open, close }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  return useContext(ReportContext);
}
