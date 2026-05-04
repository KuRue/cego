"use client";

import { useState, useMemo, useTransition, type FormEvent } from "react";
import {
  updateRsvpStatusAction,
  updateRsvpPaymentAction,
  checkInRsvpAction,
  updateRsvpNotesAction,
  addRsvpTagAction,
  removeRsvpTagAction,
} from "@/lib/event-actions";
import { StatusBadge } from "@/components/badge";
import Avatar from "@/components/avatar";

type RsvpRow = {
  rsvp: {
    id: string;
    status: string;
    paymentStatus: string;
    checkedInAt: Date | null;
    notes: string | null;
    tags: string[] | null;
  };
  member: {
    id: string;
    telegramDisplayName: string;
    telegramUsername: string | null;
    telegramPhotoUrl?: string | null;
  };
  plusOne: Array<{
    id: string;
    status: string;
    plusOneName: string | null;
    paymentStatus: string;
    checkedInAt: Date | null;
    notes: string | null;
    tags: string[] | null;
  }>;
};

type FlatEntry =
  | {
      kind: "primary";
      id: string;
      displayName: string;
      username: string | null;
      photoUrl: string | null;
      status: string;
      paymentStatus: string;
      checkedInAt: Date | null;
      notes: string | null;
      tags: string[] | null;
      hasPlusOnes: boolean;
    }
  | {
      kind: "plusOne";
      id: string;
      displayName: string;
      parentName: string;
      status: string;
      paymentStatus: string;
      checkedInAt: Date | null;
      notes: string | null;
      tags: string[] | null;
    };

interface Props {
  rsvps: RsvpRow[];
  eventId: string;
  paymentRequired: boolean;
  survey?: {
    id: string;
    title: string;
    schema: { questions: { id: string; label: string }[] };
    responses: { memberId: string; answersJson: unknown }[];
  } | null;
}

