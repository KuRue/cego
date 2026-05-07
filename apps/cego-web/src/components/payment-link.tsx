"use client";

export default function PaymentLink({
  href,
  label,
  displayName,
}: {
  href: string;
  label: string;
  displayName: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
      style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      onClick={(e) => {
        if (
          !confirm(
            `When sending payment, write "Payment for ${displayName}" in the notes to speed up confirmation.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </a>
  );
}
