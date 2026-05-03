"use client";

import { useState } from "react";

export default function EventTypeEditor({ types: initial }: { types: string[] }) {
  const [types, setTypes] = useState<string[]>(initial);
  const [newType, setNewType] = useState("");

  function addType() {
    const trimmed = newType.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!trimmed || types.includes(trimmed)) return;
    setTypes([...types, trimmed]);
    setNewType("");
    syncHidden(types);
  }

  function removeType(index: number) {
    const next = types.filter((_, i) => i !== index);
    setTypes(next);
    syncHidden(next);
  }

  function syncHidden(updated: string[]) {
    const hiddenInput = document.querySelector<HTMLInputElement>('input[name="eventTypes"]');
    if (hiddenInput) {
      hiddenInput.setAttribute("value", JSON.stringify(updated));
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {types.map((t, i) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}
          >
            {t}
            <button
              type="button"
              onClick={() => removeType(i)}
              className="ml-1 opacity-50 hover:opacity-100"
              aria-label={`Remove ${t}`}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addType(); } }}
          placeholder="new_type_name"
          className="form-input h-9 flex-1"
        />
        <button
          type="button"
          onClick={addType}
          className="h-9 rounded-xl px-4 text-sm font-medium transition"
          style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
        >
          Add
        </button>
      </div>
      <input type="hidden" name="eventTypes" defaultValue={JSON.stringify(types)} />
    </div>
  );
}
