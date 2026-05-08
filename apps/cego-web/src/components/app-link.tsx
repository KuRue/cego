"use client";

import Link from "next/link";
import { useCallback, useRef, useSyncExternalStore } from "react";

export default function AppLink({
  href,
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  const isMiniApp = useSyncExternalStore(
    subscribeMiniAppStatus,
    getMiniAppStatus,
    getServerMiniAppStatus,
  );
  const navigated = useRef(false);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e as unknown as React.MouseEvent<HTMLAnchorElement>);
      if (e.defaultPrevented) return;
      if (navigated.current) return;
      navigated.current = true;

      const url = href.toString();
      window.location.replace(url);
    },
    [href, onClick],
  );

  if (isMiniApp) {
    const buttonProps = { ...(props as Record<string, unknown>) };
    const className = buttonProps.className as string | undefined;
    const style = buttonProps.style as React.CSSProperties | undefined;
    delete buttonProps.className;
    delete buttonProps.style;
    delete buttonProps.prefetch;
    delete buttonProps.replace;
    delete buttonProps.scroll;
    delete buttonProps.onMouseEnter;
    delete buttonProps.onTouchStart;

    return (
      <button
        type="button"
        onClick={handleClick}
        className={className}
        style={style}
        {...buttonProps}
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

function subscribeMiniAppStatus() {
  return () => {};
}

function getMiniAppStatus() {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
}

function getServerMiniAppStatus() {
  return false;
}
