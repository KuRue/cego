"use client";

import { useEffect } from "react";

export default function TelegramMiniAppRedirect() {
  useEffect(() => {
    let cancelled = false;

    const redirectIfMiniApp = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (cancelled) return;

        if (window.Telegram?.WebApp?.initData) {
          window.dispatchEvent(new Event("cego:miniapp-ready"));
          if (typeof (window as unknown as Record<string, unknown>).__cegoMiniAppReady === "function") {
            ((window as unknown as Record<string, unknown>).__cegoMiniAppReady as () => void)();
          }
          window.location.replace("/mini-app");
          return;
        }

        await new Promise((r) => setTimeout(r, 100));
      }
    };

    void redirectIfMiniApp();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
