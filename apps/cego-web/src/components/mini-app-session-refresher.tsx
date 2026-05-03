"use client";

import { useEffect } from "react";

export default function MiniAppSessionRefresher() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData) return;

    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch("/api/telegram/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ initData: webApp.initData }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (cancelled) return;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));

          if (res.status === 401 && body.error) {
            window.location.replace("/mini-app");
          }
        }
      } catch {
        // Network error: session cookie is likely still valid, ignore silently
      }
    };

    const timer = setTimeout(refresh, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return null;
}
