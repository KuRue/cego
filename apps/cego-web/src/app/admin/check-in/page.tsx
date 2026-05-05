import { requireAdminMember } from "@/lib/session";
import { getNavbarBrand } from "@/lib/settings";
import Navbar from "@/components/navbar";
import { getDb, events } from "@cego/db";
import { inArray } from "@cego/db";
import CheckInScanner from "./scanner-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check-in Scanner",
};

export default async function CheckInPage() {
  const member = await requireAdminMember();
  const brand = await getNavbarBrand();

  const db = getDb();
  const qrEvents = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      qrCheckInEnabled: events.qrCheckInEnabled,
    })
    .from(events)
    .where(inArray(events.status, ["show", "closed"]))
    .orderBy(events.startsAt);

  const eligible = qrEvents.filter((e) => e.qrCheckInEnabled);

  return (
    <>
      <Navbar
        member={{
          telegramDisplayName: member.telegramDisplayName,
          telegramPhotoUrl: member.telegramPhotoUrl,
          isAdmin: member.isAdmin,
        }}
        brand={brand}
      />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        {eligible.length === 0 ? (
          <>
            <a href="/admin" className="text-sm font-semibold" style={{ color: "var(--color-accent)" }}>&larr; Admin</a>
            <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
              No events with QR check-in enabled.
            </p>
          </>
        ) : (
          <CheckInScanner events={eligible} />
        )}
      </main>
    </>
  );
}
