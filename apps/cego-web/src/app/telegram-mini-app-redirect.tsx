"use client";

import { useEffect } from "react";

export default function TelegramMiniAppRedirect() {
  useEffect(() => {
    let cancelled = false;

    const redirectIfMiniApp = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (cancelled) return;

        if (window.Telegram?.WebApp?.initData) {
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
