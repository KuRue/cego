"use client";

import Link from "next/link";
import { type MouseEventHandler, useCallback } from "react";

export default function AppLink({
  href,
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  const handleClick = useCallback<MouseEventHandler<HTMLAnchorElement>>(
    (e) => {
      if (
        typeof window !== "undefined" &&
        window.Telegram?.WebApp?.initData
      ) {
        e.preventDefault();
        window.location.href = href.toString();
      }

      onClick?.(e);
    },
    [href, onClick],
  );

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
