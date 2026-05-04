"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/navbar";
import { getNavbarBrand } from "@/lib/settings";

type AuthState =
  | { status: "checking" }
  | { status: "mini_app"; message: string }
  | { status: "browser"; error?: string }
  | { status: "success"; displayName: string }
  | { status: "error"; message: string };

export default function SignInPage() {
  const [state, setState] = useState<AuthState>({ status: "checking" });
  const [brand, setBrand] = useState<{ siteName: string; logoUrl: string | null }>({
    siteName: "",
    logoUrl: null,
  });
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/brand")
      .then((r) => r.json())
      .then((d) => setBrand(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/sign-in-config")
      .then((r) => r.json())
      .then((d) => {
        setBotUsername(d.botUsername ?? null);
        setAuthUrl(d.authUrl ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function trySignIn() {
      const webApp = await waitForTelegramWebApp();

      if (cancelled) return;

      if (webApp?.initData) {
        webApp.ready();
        webApp.expand();
        setState({ status: "mini_app", message: "Verifying Telegram identity..." });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/telegram/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initData: webApp.initData }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const body = await res.json();

          if (!res.ok) {
            setState({ status: "browser", error: body.error });
            return;
          }

          setState({ status: "success", displayName: body.member?.telegramDisplayName ?? "" });

          await new Promise((r) => setTimeout(r, 800));
          window.location.href = "/dashboard";
        } catch {
          setState({ status: "browser" });
        }
        return;
      }

      setState({ status: "browser" });
    }

    trySignIn();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.status !== "browser" || !widgetRef.current || !botUsername || !authUrl) return;

    const container = widgetRef.current;
    container.replaceChildren();

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.authUrl = authUrl;
    script.dataset.requestAccess = "write";
    container.append(script);
  }, [state.status, botUsername, authUrl]);

  return (
    <>
      <Navbar brand={brand} />
      <main className="mx-auto flex min-h-[calc(100vh-60px)] max-w-md flex-col justify-center px-5 py-16">
        <div className="glass-lg rounded-2xl p-8">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
            Use your Telegram account. No separate password needed.
          </p>

          {state.status === "checking" || state.status === "mini_app" ? (
            <div className="mt-6 text-center">
              <div
                className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
              />
              <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
                {state.status === "checking"
                  ? "Checking Telegram..."
                  : state.message}
              </p>
            </div>
          ) : null}

          {state.status === "success" ? (
            <div className="mt-6 text-center">
              <p className="font-semibold">Welcome, {state.displayName}.</p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                Redirecting...
              </p>
            </div>
          ) : null}

          {state.status === "browser" ? (
            <div className="mt-6">
              {state.error ? (
                <div
                  className="mb-4 rounded-xl p-4"
                  style={{
                    background: "var(--color-danger-bg)",
                    border: "1px solid var(--color-danger-border)",
                  }}
                >
                  <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                    {state.error}
                  </p>
                </div>
              ) : null}
              <div ref={widgetRef} className="min-h-12" />
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="mt-6">
              <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                {state.message}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold transition"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}

async function waitForTelegramWebApp() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const webApp = window.Telegram?.WebApp;
    if (webApp) return webApp;
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.Telegram?.WebApp ?? null;
}
