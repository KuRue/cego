import {
  deleteEventAction,
  addEventExpenseAction,
  deleteEventExpenseAction,
} from "@/lib/event-actions";
import AppLink from "@/components/app-link";
import { getAdminEventDetail } from "@/lib/events";
import { requireAdminMember } from "@/lib/session";
import Navbar from "@/components/navbar";
import { StatusBadge, titleCase } from "@/components/badge";
import { getNavbarBrand } from "@/lib/settings";
import ConfirmButton from "@/components/confirm-button";
import AdminRsvpManager from "@/components/admin-rsvp-manager";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Event Detail",
};

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requireAdminMember();
  const brand = await getNavbarBrand();
  const { id } = await params;
  const detail = await getAdminEventDetail(id);

  if (!detail) notFound();

  const returnTo = `/admin/events/${detail.event.id}`;

  const activeRsvps = detail.rsvps.filter(
    (r) => r.rsvp.status !== "cancelled",
  );
  const paidCount = activeRsvps.filter(
    (r) => r.rsvp.paymentStatus === "paid" || r.rsvp.paymentStatus === "waived",
  ).length;
  const checkedInCount = activeRsvps.filter(
    (r) => r.rsvp.checkedInAt !== null,
  ).length;

  const totalOwed = activeRsvps.reduce((sum, r) => {
    if (detail.event.priceCents === null) return sum;
    const price = detail.event.priceCents;
    const plusOneCount = r.plusOne.filter((p) => p.status !== "cancelled").length;
    return sum + price * (1 + plusOneCount);
  }, 0);

  const totalPaid = activeRsvps.reduce((sum, r) => {
    if (detail.event.priceCents === null) return sum;
    const price = detail.event.priceCents;
    let paid = sum;
    if (r.rsvp.paymentStatus === "paid") paid += price;
    for (const po of r.plusOne) {
      if (po.status === "cancelled") continue;
      if (po.paymentStatus === "paid") paid += price;
    }
    return paid;
  }, 0);

  const expenseTotal = detail.expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const manualCosts = detail.event.costCents ?? 0;
  const totalCosts = expenseTotal + manualCosts;
  const netBalance = totalPaid - totalCosts;

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
      <main className="relative mx-auto w-full max-w-6xl px-2 pb-16 pt-6 sm:px-4">
        <div className="-mx-2 -mt-6 fixed inset-0 z-0 sm:-mx-4" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(128,128,128,0.15)" }} />
        <div className="relative z-10">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <AppLink
                  href="/admin/events"
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  &larr; Events
                </AppLink>
                <h1 className="mt-1 font-title text-xl font-semibold sm:text-3xl">{detail.event.title}</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={detail.event.status} />
                {detail.event.status === "archived" && (
                  <form action={deleteEventAction} className="hidden sm:block">
                    <input type="hidden" name="eventId" value={detail.event.id} />
                    <ConfirmButton
                      type="submit"
                      message="Delete this event and all its RSVPs? This cannot be undone."
                      className="h-8 rounded-lg px-3 text-xs font-semibold transition"
                      style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>

            <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--color-muted)" }}>
              {titleCase(detail.event.type)} · {formatDateRange(detail.event.startsAt, detail.event.endsAt)} · {detail.event.locationText ?? "No location"}
            </p>
          </div>

      <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Stats</h2>
      <div className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-4">
        <StatBox label="Confirmed" value={`${detail.confirmedCount}/${detail.event.capacity}`} />
        <StatBox label="Waitlisted" value={String(detail.waitlistedCount)} />
        <StatBox label="Checked In" value={String(checkedInCount)} />
        <StatBox label="Paid" value={`${paidCount}/${activeRsvps.length}`} />
      </div>

      {detail.event.priceCents !== null || totalCosts > 0 ? (
        <div className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-4">
          <StatBox label="Total Costs" value={formatPrice(totalCosts)} />
          <StatBox label="Total Owed" value={formatPrice(totalOwed)} />
          <StatBox label="Total Paid" value={formatPrice(totalPaid)} />
          <StatBox
            label="Net Balance"
            value={formatPrice(Math.abs(netBalance))}
            suffix={netBalance >= 0 ? " surplus" : " short"}
            highlight={netBalance < 0 ? "bad" : netBalance > 0 ? "good" : undefined}
          />
        </div>
      ) : null}
    </section>

    <hr className="my-4 border-0" style={{ borderTop: "1px solid var(--color-surface-border)" }} />

    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Expenses</h2>
      {detail.expenses.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {detail.expenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between gap-2 rounded-lg p-2" style={{ background: "var(--color-surface-hover)" }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{expense.description}</p>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>{titleCase(expense.category)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold">{formatPrice(expense.amountCents)}</span>
                <form action={deleteEventExpenseAction}>
                  <input type="hidden" name="expenseId" value={expense.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <ConfirmButton
                    type="submit"
                    message="Remove this expense?"
                    className="text-xs transition"
                    style={{ color: "var(--color-danger)" }}
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between p-2">
            <span className="text-sm font-semibold">Total expenses</span>
            <span className="text-sm font-bold">{formatPrice(expenseTotal)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>No expenses logged yet.</p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer px-1 text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
          New expense
        </summary>
        <form action={addEventExpenseAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_8rem_7rem_auto]">
          <input type="hidden" name="eventId" value={detail.event.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input
            name="description"
            required
            placeholder="Description"
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
          />
          <select
            name="category"
            className="h-9 rounded-lg px-2 text-sm outline-none"
            style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
          >
            <option value="food">Food</option>
            <option value="supplies">Supplies</option>
            <option value="venue">Venue</option>
            <option value="transport">Transport</option>
            <option value="other">Other</option>
          </select>
          <input
            name="amount"
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="$0"
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
          />
          <button
            type="submit"
            className="h-9 rounded-lg px-3 text-sm font-semibold transition"
            style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
          >
            Add
          </button>
        </form>
      </details>
    </section>

    <hr className="my-4 border-0" style={{ borderTop: "1px solid var(--color-surface-border)" }} />

    <div className="flex items-center justify-between gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
        RSVPs ({activeRsvps.length})
      </h2>
      <AppLink
        href="/admin/events"
        className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold transition"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        &larr; Edit event
      </AppLink>
    </div>

    {detail.rsvps.length > 0 ? (
      <div className="mt-2">
        <AdminRsvpManager
          rsvps={detail.rsvps}
          eventId={detail.event.id}
          paymentRequired={detail.event.paymentRequired ?? false}
          survey={detail.survey ?? null}
        />
      </div>
    ) : (
      <p className="mt-2 text-center text-sm" style={{ color: "var(--color-muted)" }}>No RSVPs yet</p>
    )}
        </div>
      </main>
    </>
  );
}

function StatBox({ label, value, suffix, highlight }: { label: string; value: string; suffix?: string; highlight?: "good" | "bad" }) {
  const color = highlight === "good" ? "var(--color-success)" : highlight === "bad" ? "var(--color-danger)" : "var(--color-foreground)";
  return (
    <div className="min-w-0 rounded-lg p-2" style={{ background: "var(--color-surface-hover)" }}>
      <p className="truncate text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p className="mt-0.5 truncate text-base font-bold sm:text-lg" style={{ color }}>
        {value}{suffix && <span className="text-xs font-normal">{suffix}</span>}
      </p>
    </div>
  );
}

function formatDateRange(startsAt: Date, endsAt: Date | null): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAt) return formatter.format(startsAt);
  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

function toDateTimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}
