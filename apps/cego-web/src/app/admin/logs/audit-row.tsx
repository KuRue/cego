"use client";

import { useState } from "react";
import Avatar from "@/components/avatar";

export default function AuditRow({
  label,
  time,
  memberName,
  memberPhoto,
  memberUsername,
  eventTitle,
  detail,
  actorName,
  actorPhoto,
  actorUsername,
  isAdminAction,
  logId,
  eventId,
  memberId,
  actorId,
}: {
  label: string;
  time: string;
  memberName: string | null;
  memberPhoto: string | null;
  memberUsername: string | null;
  eventTitle: string | null;
  detail: string | null;
  actorName?: string;
  actorPhoto?: string | null;
  actorUsername?: string | null;
  isAdminAction: boolean;
  logId: string;
  eventId?: string;
  memberId?: string;
  actorId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="glass w-full cursor-pointer rounded-xl px-4 py-3 text-left transition"
      style={isAdminAction ? { borderLeft: "3px solid var(--color-accent)" } : undefined}
    >
      <div className="flex items-center gap-3">
        <Avatar
          displayName={memberName ?? "Unknown"}
          photoUrl={memberPhoto}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold">{label}</span>
            {isAdminAction ? (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
              >
                Admin
              </span>
            ) : null}
            {memberName ? (
              <span className="text-sm truncate" style={{ color: "var(--color-muted)" }}>
                {memberUsername ? `@${memberUsername}` : memberName}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
            <span>{time}</span>
            {eventTitle ? (
              <>
                <span>&middot;</span>
                <span className="truncate">{eventTitle}</span>
              </>
            ) : null}
            {actorName ? (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  by
                  {actorPhoto ? (
                    <span
                      className="inline-block h-4 w-4 rounded-full bg-cover bg-center"
                      role="img"
                      style={{ backgroundImage: `url(${JSON.stringify(actorPhoto)})` }}
                    />
                  ) : null}
                  {actorUsername ? `@${actorUsername}` : actorName}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <span
          className="shrink-0 text-xs transition-transform"
          style={{
            color: "var(--color-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>

      {open ? (
        <div
          className="mt-3 grid gap-2 rounded-lg p-3 text-xs"
          style={{ background: "var(--color-surface-hover)" }}
        >
          {memberName ? (
            <DetailRow k="Member" v={`${memberName}${memberUsername ? ` (@${memberUsername})` : ""}`} />
          ) : null}
          {eventTitle ? <DetailRow k="Event" v={eventTitle} /> : null}
          {detail ? <DetailRow k="Detail" v={detail} /> : null}
          {actorName ? (
            <DetailRow k="Actor" v={`${actorName}${actorUsername ? ` (@${actorUsername})` : ""}`} />
          ) : null}
          <DetailRow k="Log ID" v={logId} mono />
          {eventId ? <DetailRow k="Event ID" v={eventId} mono /> : null}
          {memberId ? <DetailRow k="Member ID" v={memberId} mono /> : null}
          {actorId ? <DetailRow k="Actor ID" v={actorId} mono /> : null}
          <DetailRow k="Time" v={time} />
        </div>
      ) : null}
    </button>
  );
}

function DetailRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 w-20 uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {k}
      </span>
      <span className={mono ? "font-mono break-all" : "break-words"} style={{ color: "var(--color-foreground)" }}>
        {v}
      </span>
    </div>
  );
}
