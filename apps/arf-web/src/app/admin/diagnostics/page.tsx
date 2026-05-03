import Link from "next/link";
import { count, getDb, members } from "@arf/db";
import {
  getTelegramBotInfo,
  getTelegramGroupStatus,
  TelegramBotApiError,
} from "@arf/telegram";
import { getPublicUrl } from "@/lib/public-url";
import { requireAdminMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Diagnostics",
};

type DiagnosticStatus = "pass" | "warn" | "fail";

interface DiagnosticItem {
  label: string;
  status: DiagnosticStatus;
  value: string;
  detail?: string;
}

export default async function AdminDiagnosticsPage() {
  const currentMember = await requireAdminMember();
  const [database, publicHealth, telegramBot, telegramGroup] =
    await Promise.all([
      checkDatabase(),
      checkPublicHealth(),
      checkTelegramBot(),
      checkTelegramGroup(currentMember.telegramId),
    ]);

  const configuration = getConfigurationDiagnostics();
  const currentMemberDiagnostics: DiagnosticItem[] = [
    {
      label: "Current member",
      status: "pass" as const,
      value: currentMember.telegramDisplayName,
      detail: `Telegram ID ${currentMember.telegramId}`,
    },
    {
      label: "Stored group status",
      status: currentMember.groupStatus === "member" ? "pass" : "warn",
      value: currentMember.groupStatus,
    },
    {
      label: "App admin role",
      status: currentMember.isAdmin ? "pass" : "fail",
      value: currentMember.isAdmin ? "admin" : "not admin",
    },
  ];

  return (
    <main className="min-h-screen bg-[#14211f] px-4 py-8 text-white sm:px-5">
      <section className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin" className="font-semibold">
            ARF Admin
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <Link href="/admin">Events</Link>
            <Link href="/admin/members">Members</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>

        <div className="mt-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Organizer admin
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Deployment diagnostics.
          </h1>
          <p className="mt-4 leading-7 text-white/70">
            Checks runtime setup without printing secrets. Use this when
            Telegram, Cloudflare Tunnel, database, or admin access behavior
            looks wrong.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <DiagnosticPanel title="Runtime" items={[database, publicHealth]} />
          <DiagnosticPanel title="Telegram" items={[telegramBot, telegramGroup]} />
          <DiagnosticPanel title="Configuration" items={configuration} />
          <DiagnosticPanel title="Current Session" items={currentMemberDiagnostics} />
        </div>
      </section>
    </main>
  );
}

async function checkDatabase(): Promise<DiagnosticItem> {
  try {
    const db = getDb();
    const result = await db.select({ total: count() }).from(members);
    const total = result[0]?.total ?? 0;

    return {
      label: "Database",
      status: "pass",
      value: "reachable",
      detail: `${total} member${total === 1 ? "" : "s"} stored`,
    };
  } catch (error) {
    return {
      label: "Database",
      status: "fail",
      value: "unreachable",
      detail: getErrorMessage(error),
    };
  }
}

async function checkPublicHealth(): Promise<DiagnosticItem> {
  const healthUrl = getPublicUrl("/api/health");

  try {
    const response = await fetchWithTimeout(healthUrl, 3000);

    if (!response.ok) {
      return {
        label: "Public app URL",
        status: "warn",
        value: healthUrl.origin,
        detail: `Health endpoint returned HTTP ${response.status}`,
      };
    }

    return {
      label: "Public app URL",
      status: "pass",
      value: healthUrl.origin,
      detail: "/api/health returned OK",
    };
  } catch (error) {
    return {
      label: "Public app URL",
      status: "warn",
      value: healthUrl.origin,
      detail: getErrorMessage(error),
    };
  }
}

async function checkTelegramBot(): Promise<DiagnosticItem> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return {
      label: "Telegram bot",
      status: "fail",
      value: "missing token",
      detail: "Set TELEGRAM_BOT_TOKEN.",
    };
  }

  try {
    const bot = await getTelegramBotInfo({ botToken });
    const configuredUsername = process.env.TELEGRAM_BOT_USERNAME;
    const usernameMatches =
      !configuredUsername || configuredUsername === bot.username;

    return {
      label: "Telegram bot",
      status: usernameMatches ? "pass" : "warn",
      value: bot.username ? `@${bot.username}` : bot.first_name,
      detail: usernameMatches
        ? `Bot ID ${bot.id}`
        : `TELEGRAM_BOT_USERNAME is ${configuredUsername}, but getMe returned ${bot.username}.`,
    };
  } catch (error) {
    return {
      label: "Telegram bot",
      status: "fail",
      value: "getMe failed",
      detail: getErrorMessage(error),
    };
  }
}

