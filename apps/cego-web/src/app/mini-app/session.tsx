"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SessionState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "accepted"; member: SessionMember; mode: "telegram" | "dev" }
  | { status: "blocked"; member: SessionMember }
  | { status: "error"; message: string };

interface SessionMember {
  telegramId: string;
  telegramUsername?: string | null;
  telegramDisplayName: string;
  telegramPhotoUrl?: string | null;
  groupStatus: "member" | "not_member" | "unknown";
}

interface SessionResponse {
  status: "accepted" | "blocked" | "dev_mock";
  member?: SessionMember;
  error?: string;
}

export default function MiniAppSession() {
  const [state, setState] = useState<SessionState>({ status: "idle" });

  const createSession = useCallback(async (payload: {
    initData?: string;
    useDevMock?: boolean;
  }) => {
    setState({ status: "checking" });

    let response: Response;

    try {
      response = await fetch("/api/telegram/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      setState({
        status: "error",
        message: "cego could not reach the session endpoint. Reopen the Mini App and try again.",
      });
      return;
    }

    let body: SessionResponse;

    try {
      body = (await response.json()) as SessionResponse;
    } catch {
      setState({
        status: "error",
        message: `cego returned a non-JSON session response with status ${response.status}.`,
      });
      return;
    }

    if (!response.ok) {
      setState({
        status: "error",
        message: body.error
          ? `Telegram session failed: ${body.error}`
          : `Telegram session failed with status ${response.status}.`,
      });
      return;
    }

    if (!body.member) {
      setState({
        status: "error",
        message: "Telegram session succeeded but cego did not return a member profile.",
      });
      return;
    }

    if (body.status === "blocked") {
      setState({ status: "blocked", member: body.member });
      return;
    }

    setState({
      status: "accepted",
      member: body.member,
      mode: body.status === "dev_mock" ? "dev" : "telegram",
    });

    window.location.replace("/dashboard");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeTelegramSession = async () => {
      const webApp = await waitForTelegramWebApp();

      if (cancelled) {
        return;
      }

      webApp?.ready();
      webApp?.expand();

      const initData = webApp?.initData ?? "";

      if (initData) {
        void createSession({ initData });
      }
    };

    void initializeTelegramSession();

    return () => {
      cancelled = true;
    };
  }, [createSession]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-6">
      <div className="glass-lg mx-auto w-full max-w-md rounded-2xl p-6">
        <Link href="/" className="text-sm font-semibold">
          cego
        </Link>

        {state.status === "checking" ? (
          <div className="mt-6 text-center">
            <p className="font-semibold">Verifying your account.</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Checking Telegram identity and group access...
            </p>
          </div>
        ) : null}

        {state.status === "accepted" ? (
          <div className="mt-6 text-center">
            <p className="font-semibold">Welcome, {state.member.telegramDisplayName}.</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Redirecting to dashboard...
            </p>
          </div>
        ) : null}

        {state.status === "blocked" ? (
          <div className="mt-6 text-center">
            <p className="font-semibold" style={{ color: "var(--color-danger)" }}>Group access required.</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              This Telegram account is verified, but is not a member of the
              configured Telegram group.
            </p>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="mt-6 text-center">
            <p className="font-semibold" style={{ color: "var(--color-danger)" }}>Session unavailable.</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              {state.message}
            </p>
            <DevMockButton onDevMock={() => createSession({ useDevMock: true })} />
          </div>
        ) : null}

        {state.status === "idle" ? (
          <div className="mt-6 text-center">
            <p className="font-semibold">Waiting for Telegram...</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Open this page inside Telegram to sign in automatically.
            </p>
            <DevMockButton onDevMock={() => createSession({ useDevMock: true })} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

function DevMockButton({ onDevMock }: { onDevMock: () => void }) {
  return (
    <button
      type="button"
      onClick={onDevMock}
      className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
      style={{
        background: "var(--color-surface-hover)",
        border: "1px solid var(--color-surface-border)",
        color: "var(--color-foreground)",
      }}
    >
      Try local dev mock
    </button>
  );
}

async function waitForTelegramWebApp() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const webApp = window.Telegram?.WebApp;

    if (webApp) {
      return webApp;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  return window.Telegram?.WebApp;
}
