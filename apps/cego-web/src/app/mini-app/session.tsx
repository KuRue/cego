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

const steps = [
  "Read Telegram.WebApp.initData from the Mini App shell.",
  "Send the signed payload to the cego backend.",
  "Verify Telegram signature and freshness server-side.",
  "Check Telegram group membership before RSVP access.",
];

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
    <main className="min-h-screen bg-[#f3f8f6] px-5 py-6 text-[#1d2523]">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl flex-col justify-between border border-[#cadbd7] bg-white p-5 shadow-[0_20px_60px_rgba(29,37,35,0.1)]">
        <div>
          <Link href="/" className="text-sm font-semibold text-[#183f3c]">
            cego
          </Link>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
            Telegram Mini App
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Your Telegram identity becomes your cego account.
          </h1>
          <p className="mt-4 leading-7 text-[#4e5b57]">
            cego validates the signed Telegram payload on the server, checks the
            configured group gate, then opens the member flow for approved group
            members.
          </p>

          <div className="mt-8 space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3 border border-[#dfe9e6] p-4">
                <span className="font-mono text-sm text-[#b4573f]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-[#3a4642]">{step}</span>
              </div>
            ))}
          </div>

          <SessionPanel
            state={state}
            hasTelegramInitData={state.status !== "idle"}
            onDevMock={() => createSession({ useDevMock: true })}
          />
        </div>
      </section>
    </main>
  );
}

function SessionPanel({
  state,
  hasTelegramInitData,
  onDevMock,
}: {
  state: SessionState;
  hasTelegramInitData: boolean;
  onDevMock: () => void;
}) {
  if (state.status === "checking") {
    return (
      <div className="mt-8 border border-[#cadbd7] bg-[#f8fbff] p-5">
        <p className="font-semibold text-[#183f3c]">Checking Telegram session.</p>
        <p className="mt-2 text-sm text-[#4e5b57]">
          cego is validating identity and group access.
        </p>
      </div>
    );
  }

  if (state.status === "accepted") {
    return (
      <div className="mt-8 border border-[#8bb5aa] bg-[#edf8f4] p-5">
        <p className="font-semibold text-[#183f3c]">
          Access ready for {state.member.telegramDisplayName}.
        </p>
        <p className="mt-2 text-sm text-[#4e5b57]">
          Mode: {state.mode === "dev" ? "local dev mock" : "Telegram verified"}.
          Group status: {state.member.groupStatus}.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign("/dashboard")}
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white"
        >
          Continue to dashboard
        </button>
      </div>
    );
  }

  if (state.status === "blocked") {
    return (
      <div className="mt-8 border border-[#e0b6a9] bg-[#fff6f3] p-5">
        <p className="font-semibold text-[#7c2f20]">Group access required.</p>
        <p className="mt-2 text-sm text-[#4e5b57]">
          This Telegram account was verified, but it is not currently approved
          for cego event flows.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-8 border border-[#e0b6a9] bg-[#fff6f3] p-5">
        <p className="font-semibold text-[#7c2f20]">Session unavailable.</p>
        <p className="mt-2 text-sm text-[#4e5b57]">{state.message}</p>
        <p className="mt-2 text-sm text-[#4e5b57]">
          Close and reopen the Mini App after checking the BotFather Mini App
          URL and the server logs.
        </p>
        <DevMockButton onDevMock={onDevMock} />
      </div>
    );
  }

  return (
    <div className="mt-8 border border-[#cadbd7] bg-[#f8fbff] p-5">
      <p className="font-semibold text-[#183f3c]">
        {hasTelegramInitData
          ? "Telegram data found."
          : "Open this route inside Telegram to sign in."}
      </p>
      <p className="mt-2 text-sm text-[#4e5b57]">
        Local development can use the explicit dev mock once
        `CEGO_DEV_TELEGRAM_MOCK=true` is set.
      </p>
      <DevMockButton onDevMock={onDevMock} />
    </div>
  );
}

function DevMockButton({ onDevMock }: { onDevMock: () => void }) {
  return (
    <button
      type="button"
      onClick={onDevMock}
      className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md border border-[#b8cac5] px-5 text-sm font-semibold text-[#183f3c] transition hover:border-[#183f3c]"
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
