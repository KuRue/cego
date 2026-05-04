"use client";

import { useState } from "react";
import {
  type PaymentMethod,
  type PaymentMethodType,
  PAYMENT_METHOD_TYPES,
  parsePaymentMethods,
  serializePaymentMethods,
  getPaymentMethodLabel,
} from "@/lib/payment-methods";

export default function PaymentMethodsEditor({ name, defaultValue }: { name: string; defaultValue: string | null }) {
  const [methods, setMethods] = useState<PaymentMethod[]>(() => parsePaymentMethods(defaultValue));
  const [newType, setNewType] = useState<PaymentMethodType>("venmo");
  const [newHandle, setNewHandle] = useState("");

  function add() {
    if (!newHandle.trim()) return;
    const updated = [...methods, { type: newType, handle: newHandle.trim() }];
    setMethods(updated);
    setNewHandle("");
  }

  function remove(idx: number) {
    setMethods(methods.filter((_, i) => i !== idx));
  }

  return (
    <div className="min-w-0">
      <input type="hidden" name={name} value={methods.length > 0 ? serializePaymentMethods(methods) : ""} />
      {methods.length > 0 && (
        <div className="grid gap-2">
          {methods.map((m, i) => (
            <div key={i} className="flex min-w-0 items-center gap-2 rounded-lg p-2" style={{ background: "var(--color-surface-hover)" }}>
              <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>{getPaymentMethodLabel(m.type)}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{m.handle}</span>
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-xs" style={{ color: "var(--color-danger)" }}>&times;</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex min-w-0 items-center gap-2">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as PaymentMethodType)}
          className="h-9 rounded-lg px-2 text-sm outline-none"
          style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
        >
          {PAYMENT_METHOD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={newHandle}
          onChange={(e) => setNewHandle(e.target.value)}
          placeholder="@username or email"
          className="h-9 min-w-0 flex-1 rounded-lg px-3 text-sm outline-none"
          style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="h-9 shrink-0 rounded-lg px-3 text-sm font-semibold"
          style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
          disabled={!newHandle.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
