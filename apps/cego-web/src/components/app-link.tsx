"use client";

import Link from "next/link";
import { type AnchorHTMLAttributes, useState, useEffect } from "react";

export default function AppLink({
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    setIsMiniApp(!!window.Telegram?.WebApp?.initData);
  }, []);

  if (isMiniApp) {
    const {
      prefetch,
      replace,
      scroll,
      onClick,
      onMouseEnter,
      onTouchStart,
      ...anchorProps
    } = props;
    return (
      <a
        href={href.toString()}
        {...(anchorProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
