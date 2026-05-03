import Image from "next/image";
import { requireCurrentMember } from "@/lib/session";
import { getNavbarBrand } from "@/lib/settings";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const member = await requireCurrentMember();
  const brand = await getNavbarBrand();

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
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-8">
        <h1 className="text-3xl font-semibold">Profile</h1>

        <div className="glass-lg mt-8 rounded-2xl p-6">
          <div className="flex items-center gap-5">
            {member.telegramPhotoUrl ? (
              <Image
                src={member.telegramPhotoUrl}
                alt={member.telegramDisplayName}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-full object-cover"
                style={{ border: "3px solid var(--color-surface-border)" }}
              />
            ) : (
              <span
                className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full text-2xl font-bold"
                style={{
                  background: "var(--color-surface-hover)",
                  color: "var(--color-foreground)",
                  border: "3px solid var(--color-surface-border)",
                }}
              >
                {member.telegramDisplayName.charAt(0).toUpperCase()}
              </span>
            )}
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
      </main>
    </>
  );
}
