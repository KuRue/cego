export function GlassCard({
  children,
  className = "",
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`glass-lg rounded-2xl ${hover ? "glass-hover transition" : ""} ${className}`}>
      {children}
    </div>
  );
}
