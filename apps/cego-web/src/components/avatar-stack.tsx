import Image from "next/image";

interface AvatarStackProps {
  members: Array<{
    telegramDisplayName: string;
    telegramPhotoUrl: string | null;
  }>;
  max?: number;
}

export default function AvatarStack({ members, max = 8 }: AvatarStackProps) {
  if (members.length === 0) return null;

  const shown = members.slice(0, max);
  const remaining = members.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((m, i) =>
          m.telegramPhotoUrl ? (
            <Image
              key={i}
              src={m.telegramPhotoUrl}
              alt={m.telegramDisplayName}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
              style={{ border: "2px solid var(--color-background)" }}
            />
          ) : (
            <span
              key={i}
              className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold"
              style={{
                background: "var(--color-surface-hover)",
                border: "2px solid var(--color-background)",
                color: "var(--color-muted)",
              }}
            >
              {m.telegramDisplayName.charAt(0).toUpperCase()}
            </span>
          ),
        )}
      </div>
      {remaining > 0 ? (
        <span className="ml-2 text-xs" style={{ color: "var(--color-muted)" }}>
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}
