"use client";

import { useEffect } from "react";

export default function TelegramMiniAppRedirect() {
  useEffect(() => {
    const redirectIfMiniApp = () => {
      if (window.Telegram?.WebApp?.initData) {
        window.location.replace("/mini-app");
      }
    };

    redirectIfMiniApp();
    const timeoutId = window.setTimeout(redirectIfMiniApp, 250);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}
