import AppLink from "@/components/app-link";
import Avatar from "@/components/avatar";
import { getCurrentMember } from "@/lib/session";
import { getNavbarBrand } from "@/lib/settings";
import Navbar from "@/components/navbar";
import SignOutButton from "./sign-out-button";
import NotifyPrefsForm from "./notify-prefs-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const member = await getCurrentMember();
  const brand = await getNavbarBrand();

  if (!member) {
    return (
      <>
        <Navbar brand={brand} />
        <main className="page-shell mx-auto max-w-2xl px-5 py-16">
          <div className="glass-lg rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Sign in to view your profile</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              cego profiles are connected to Telegram sessions.
            </p>
            <AppLink
              href="/sign-in"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Sign in with Telegram
            </AppLink>
          </div>
        </main>
      </>
    );
  }

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
      <main className="page-shell mx-auto max-w-2xl px-5 pb-16 pt-8">
        <h1 className="text-3xl font-semibold">Profile</h1>

        <div className="glass-lg mt-8 rounded-2xl p-6">
          <div className="flex items-center gap-5">
            <Avatar
              displayName={member.telegramDisplayName}
              photoUrl={member.telegramPhotoUrl}
              size="lg"
            />
            <div>
              <p className="text-xl font-semibold">{member.telegramDisplayName}</p>
              {member.telegramUsername && (
                <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                  @{member.telegramUsername}
                </p>
              )}
            </div>
          </div>

          <div
            className="mt-6 grid gap-4"
            style={{ borderTop: "1px solid var(--color-surface-border)", paddingTop: "1.5rem" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                Telegram ID
              </span>
              <span className="font-mono text-sm">{member.telegramId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                Role
              </span>
              <span className="text-sm font-medium">
                {member.isAdmin ? "Admin" : "Member"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                Group status
              </span>
              <span className="text-sm font-medium">{member.groupStatus}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                Joined
              </span>
              <span className="text-sm">
                {member.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-lg mt-6 rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            Choose which updates you receive via Telegram.
          </p>
          <div className="mt-4">
            <NotifyPrefsForm
              rsvpUpdates={member.notifyPrefs?.rsvpUpdates ?? true}
              newEvents={member.notifyPrefs?.newEvents ?? true}
            />
          </div>
        </div>

        <SignOutButton />
      </main>
    </>
  );
}
