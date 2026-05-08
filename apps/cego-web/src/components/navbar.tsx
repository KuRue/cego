"use client";

import Image from "next/image";
import AppLink from "@/components/app-link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  showQrCheckIn?: boolean;
}

export default function Navbar({ member, brand, showQrCheckIn }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const siteName = brand?.siteName || "cego";
  const logoUrl = brand?.logoUrl;

  // The tall, narrow Mini App layout only makes sense when Telegram has hidden
  // its own header bar (fullscreen mode, Bot API 8.0+). Otherwise the page sits
  // BELOW the bot-name bar and should use the same browser-style navbar.
  const useFullscreenMiniAppNav = isMiniApp && isFullscreen;

  useEffect(() => {
    const sync = () => {
      const wa = window.Telegram?.WebApp;
      setIsMiniApp(!!wa?.initData);
      setIsFullscreen(!!wa?.isFullscreen);
      setMounted(true);
    };
    sync();
    window.addEventListener("cego:miniapp-ready", sync);
    return () => window.removeEventListener("cego:miniapp-ready", sync);
  }, []);

  // React to the user (or our own code) toggling fullscreen at runtime.
  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (!wa?.onEvent) return;
    const sync = () => setIsFullscreen(!!wa.isFullscreen);
    wa.onEvent("fullscreenChanged", sync);
    return () => wa.offEvent?.("fullscreenChanged", sync);
  }, []);

  useEffect(() => {
    if (menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 16,
        right: useFullscreenMiniAppNav ? 16 : window.innerWidth - rect.right,
      });
    }
  }, [menuOpen, useFullscreenMiniAppNav]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
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

  const dropdown = menuOpen && mounted ? createPortal(
    <div
      ref={menuRef}
      className="glass-lg fixed min-w-48 overflow-hidden rounded-xl py-1"
      style={{ top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
      role="menu"
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-surface-border)" }}>
        <p className="text-sm font-semibold">{member?.telegramDisplayName}</p>
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
        {member?.isAdmin ? (
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
            {showQrCheckIn ? (
              <AppLink
                href="/admin/check-in"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm transition"
                style={{ color: "var(--color-foreground)" }}
                role="menuitem"
              >
                QR Check-in
              </AppLink>
            ) : null}
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <header className="glass sticky top-0 z-50">
        <nav className={`mx-auto flex items-center px-5 ${useFullscreenMiniAppNav ? "max-w-[200px] justify-between pt-10 pb-1" : "max-w-6xl py-3"}`}>
          <AppLink href={member ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0">
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
          </AppLink>

          <span className="font-title text-lg tracking-wide absolute left-1/2 -translate-x-1/2">
            {siteName}
          </span>

          <div className="flex-1" />

          {member ? (
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full p-0.5 transition shrink-0"
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
          ) : (
            <AppLink
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-medium transition shrink-0"
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
      {dropdown}
    </>
  );
}


