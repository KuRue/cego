"use client";

import { useState } from "react";

interface SurveyQuestion {
  id: string;
  label: string;
  required: boolean;
  type: "text" | "select";
  options?: string[];
}

export default function SurveyResponseEditor({
  surveyId,
  eventId: _eventId,
  questions,
  existingAnswers,
  action,
  returnTo,
}: {
  surveyId: string;
  eventId: string;
  questions: SurveyQuestion[];
  existingAnswers: Record<string, string>;
  action: (formData: FormData) => Promise<void>;
  returnTo?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div>
        <div className="mt-3 grid gap-3">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl p-3 text-sm" style={{ background: "var(--color-surface-hover)" }}>
              <p className="text-xs uppercase tracking-[0.12em] font-semibold" style={{ color: "var(--color-muted)" }}>
                {q.label}
              </p>
              <p className="mt-1.5 font-medium">
                {existingAnswers[q.id] || <span style={{ color: "var(--color-muted)" }}>No answer</span>}
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 h-9 rounded-xl px-4 text-sm font-semibold transition"
          style={{
            background: "var(--color-surface-hover)",
            border: "1px solid var(--color-surface-border)",
            color: "var(--color-foreground)",
          }}
        >
          Edit responses
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="surveyId" value={surveyId} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {questions.map((q) => (
        <label key={q.id} className="grid gap-1.5 text-sm">
          <span className="font-medium">
            {q.label}
            {q.required ? <span style={{ color: "var(--color-danger)" }}> *</span> : null}
          </span>
          {q.type === "select" && q.options ? (
            <select
              name={`answer:${q.id}`}
              required={q.required}
              defaultValue={existingAnswers[q.id] ?? ""}
              className="h-10 rounded-xl px-4 text-sm outline-none"
              style={{
                background: "var(--color-surface-hover)",
                border: "1px solid var(--color-surface-border)",
                color: "var(--color-foreground)",
              }}
            >
              <option value="">Select...</option>
              {q.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <textarea
              name={`answer:${q.id}`}
              required={q.required}
              defaultValue={existingAnswers[q.id] ?? ""}
              rows={2}
              className="min-h-16 rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: "var(--color-surface-hover)",
                border: "1px solid var(--color-surface-border)",
                color: "var(--color-foreground)",
              }}
            />
          )}
        </label>
      ))}
      <div className="flex gap-2">
        <button
          type="submit"
          className="h-9 rounded-xl px-4 text-sm font-semibold transition"
          style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-9 rounded-xl px-4 text-sm font-semibold transition"
          style={{
            background: "var(--color-surface-hover)",
            border: "1px solid var(--color-surface-border)",
            color: "var(--color-foreground)",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
