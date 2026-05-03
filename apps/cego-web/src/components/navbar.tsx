"use client";

import Image from "next/image";
import AppLink from "@/components/app-link";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/avatar";

interface NavbarProps {
  member?: {
    telegramDisplayName: string;
    telegramPhotoUrl: string | null;
    isAdmin: boolean;
  } | null;
  brand?: {
    siteName: string;
    logoUrl: string | null;
  } | null;
}

export default function Navbar({ member, brand }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMiniApp = typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
  const siteName = brand?.siteName || "cego";
  const logoUrl = brand?.logoUrl;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <header
      className="glass sticky top-0 z-50"
      style={isMiniApp ? { paddingTop: "max(env(safe-area-inset-top, 0px), 48px)" } : undefined}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <AppLink href="/" className="flex items-center gap-2">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span
              className="grid h-8 w-8 place-items-center rounded-lg font-bold"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              {siteName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-sm font-semibold tracking-wide">
            {siteName}
          </span>
        </AppLink>

        {member ? (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 sm:flex">
              <NavItem href="/dashboard">Dashboard</NavItem>
              {member.isAdmin ? <NavItem href="/admin">Admin</NavItem> : null}
            </div>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full p-0.5 transition"
                style={{ background: menuOpen ? "var(--color-surface-hover)" : "transparent" }}
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <Avatar
                  displayName={member.telegramDisplayName}
                  photoUrl={member.telegramPhotoUrl}
                />
              </button>

              {menuOpen && (
                <div
                  className="glass-lg absolute right-0 mt-2 min-w-48 overflow-hidden rounded-xl py-1"
                  role="menu"
                >
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-surface-border)" }}>
                    <p className="text-sm font-semibold">{member.telegramDisplayName}</p>
                  </div>
                  <div className="py-1">
                  <AppLink
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm transition"
                    style={{ color: "var(--color-foreground)" }}
                    role="menuitem"
                  >
                    Profile
                  </AppLink>
                  {member.isAdmin ? (
                    <>
                      <AppLink
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm transition"
                        style={{ color: "var(--color-foreground)" }}
                        role="menuitem"
                      >
                        Admin Dashboard
                      </AppLink>
                      <AppLink
                        href="/admin/settings"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm transition"
                        style={{ color: "var(--color-foreground)" }}
                        role="menuitem"
                      >
                        Settings
                      </AppLink>
                    </>
                  ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <AppLink
            href="/sign-in"
            className="rounded-lg px-4 py-2 text-sm font-medium transition"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-on-accent)",
            }}
          >
            Sign in
          </AppLink>
        )}
      </nav>
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <AppLink
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-semibold transition"
      style={{ color: "var(--color-foreground)" }}
    >
      {children}
    </AppLink>
  );
}

function miniAppNavigate(href: string) {
  return (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
      e.preventDefault();
      window.location.href = href;
    }
  };
}
