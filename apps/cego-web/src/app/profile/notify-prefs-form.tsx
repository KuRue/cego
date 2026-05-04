"use client";

import { useTransition } from "react";

export default function NotifyPrefsForm({
  rsvpUpdates,
  newEvents,
}: {
  rsvpUpdates: boolean;
  newEvents: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const { updateNotifyPrefsAction } = await import("@/lib/notify-prefs-actions");
      await updateNotifyPrefsAction(formData);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <ToggleField
        name="rsvpUpdates"
        label="RSVP updates"
        description="Get notified when your RSVP status changes or payment is confirmed"
        defaultChecked={rsvpUpdates}
        disabled={pending}
      />
      <ToggleField
        name="newEvents"
        label="New events"
        description="Get notified when a new event is published"
        defaultChecked={newEvents}
        disabled={pending}
      />
      <button
        type="submit"
        className="mt-2 h-10 rounded-xl px-5 text-sm font-semibold transition"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-on-accent)",
          opacity: pending ? 0.5 : 1,
        }}
      >
        {pending ? "Saving..." : "Save preferences"}
      </button>
    </form>
  );
}

function ToggleField({
  name,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
      />
      <div>
        <span className="text-sm font-medium">{label}</span>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
          {description}
        </p>
      </div>
    </label>
  );
}
