import Link from "next/link";
import { headers } from "next/headers";
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

  return (
    <main className="min-h-screen bg-[#f3f8f6] px-5 py-6 text-[#1d2523]">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl flex-col justify-between border border-[#cadbd7] bg-white p-5 shadow-[0_20px_60px_rgba(29,37,35,0.1)]">
        <div>
          <Link href="/" className="text-sm font-semibold text-[#183f3c]">
            ARF
          </Link>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
            Telegram SSO
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Sign in with the Telegram account you use in the ARF group.
          </h1>
          <p className="mt-4 leading-7 text-[#4e5b57]">
            ARF uses Telegram as the account system. After Telegram verifies the
            login, ARF checks group membership and opens the member dashboard.
          </p>

          {hasTelegramError ? (
            <div className="mt-8 border border-[#e0b6a9] bg-[#fff6f3] p-5">
              <p className="font-semibold text-[#7c2f20]">
                Telegram sign-in did not complete.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4e5b57]">
                The login link was invalid or expired. Start a new Telegram
                sign-in from this page.
              </p>
            </div>
          ) : null}

          <div className="mt-8 border border-[#dfe9e6] bg-[#f8fbff] p-5">
            <p className="font-semibold text-[#183f3c]">
              Browser sign-in
            </p>
            <p className="mt-2 text-sm leading-6 text-[#4e5b57]">
              Use this when opening ARF from a normal browser link.
            </p>
            <div className="mt-5">
              {botUsername ? (
                <TelegramLoginWidget
                  authUrl={authUrl}
                  botUsername={botUsername}
                />
              ) : (
                <p className="border border-[#e0b6a9] bg-[#fff6f3] p-4 text-sm text-[#7c2f20]">
                  TELEGRAM_BOT_USERNAME is not configured, so browser sign-in
                  cannot render yet.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 border border-[#dfe9e6] p-5">
            <p className="font-semibold text-[#183f3c]">Inside Telegram</p>
            <p className="mt-2 text-sm leading-6 text-[#4e5b57]">
              The Mini App still uses Telegram.WebApp init data and the same ARF
              session cookie.
            </p>
            <Link
              href="/mini-app"
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md border border-[#b8cac5] px-5 text-sm font-semibold text-[#183f3c] transition hover:border-[#183f3c]"
            >
              Open Mini App flow
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

async function getTelegramAuthUrl(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const host = requestHeaders.get("host");

  if (host) {
    const defaultProto = host.startsWith("localhost") ? "http" : "https";
    return `${forwardedProto ?? defaultProto}://${host}/api/telegram/login`;
  }

  return new URL(
    "/api/telegram/login",
    process.env.APP_BASE_URL ?? "https://arf.kurue.com",
  ).toString();
}
