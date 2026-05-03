interface AvatarProps {
  displayName: string;
  photoUrl: string | null;
  size?: "sm" | "lg";
}

export default function Avatar({
  displayName,
  photoUrl,
  size = "sm",
}: AvatarProps) {
  const sizeClass = size === "lg" ? "h-[72px] w-[72px] text-2xl" : "h-8 w-8 text-xs";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  if (photoUrl) {
    return (
      <span
        aria-label={displayName}
        className={`block shrink-0 rounded-full bg-cover bg-center ${sizeClass}`}
        role="img"
        style={{
          backgroundImage: `url(${JSON.stringify(photoUrl)})`,
          border: `${size === "lg" ? 3 : 2}px solid var(--color-surface-border)`,
        }}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${sizeClass}`}
      style={{
        background: "var(--color-surface-hover)",
        color: "var(--color-foreground)",
        border: `${size === "lg" ? 3 : 2}px solid var(--color-surface-border)`,
      }}
    >
      {initial}
    </span>
  );
}
