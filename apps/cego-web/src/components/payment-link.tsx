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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
      style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      onClick={async (e) => {
        const ok = await confirm(
          `When sending payment, write "Payment for ${displayName}" in the notes to speed up confirmation.`
        );
        if (!ok) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </a>
  );
}
