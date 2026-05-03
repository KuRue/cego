"use client";

import Link from "next/link";

export default function AppLink({
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
