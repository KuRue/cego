"use client";

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

const MAX_SESSION_RETRIES = 3;
const SESSION_RETRY_BASE_MS = 1500;

export default function MiniAppSession() {
  const [state, setState] = useState<SessionState>({ status: "idle" });
  const [retryCount, setRetryCount] = useState(0);

  const createSession = useCallback(async (payload: {
    initData?: string;
    useDevMock?: boolean;
    startParam?: string;
  }, attempt = 0) => {
    setState({ status: "checking" });

    let response: Response;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      response = await fetch("/api/telegram/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (attempt < MAX_SESSION_RETRIES - 1) {
        const delay = SESSION_RETRY_BASE_MS * (attempt + 1);
        setRetryCount(attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
        return createSession(payload, attempt + 1);
      }

      setState({
        status: "error",
        message: isAbort
          ? "Session request timed out. Reopen the Mini App and try again."
          : "Could not reach the session endpoint. Reopen the Mini App and try again.",
      });
      return;
    }

    let body: SessionResponse;

    try {
      body = (await response.json()) as SessionResponse;
    } catch {
      if (attempt < MAX_SESSION_RETRIES - 1) {
        const delay = SESSION_RETRY_BASE_MS * (attempt + 1);
        setRetryCount(attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
        return createSession(payload, attempt + 1);
      }

      setState({
        status: "error",
        message: `Server returned a non-JSON session response with status ${response.status}.`,
      });
      return;
    }

    if (!response.ok) {
      const isRetryable = response.status >= 500 || response.status === 429;

      if (isRetryable && attempt < MAX_SESSION_RETRIES - 1) {
        const delay = SESSION_RETRY_BASE_MS * (attempt + 1);
        setRetryCount(attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
        return createSession(payload, attempt + 1);
      }

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
        message: "Telegram session succeeded but no member profile was returned.",
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

    const startParam = payload.startParam;
    if (startParam?.startsWith("event-")) {
      window.location.replace(`/events/${startParam.slice(6)}`);
    } else {
      window.location.replace("/dashboard");
    }
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
      const startParam = webApp?.initDataUnsafe?.start_param ?? parseStartParam(initData);

      if (initData) {
        void createSession({ initData, startParam });
      }
    };

    void initializeTelegramSession();

    return () => {
      cancelled = true;
    };
  }, [createSession]);

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-5 py-6">
      <div className="glass-lg mx-auto w-full max-w-md rounded-2xl p-6">
    {state.status === "checking" ? (
      <div className="mt-6 text-center">
        <div
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
        <p className="mt-4 font-semibold">Verifying your account.</p>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          {retryCount > 0
            ? `Retrying (attempt ${retryCount + 1} of ${MAX_SESSION_RETRIES})...`
            : "Checking Telegram identity and group access..."}
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
        <button
          type="button"
          onClick={() => {
            setRetryCount(0);
            const initData = window.Telegram?.WebApp?.initData;
            const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? parseStartParam(initData ?? "");
            if (initData) {
              void createSession({ initData, startParam }, 0);
            } else {
              void createSession({ useDevMock: true }, 0);
            }
          }}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-on-accent)",
          }}
        >
          Retry
        </button>
        <DevMockButton onDevMock={() => { setRetryCount(0); createSession({ useDevMock: true }, 0); }} />
      </div>
    ) : null}

    {state.status === "idle" ? (
      <div className="mt-6 text-center">
        <div
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
        <p className="mt-4 font-semibold">Waiting for Telegram...</p>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          Open this page inside Telegram to sign in automatically.
        </p>
        <DevMockButton onDevMock={() => { setRetryCount(0); createSession({ useDevMock: true }, 0); }} />
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

function parseStartParam(initData: string): string | undefined {
  try {
    const params = new URLSearchParams(initData);
    return params.get("start_param") ?? undefined;
  } catch {
    return undefined;
  }
}
