import Image from "next/image";
import { requireAdminMember } from "@/lib/session";
import { getSiteSettings, type BrandSettings } from "@/lib/settings";
import { updateSiteSettingsAction } from "@/lib/settings-actions";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/badge";
import { getNavbarBrand } from "@/lib/settings";
import LogoUpload from "./logo-upload";
import BackgroundUpload from "./background-upload";
import EventTypeEditor from "./event-type-editor";

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
          Branding, colors, and homepage content.
        </p>

        <form action={updateSiteSettingsAction} className="mt-8 grid gap-6">
          <input type="hidden" name="returnTo" value="/admin/settings" />

          <section className="glass-lg rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Identity</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Field label="Site name">
                <input name="siteName" defaultValue={settings.siteName} className="form-input" />
              </Field>
              <Field label="Tagline">
                <input name="tagline" defaultValue={settings.tagline} className="form-input" />
              </Field>
              <Field label="Footer text">
                <input name="footerText" defaultValue={settings.footerText} className="form-input" />
              </Field>
            </div>
          </section>

          <section className="glass-lg rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Logo</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              PNG, JPEG, WebP, or SVG under 2 MB.
            </p>
            <div className="mt-4">
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
                  No logo uploaded. The default letter is used.
                </p>
              )}
              <LogoUpload currentLogoUrl={settings.logoUrl} />
              <input type="hidden" name="logoUrl" defaultValue={settings.logoUrl ?? ""} />
            </div>
          </section>

          <section className="glass-lg rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Background image</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              PNG, JPEG, or WebP under 5 MB. Shown behind all glass panels.
            </p>
            <div className="mt-4">
              {settings.backgroundUrl ? (
                <div className="flex items-center gap-4">
                  <Image
                    src={settings.backgroundUrl}
                    alt="Background preview"
                    width={160}
                    height={90}
                    className="h-20 w-36 rounded-lg object-cover"
                    style={{ border: "1px solid var(--color-surface-border)" }}
                  />
                  <Badge>Active background</Badge>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  No background uploaded. Default decorations are used.
                </p>
              )}
              <BackgroundUpload currentUrl={settings.backgroundUrl} />
            </div>
            <input type="hidden" name="backgroundUrl" defaultValue={settings.backgroundUrl ?? ""} />
          </section>

          <section className="glass-lg rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Event types</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              Custom templates for organizing events. Not shown to members.
            </p>
            <EventTypeEditor types={settings.eventTypes} />
          </section>

          <section className="glass-lg rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Colors</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Accent (light)">
                <input
                  type="color"
                  name="accentColor"
                  defaultValue={settings.accentColor}
                  className="h-10 w-16 cursor-pointer rounded-xl border-0 p-1"
                />
              </Field>
              <Field label="Accent (dark)">
                <input
                  type="color"
                  name="accentColorDark"
                  defaultValue={settings.accentColorDark}
                  className="h-10 w-16 cursor-pointer rounded-xl border-0 p-1"
                />
              </Field>
              <Field label="Highlight">
                <input
                  type="color"
                  name="highlightColor"
                  defaultValue={settings.highlightColor}
                  className="h-10 w-16 cursor-pointer rounded-xl border-0 p-1"
                />
              </Field>
            </div>
          </section>

          <section className="glass-lg rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Homepage</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Hero title">
                <textarea
                  name="heroTitle"
                  defaultValue={settings.heroTitle}
                  rows={2}
                  className="form-textarea"
                />
              </Field>
              <Field label="Hero body">
                <textarea
                  name="heroBody"
                  defaultValue={settings.heroBody}
                  rows={3}
                  className="form-textarea"
                />
              </Field>
            </div>
          </section>

          <button
            type="submit"
            className="h-11 rounded-xl px-6 text-sm font-semibold transition sm:w-fit"
            style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
          >
            Save settings
          </button>
        </form>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