export default function AdminRsvpManager({ rsvps, eventId, paymentRequired, survey }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const flat = useMemo<FlatEntry[]>(() => {
    const entries: FlatEntry[] = [];
    for (const r of rsvps) {
      entries.push({
        kind: "primary",
        id: r.rsvp.id,
        displayName: r.member.telegramDisplayName,
        username: r.member.telegramUsername ?? null,
        photoUrl: (r.member as Record<string, unknown>).telegramPhotoUrl as string | null ?? null,
        status: r.rsvp.status,
        paymentStatus: r.rsvp.paymentStatus,
        checkedInAt: r.rsvp.checkedInAt,
        notes: r.rsvp.notes,
        tags: r.rsvp.tags,
        hasPlusOnes: r.plusOne.length > 0,
      });
      for (const po of r.plusOne) {
        entries.push({
          kind: "plusOne",
          id: po.id,
          displayName: po.plusOneName ?? "Guest",
          parentName: r.member.telegramDisplayName,
          status: po.status,
          paymentStatus: po.paymentStatus,
          checkedInAt: po.checkedInAt,
          notes: po.notes,
          tags: po.tags,
        });
      }
    }
    return entries;
  }, [rsvps]);

  const filtered = useMemo(() => {
    if (!search.trim()) return flat;
    const q = search.toLowerCase();
    return flat.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        (e.kind === "primary" && e.username?.toLowerCase().includes(q)) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [flat, search]);

  const selected = useMemo(() => flat.find((e) => e.id === selectedId) ?? null, [flat, selectedId]);

  const surveyResp = selected?.kind === "primary"
    ? survey?.responses.find((r) => r.memberId === (rsvps.find((r) => r.rsvp.id === selected.id)?.member.id)) ?? undefined
    : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="lg:max-h-[70vh] lg:overflow-y-auto">
        <div className="sticky top-0 z-10 p-3" style={{ background: "var(--color-background)" }}>
          <input
            type="text"
            placeholder="Search name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl px-3 text-sm outline-none"
            style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
          />
        </div>
        <div className="grid gap-1 p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm" style={{ color: "var(--color-muted)" }}>No matches</p>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                  entry.id === selectedId ? "ring-1 ring-[var(--color-accent)]" : ""
                }`}
                style={{
                  background: entry.id === selectedId ? "var(--color-surface-hover)" : "transparent",
                  opacity: entry.status === "cancelled" ? 0.45 : 1,
                }}
              >
                <div className="flex items-center gap-2">
                  {entry.kind === "primary" ? (
                    <Avatar displayName={entry.displayName} photoUrl={entry.photoUrl} size="sm" />
                  ) : (
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ background: "var(--color-surface-hover)", color: "var(--color-muted)" }}
                    >
                      +1
                    </span>
                  )}
                  <span className="min-w-0 truncate text-sm font-medium">{entry.displayName}</span>
                  {entry.checkedInAt && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}>IN</span>
                  )}
                  {paymentRequired && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold" style={{
                      background: entry.paymentStatus === "paid" ? "var(--color-success-bg)"
                        : entry.paymentStatus === "waived" ? "var(--color-surface-hover)"
                        : "var(--color-warning-bg)",
                      color: entry.paymentStatus === "paid" ? "var(--color-success)"
                        : entry.paymentStatus === "waived" ? "var(--color-muted)"
                        : "var(--color-warning)",
                    }}>
                      {entry.paymentStatus === "paid" ? "Paid" : entry.paymentStatus === "waived" ? "Waived" : "Unpaid"}
                    </span>
                  )}
                  <StatusBadge status={entry.status} />
                </div>
                {(entry.kind === "plusOne" || (entry.tags ?? []).length > 0) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 pl-10">
                    {entry.kind === "plusOne" && (
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>Guest of {entry.parentName}</span>
                    )}
                    {(entry.tags ?? []).map((tag) => (
                      <span key={tag} className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--color-accent)", color: "var(--color-on-accent)", opacity: 0.85 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:max-h-[70vh] lg:overflow-y-auto">
        {selected ? (
          <DetailPanel
            entry={selected}
            eventId={eventId}
            paymentRequired={paymentRequired}
            survey={survey}
            surveyResp={surveyResp}
          />
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center p-8">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>Select a person to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPanel({
  entry,
  eventId,
  paymentRequired,
  survey,
  surveyResp,
}: {
  entry: FlatEntry;
  eventId: string;
  paymentRequired: boolean;
  survey: Props["survey"];
  surveyResp: { answersJson: unknown } | undefined;
}) {
  const returnTo = `/admin/events/${eventId}`;
  const [tagInput, setTagInput] = useState("");
  const [notesVal, setNotesVal] = useState(entry.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleNotesSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateRsvpNotesAction(fd);
    });
    setNotesDirty(false);
  }

  function handleAddTag(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tagInput.trim()) return;
    const fd = new FormData();
    fd.set("rsvpId", entry.id);
    fd.set("tag", tagInput.trim());
    fd.set("returnTo", returnTo);
    startTransition(async () => {
      await addRsvpTagAction(fd);
    });
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    const fd = new FormData();
    fd.set("rsvpId", entry.id);
    fd.set("tag", tag);
    fd.set("returnTo", returnTo);
    startTransition(async () => {
      await removeRsvpTagAction(fd);
    });
  }

  const answers = surveyResp
    ? (typeof surveyResp.answersJson === "object" && surveyResp.answersJson !== null
        ? surveyResp.answersJson as Record<string, unknown>
        : {})
    : null;

  return (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="text-lg font-semibold">{entry.displayName}</h3>
        {entry.kind === "primary" && entry.username && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>@{entry.username}</p>
        )}
        {entry.kind === "plusOne" && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>Guest of {entry.parentName}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={updateRsvpStatusAction}>
          <input type="hidden" name="rsvpId" value={entry.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <select
            name="status"
            defaultValue={entry.status}
            className="h-9 rounded-xl px-3 text-sm outline-none"
            style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
            onChange={(e) => {
              const fd = new FormData(e.currentTarget.form!);
              startTransition(async () => { await updateRsvpStatusAction(fd); });
            }}
            disabled={pending}
          >
            <option value="confirmed">Confirmed</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </form>

        {paymentRequired && (
          <form action={updateRsvpPaymentAction}>
            <input type="hidden" name="rsvpId" value={entry.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <select
              name="paymentStatus"
              defaultValue={entry.paymentStatus}
              className="h-9 rounded-xl px-3 text-sm outline-none"
              style={{
                background: entry.paymentStatus === "paid" ? "var(--color-success-bg)"
                  : entry.paymentStatus === "waived" ? "var(--color-surface-hover)"
                  : "var(--color-warning-bg)",
                border: "1px solid var(--color-surface-border)",
                color: entry.paymentStatus === "paid" ? "var(--color-success)"
                  : entry.paymentStatus === "waived" ? "var(--color-muted)"
                  : "var(--color-warning)",
              }}
              onChange={(e) => {
                const fd = new FormData(e.currentTarget.form!);
                startTransition(async () => { await updateRsvpPaymentAction(fd); });
              }}
              disabled={pending}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>
          </form>
        )}

        <form action={checkInRsvpAction}>
          <input type="hidden" name="rsvpId" value={entry.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="checkedIn" value={entry.checkedInAt ? "0" : "1"} />
          <button
            type="submit"
            className="h-9 rounded-xl px-4 text-sm font-semibold transition"
            style={{
              background: entry.checkedInAt ? "var(--color-success-bg)" : "var(--color-surface-hover)",
              color: entry.checkedInAt ? "var(--color-success)" : "var(--color-muted)",
              border: "1px solid var(--color-surface-border)",
            }}
          >
            {entry.checkedInAt ? "Checked in" : "Check in"}
          </button>
        </form>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Tags</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {(entry.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-0.5 opacity-60 hover:opacity-100"
                disabled={pending}
              >
                &times;
              </button>
            </span>
          ))}
          <form onSubmit={handleAddTag} className="inline-flex">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag..."
              className="h-7 w-24 rounded-lg px-2 text-xs outline-none"
              style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
            />
            <button
              type="submit"
              className="ml-1 h-7 rounded-lg px-2 text-xs font-semibold"
              style={{ color: "var(--color-accent)" }}
              disabled={pending || !tagInput.trim()}
            >
              Add
            </button>
          </form>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Notes</p>
        <form onSubmit={handleNotesSubmit}>
          <input type="hidden" name="rsvpId" value={entry.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <textarea
            name="notes"
            value={notesVal}
            onChange={(e) => { setNotesVal(e.target.value); setNotesDirty(true); }}
            rows={3}
            placeholder="Add a note..."
            className="w-full rounded-xl p-3 text-sm outline-none"
            style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
          />
          {notesDirty && (
            <button
              type="submit"
              className="mt-2 h-8 rounded-xl px-4 text-xs font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
              disabled={pending}
            >
              Save notes
            </button>
          )}
        </form>
      </div>

      {answers && survey && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Survey</p>
          <dl className="grid gap-2">
            {survey.schema.questions.map((q) => (
              <div key={q.id} className="rounded-xl p-3" style={{ background: "var(--color-surface-hover)" }}>
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                  {q.label}
                </dt>
                <dd className="mt-0.5 text-sm">
                  {formatAnswer(answers[q.id])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function formatAnswer(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val;
  return String(val);
}
