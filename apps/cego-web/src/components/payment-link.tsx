"use client";

import { useConfirm } from "@/components/confirm-provider";

export default function PaymentLink({
  href,
  label,
  displayName,
}: {
  href: string;
  label: string;
  displayName: string;
}) {
  const confirm = useConfirm();

  return (
    <button
      type="button"
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
      style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      onClick={async () => {
        const ok = await confirm(
          `Write "vacation reimbursement for ${displayName}" in the notes to speed up confirmation.`
        );
        if (ok) {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      }}
    >
      {label}
    </button>
  );
}
