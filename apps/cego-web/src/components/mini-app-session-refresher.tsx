"use client";

import { useEffect, useRef } from "react";

export default function MiniAppSessionRefresher() {
  const refreshed = useRef(false);

  useEffect(() => {
    if (refreshed.current) return;

    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData) return;

    window.dispatchEvent(new Event("cego:miniapp-ready"));
    if (typeof (window as unknown as Record<string, unknown>).__cegoMiniAppReady === "function") {
      ((window as unknown as Record<string, unknown>).__cegoMiniAppReady as () => void)();
    }

    refreshed.current = true;

    let cancelled = false;

    const refresh = async () => {
      const freshInitData = window.Telegram?.WebApp?.initData;
      if (cancelled || !freshInitData) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch("/api/telegram/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ initData: freshInitData }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (cancelled) return;

        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          if (body.error) {
            try { sessionStorage.setItem("cego_session_failed", "1"); } catch {}
            window.location.replace("/mini-app");
          }
        }
      } catch {
        // Network error: session cookie is likely still valid, ignore silently
      }
    };

    const timer = setTimeout(refresh, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return null;
}
