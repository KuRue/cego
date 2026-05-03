import Link from "next/link";
import { headers } from "next/headers";
import Navbar from "@/components/navbar";
import { getNavbarBrand } from "@/lib/settings";
import { getPublicUrl } from "@/lib/public-url";
import TelegramLoginWidget from "./telegram-login-widget";

export const metadata = {
  title: "Sign in",
};

interface SignInPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const hasTelegramError = params?.error === "telegram_login_failed";
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const authUrl = await getTelegramAuthUrl();
  const brand = await getNavbarBrand();

  return (
    <>
      <Navbar brand={brand} />
      <main className="page-shell mx-auto flex min-h-[calc(100vh-60px)] max-w-5xl flex-col justify-center px-5 py-16">
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          <div className="glass-lg rounded-2xl p-8">
            <p className="text-sm font-semibold" style={{ color: "var(--color-highlight)" }}>
              Telegram identity
            </p>
            <h1 className="mt-3 text-3xl font-semibold">One account for the community.</h1>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
              cego uses Telegram for sign-in, group access, and member identity. No separate password account is created.
            </p>
          </div>
          <div className="glass-lg rounded-2xl p-8">
            <h1 className="text-3xl font-semibold">Sign in</h1>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
              Use your Telegram account to sign in. cego checks group membership
              and opens the member dashboard.
            </p>

            {hasTelegramError ? (
              <div
                className="mt-6 rounded-xl p-4"
                style={{
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-border)",
                }}
              >
                <p className="font-semibold" style={{ color: "var(--color-danger)" }}>
                  Sign-in did not complete.
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                  The login link was invalid or expired. Try again below.
                </p>
              </div>
            ) : null}

            <div className="mt-6 glass rounded-xl p-5">
              <p className="font-semibold">Browser sign-in</p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                Use this when opening cego from a normal browser.
              </p>
              <div className="mt-4">
                {botUsername ? (
                  <TelegramLoginWidget
                    authUrl={authUrl}
                    botUsername={botUsername}
                  />
                ) : (
                  <div
                    className="rounded-xl p-4 text-sm"
                    style={{
                      background: "var(--color-danger-bg)",
                      border: "1px solid var(--color-danger-border)",
                      color: "var(--color-danger)",
                    }}
                  >
                    TELEGRAM_BOT_USERNAME is not configured.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 glass rounded-xl p-5">
              <p className="font-semibold">Inside Telegram</p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                Open the Mini App for automatic sign-in.
              </p>
              <Link
                href="/mini-app"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
                style={{
                  background: "var(--color-surface-hover)",
                  border: "1px solid var(--color-surface-border)",
                }}
              >
                Open Mini App
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

async function getTelegramAuthUrl(): Promise<string> {
  return getPublicUrl("/api/telegram/login", await headers()).toString();
}