async function checkTelegramGroup(telegramId: string): Promise<DiagnosticItem> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_GROUP_ID;

  if (!botToken || !chatId) {
    return {
      label: "Telegram group lookup",
      status: "fail",
      value: "missing configuration",
      detail: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID.",
    };
  }

  const userId = Number(telegramId);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return {
      label: "Telegram group lookup",
      status: "fail",
      value: "invalid current Telegram ID",
      detail: telegramId,
    };
  }

  try {
    const status = await getTelegramGroupStatus({ botToken, chatId, userId });

    return {
      label: "Telegram group lookup",
      status: status === "member" ? "pass" : "warn",
      value: status,
      detail: `Checked ${telegramId} in ${chatId}`,
    };
  } catch (error) {
    return {
      label: "Telegram group lookup",
      status: "fail",
      value: error instanceof TelegramBotApiError ? "Telegram API failed" : "failed",
      detail: getErrorMessage(error),
    };
  }
}

function getConfigurationDiagnostics(): DiagnosticItem[] {
  return [
    envDiagnostic("APP_BASE_URL", process.env.APP_BASE_URL, {
      showValue: true,
      validate: (value) => value.startsWith("https://"),
      invalidDetail: "Use the public HTTPS origin, for example https://arf.kurue.com.",
    }),
    envDiagnostic("TELEGRAM_BOT_USERNAME", process.env.TELEGRAM_BOT_USERNAME, {
      showValue: true,
      validate: (value) => !value.startsWith("@"),
      invalidDetail: "Use the username without @.",
    }),
    envDiagnostic("TELEGRAM_GROUP_ID", process.env.TELEGRAM_GROUP_ID, {
      showValue: true,
      validate: (value) => value.startsWith("-100"),
      invalidDetail: "Supergroup IDs usually start with -100.",
    }),
    envDiagnostic("SESSION_SECRET", process.env.SESSION_SECRET),
    envDiagnostic("HI_EVENTS_WEBHOOK_SECRET", process.env.HI_EVENTS_WEBHOOK_SECRET),
  ];
}

function envDiagnostic(
  label: string,
  value: string | undefined,
  options: {
    showValue?: boolean;
    validate?: (value: string) => boolean;
    invalidDetail?: string;
  } = {},
): DiagnosticItem {
  if (!value) {
    return {
      label,
      status: "fail",
      value: "missing",
    };
  }

  if (options.validate && !options.validate(value)) {
    return {
      label,
      status: "warn",
      value: options.showValue ? value : "configured",
      detail: options.invalidDetail,
    };
  }

  return {
    label,
    status: "pass",
    value: options.showValue ? value : "configured",
  };
}

function DiagnosticPanel({
  items,
  title,
}: {
  items: DiagnosticItem[];
  title: string;
}) {
  return (
    <section className="border border-white/15 bg-white p-5 text-[#1d2523]">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="border border-[#d7e3df] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#14211f]">
                  {item.label}
                </p>
                <p className="mt-1 break-all font-mono text-sm text-[#4e5b57]">
                  {item.value}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            {item.detail ? (
              <p className="mt-3 break-words text-sm leading-6 text-[#64706c]">
                {item.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: DiagnosticStatus }) {
  const className =
    status === "pass"
      ? "bg-[#dbe9e5] text-[#183f3c]"
      : status === "warn"
        ? "bg-[#f7e9c0] text-[#6b4c00]"
        : "bg-[#fde1da] text-[#7c2f20]";

  return (
    <span className={`rounded-md px-3 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

async function fetchWithTimeout(url: URL, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = windowlessSetTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function windowlessSetTimeout(
  callback: () => void,
  timeoutMs: number,
): ReturnType<typeof setTimeout> {
  return setTimeout(callback, timeoutMs);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
