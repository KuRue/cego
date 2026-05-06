import { count, desc, events, getDb, members, rsvps, siteSettings, sql } from "@cego/db";
import {
  getTelegramBotInfo,
  getTelegramChatAdministrators,
  getTelegramGroupStatus,
  TelegramBotApiError,
} from "@cego/telegram";
import { StatusBadge } from "@/components/badge";
import AppLink from "@/components/app-link";
import Navbar from "@/components/navbar";
import { formatDateWithTime } from "@/lib/format-date";
import { getNavbarBrand, normalizeTimezone } from "@/lib/settings";
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
  const brand = await getNavbarBrand();
  const [
    database,
    publicHealth,
    timezoneDiagnostics,
    telegramBot,
    telegramGroup,
    telegramAdmins,
  ] =
    await Promise.all([
      checkDatabase(),
      checkPublicHealth(),
      checkTimezoneDiagnostics(),
      checkTelegramBot(),
      checkTelegramGroup(currentMember.telegramId),
      checkTelegramAdministrators(currentMember.telegramId),
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
    <>
      <Navbar
        member={{
          telegramDisplayName: currentMember.telegramDisplayName,
          telegramPhotoUrl: currentMember.telegramPhotoUrl,
          isAdmin: currentMember.isAdmin,
        }}
        brand={brand}
      />
      <main className="page-shell mx-auto max-w-6xl px-5 pb-16 pt-8">
        <AppLink
          href="/admin"
          className="text-sm font-semibold"
          style={{ color: "var(--color-accent)" }}
        >
          &larr; Admin
        </AppLink>
        <h1 className="mt-1 text-3xl font-semibold">Diagnostics</h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <DiagnosticPanel title="Runtime" items={[database, publicHealth]} />
          <DiagnosticPanel title="Timezone" items={timezoneDiagnostics} />
          <DiagnosticPanel title="Telegram" items={[telegramBot, telegramGroup, telegramAdmins]} />
          <DiagnosticPanel title="Configuration" items={configuration} />
          <DiagnosticPanel title="Current Session" items={currentMemberDiagnostics} />
        </div>
      </main>
    </>
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

async function checkTelegramAdministrators(
  telegramId: string,
): Promise<DiagnosticItem> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_GROUP_ID;

  if (!botToken || !chatId) {
    return {
      label: "Telegram admin sync",
      status: "fail",
      value: "missing configuration",
      detail: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID.",
    };
  }

  try {
    const administrators = await getTelegramChatAdministrators({
      botToken,
      chatId,
    });
    const currentMemberIsTelegramAdmin = administrators.some(
      (administrator) => String(administrator.user.id) === telegramId,
    );

    return {
      label: "Telegram admin sync",
      status: currentMemberIsTelegramAdmin ? "pass" : "warn",
      value: currentMemberIsTelegramAdmin
        ? "current member is admin"
        : "current member not listed",
      detail: `${administrators.length} human admin${
        administrators.length === 1 ? "" : "s"
      } returned by Telegram`,
    };
  } catch (error) {
    return {
      label: "Telegram admin sync",
      status: "fail",
      value: "getChatAdministrators failed",
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
    envDiagnostic("CEGO_BUILD_SHA", process.env.CEGO_BUILD_SHA, {
      showValue: true,
    }),
    envDiagnostic("APP_BASE_URL", process.env.APP_BASE_URL, {
      showValue: true,
      validate: (value) => value.startsWith("https://"),
      invalidDetail: "Use the public HTTPS origin, for example https://cego.example.com.",
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
  ];
}

async function checkTimezoneDiagnostics(): Promise<DiagnosticItem[]> {
  try {
    const db = getDb();
    const [rawSettingsRows, latestEventRows, latestRsvpRows] =
      await Promise.all([
        db.select({ timezone: siteSettings.timezone }).from(siteSettings).limit(1),
        db
          .select({
            title: events.title,
            paymentDueDate: events.paymentDueDate,
            updatedAt: events.updatedAt,
          })
          .from(events)
          .where(sql`${events.paymentDueDate} IS NOT NULL`)
          .orderBy(desc(events.updatedAt))
          .limit(1),
        db
          .select({
            id: rsvps.id,
            status: rsvps.status,
            paymentStatus: rsvps.paymentStatus,
            paymentDeadlineAt: rsvps.paymentDeadlineAt,
            updatedAt: rsvps.updatedAt,
          })
          .from(rsvps)
          .where(sql`${rsvps.paymentDeadlineAt} IS NOT NULL`)
          .orderBy(desc(rsvps.updatedAt))
          .limit(1),
      ]);

    const rawTimezone = rawSettingsRows[0]?.timezone ?? null;
    const configuredTimezone = normalizeTimezone(rawTimezone);
    const sanityDate = new Date("2026-05-06T09:30:00.000Z");
    const sanityValue = formatDateWithTime(sanityDate, configuredTimezone);
    const latestEvent = latestEventRows[0];
    const latestRsvp = latestRsvpRows[0];

    return [
      {
        label: "Configured timezone",
        status: "pass",
        value: configuredTimezone,
        detail: `Raw database value: ${rawTimezone ?? "(default)"}`,
      },
      {
        label: "UTC to site timezone sanity check",
        status:
          configuredTimezone === "America/New_York" && sanityValue.includes("5:30")
            ? "pass"
            : "warn",
        value: sanityValue,
        detail:
          "For Eastern Time, 2026-05-06T09:30:00.000Z must display as 5:30 AM.",
      },
      latestEvent?.paymentDueDate
        ? {
            label: "Latest event payment deadline",
            status: "pass",
            value: formatDateWithTime(latestEvent.paymentDueDate, configuredTimezone),
            detail: `${latestEvent.title}: ${latestEvent.paymentDueDate.toISOString()}`,
          }
        : {
            label: "Latest event payment deadline",
            status: "warn",
            value: "none found",
          },
      latestRsvp?.paymentDeadlineAt
        ? {
            label: "Latest RSVP payment deadline",
            status: "pass",
            value: formatDateWithTime(latestRsvp.paymentDeadlineAt, configuredTimezone),
            detail: `${latestRsvp.status}/${latestRsvp.paymentStatus}: ${latestRsvp.paymentDeadlineAt.toISOString()}`,
          }
        : {
            label: "Latest RSVP payment deadline",
            status: "warn",
            value: "none found",
          },
    ];
  } catch (error) {
    return [
      {
        label: "Timezone diagnostics",
        status: "fail",
        value: "failed",
        detail: getErrorMessage(error),
      },
    ];
  }
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
    <section className="glass-lg rounded-2xl p-5">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="glass rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 break-all font-mono text-sm" style={{ color: "var(--color-muted)" }}>
                  {item.value}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            {item.detail ? (
              <p className="mt-3 break-words text-sm leading-6" style={{ color: "var(--color-muted)" }}>
                {item.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
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
