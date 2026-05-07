"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ConfirmState = {
  message: string;
  resolve: (value: boolean) => void;
};

type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleAction = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmation"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => handleAction(false)}
          />
          <div
            className="glass-lg relative z-10 mx-4 w-full max-w-sm rounded-2xl p-6"
          >
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
              {state.message}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="h-10 flex-1 rounded-xl text-sm font-semibold transition"
                style={{
                  background: "var(--color-surface-hover)",
                  border: "1px solid var(--color-surface-border)",
                  color: "var(--color-foreground)",
                }}
                onClick={() => handleAction(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-10 flex-1 rounded-xl text-sm font-semibold transition"
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-on-accent)",
                }}
                onClick={() => handleAction(true)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
