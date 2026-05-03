import Image from "next/image";
import { requireAdminMember } from "@/lib/session";
import { getSiteSettings } from "@/lib/settings";
import { updateSiteSettingsAction } from "@/lib/settings-actions";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/badge";
import LogoUpload from "./logo-upload";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const member = await requireAdminMember();
  const settings = await getSiteSettings();
  const brand = { siteName: settings.siteName, logoUrl: settings.logoUrl };

  return (
    <>
      <Navbar
        member={{
          telegramDisplayName: member.telegramDisplayName,
          telegramPhotoUrl: member.telegramPhotoUrl,
          isAdmin: member.isAdmin,
        }}
        brand={brand}
      />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-8">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          Customize the branding and appearance of your community site.
        </p>

        <form action={updateSiteSettingsAction} className="mt-8 grid gap-8">
          <section className="glass-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Identity</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              Shown in the navbar, page titles, and meta tags.
            </p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Site name</span>
                <input
                  name="siteName"
                  defaultValue={settings.siteName}
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Tagline</span>
                <input
                  name="tagline"
                  defaultValue={settings.tagline}
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Footer text</span>
                <input
                  name="footerText"
                  defaultValue={settings.footerText}
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                />
              </label>
            </div>
          </section>

          <section className="glass-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Logo</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              Upload a logo to replace the default letter in the navbar. PNG, JPEG, WebP, or SVG under 2 MB.
            </p>
            <div className="mt-5">
              {settings.logoUrl ? (
                <div className="flex items-center gap-4">
                  <Image
                    src={settings.logoUrl}
                    alt="Site logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <Badge>Current logo</Badge>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  No logo uploaded. The default letter will be used.
                </p>
              )}
              <LogoUpload currentLogoUrl={settings.logoUrl} />
            </div>
          </section>

          <section className="glass-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Colors</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              The accent color is used for buttons, badges, and links. The highlight color is used for labels and decorative dots.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Accent (light)</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue={settings.accentColor}
                    className="h-10 w-14 cursor-pointer rounded-xl border-0 p-1"
                  />
                  <input
                    name="accentColorText"
                    value={settings.accentColor}
                    readOnly
                    className="h-10 rounded-xl px-3 text-sm font-mono outline-none"
                    style={{
                      background: "var(--color-surface-hover)",
                      border: "1px solid var(--color-surface-border)",
                      color: "var(--color-foreground)",
                      width: "7rem",
                    }}
                  />
                </div>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Accent (dark)</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="accentColorDark"
                    defaultValue={settings.accentColorDark}
                    className="h-10 w-14 cursor-pointer rounded-xl border-0 p-1"
                  />
                  <input
                    name="accentColorDarkText"
                    value={settings.accentColorDark}
                    readOnly
                    className="h-10 rounded-xl px-3 text-sm font-mono outline-none"
                    style={{
                      background: "var(--color-surface-hover)",
                      border: "1px solid var(--color-surface-border)",
                      color: "var(--color-foreground)",
                      width: "7rem",
                    }}
                  />
                </div>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Highlight</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="highlightColor"
                    defaultValue={settings.highlightColor}
                    className="h-10 w-14 cursor-pointer rounded-xl border-0 p-1"
                  />
                  <input
                    name="highlightColorText"
                    value={settings.highlightColor}
                    readOnly
                    className="h-10 rounded-xl px-3 text-sm font-mono outline-none"
                    style={{
                      background: "var(--color-surface-hover)",
                      border: "1px solid var(--color-surface-border)",
                      color: "var(--color-foreground)",
                      width: "7rem",
                    }}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="glass-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Landing page</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              The headline and body text shown on the homepage.
            </p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Hero title</span>
                <textarea
                  name="heroTitle"
                  defaultValue={settings.heroTitle}
                  rows={2}
                  className="rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Hero body</span>
                <textarea
                  name="heroBody"
                  defaultValue={settings.heroBody}
                  rows={3}
                  className="rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                />
              </label>
            </div>
          </section>

          <button
            type="submit"
            className="h-12 rounded-xl px-8 text-sm font-semibold transition"
            style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
          >
            Save settings
          </button>
        </form>
      </main>
    </>
  );
}
