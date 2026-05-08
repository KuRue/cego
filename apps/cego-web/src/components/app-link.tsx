"use client";

import Link from "next/link";
import { useCallback, useRef, useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedStatus = false;

function readMiniAppStatus(): boolean {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
}

function refreshStatus(): void {
  const current = readMiniAppStatus();
  if (cachedStatus !== current) {
    cachedStatus = current;
    for (const l of listeners) l();
  }
}

function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") {
    queueMicrotask(refreshStatus);
  }
  return () => { listeners.delete(cb); };
}

function getSnapshot(): boolean {
  return cachedStatus;
}

function getServerSnapshot(): boolean {
  return false;
}

export default function AppLink({
  href,
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  const isMiniApp = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
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

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__cegoMiniAppReady = () => {
    refreshStatus();
  };
}
