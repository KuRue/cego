"use client";

import { useEffect, useRef } from "react";

export default function TelegramLoginWidget({
  authUrl,
  botUsername,
}: {
  authUrl: string;
  botUsername: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.authUrl = authUrl;
    script.dataset.requestAccess = "write";

    container.append(script);

    return () => {
      container.replaceChildren();
    };
  }, [authUrl, botUsername]);

  return <div ref={containerRef} className="min-h-12" />;
}
