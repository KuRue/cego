"use client";

import Link from "next/link";
import { type AnchorHTMLAttributes, useCallback, useState, useEffect, useRef } from "react";

export default function AppLink({
  href,
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    setIsMiniApp(!!window.Telegram?.WebApp?.initData);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (navigated.current) return;
      navigated.current = true;

      const url = href.toString();
      window.location.replace(url);
    },
    [href],
  );

  if (isMiniApp) {
    const {
      prefetch,
      replace,
      scroll,
      onMouseEnter,
      onTouchStart,
      className,
      style,
      ...rest
    } = props;

    return (
      <button
        type="button"
        onClick={handleClick}
        className={className as string | undefined}
        style={style as React.CSSProperties | undefined}
        {...(rest as Record<string, unknown>)}
      >
        {children}
      </button>
    );
  }

  return (
    <Link href={href} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}
