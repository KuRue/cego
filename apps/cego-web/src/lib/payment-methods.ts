export type PaymentMethodType = "venmo" | "paypal" | "cashapp" | "zelle" | "revolut" | "other";

export interface PaymentMethod {
  type: PaymentMethodType;
  handle: string;
  label?: string;
}

export const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "venmo", label: "Venmo" },
  { value: "paypal", label: "PayPal" },
  { value: "cashapp", label: "Cash App" },
  { value: "zelle", label: "Zelle" },
  { value: "revolut", label: "Revolut" },
  { value: "other", label: "Other" },
];

export function getPaymentMethodLabel(type: PaymentMethodType): string {
  return PAYMENT_METHOD_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function parsePaymentMethods(raw: string | null): PaymentMethod[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: unknown) =>
        typeof m === "object" && m !== null && typeof (m as PaymentMethod).type === "string" && typeof (m as PaymentMethod).handle === "string",
    );
  } catch {
    if (raw.trim()) {
      return [{ type: "other", handle: raw.trim() }];
    }
    return [];
  }
}

export function serializePaymentMethods(methods: PaymentMethod[]): string {
  return JSON.stringify(methods);
}

export function getPaymentMethodUrl(method: PaymentMethod, amountCents: number | null): string | null {
  const handle = method.handle.replace(/^@/, "").replace(/^\$/, "");
  const dollars = amountCents !== null ? (amountCents / 100).toFixed(2) : null;

  switch (method.type) {
    case "venmo":
      return `https://venmo.com/u/${encodeURIComponent(handle)}${dollars ? `?txn=pay&amount=${encodeURIComponent(dollars)}` : ""}`;
    case "paypal":
      return `https://paypal.me/${encodeURIComponent(handle)}${dollars ? `/${dollars}` : ""}`;
    case "cashapp":
      return `https://cash.app/${encodeURIComponent(handle)}${dollars ? `/${dollars}` : ""}`;
    case "revolut":
      return `https://revolut.me/${encodeURIComponent(handle)}${dollars ? `/${dollars}` : ""}`;
    default:
      return null;
  }
}

export function getPaymentMethodDisplay(method: PaymentMethod): string {
  const label = method.label || getPaymentMethodLabel(method.type);
  return `${label}: ${method.handle}`;
}
