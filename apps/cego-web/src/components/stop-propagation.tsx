"use client";

import { type ReactNode } from "react";

export default function StopPropagation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </span>
  );
}
