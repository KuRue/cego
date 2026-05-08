"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  and,
  eq,
  getDb,
  memberNotes,
  members,
  memberTagAssignments,
  memberTags,
} from "@cego/db";
import { audit } from "@/lib/audit";
import { requireAdminMember } from "@/lib/session";

const tagColors = ["gray", "green", "gold", "red", "blue"] as const;

export async function updateMemberEmailAction(formData: FormData) {
  const admin = await requireAdminMember();
  const memberId = readText(formData, "memberId");

  if (!memberId) {
    redirect("/admin/members");
  }

  const db = getDb();
  await db
    .update(members)
    .set({
      email: normalizeEmail(readText(formData, "email")),
      updatedAt: new Date(),
    })
    .where(eq(members.id, memberId));

  audit({
    memberId,
    actorId: admin.id,
    action: "member_email_updated",
  }).catch(() => {});

  revalidateMember(memberId);
  redirect(memberPath(memberId));
}

export async function createMemberNoteAction(formData: FormData) {
  const admin = await requireAdminMember();
  const memberId = readText(formData, "memberId");
  const body = readText(formData, "body");

  if (!memberId) {
    redirect("/admin/members");
  }

  if (!body) {
    redirect(memberPath(memberId));
  }

  const db = getDb();
  await db.insert(memberNotes).values({
    memberId,
    authorMemberId: admin.id,
    body,
  });

  audit({
    memberId,
    actorId: admin.id,
    action: "note_added",
    detail: `${body.slice(0, 80)}${body.length > 80 ? "..." : ""}`,
  }).catch(() => {});

  revalidateMember(memberId);
  redirect(memberPath(memberId));
}

export async function createAndAssignMemberTagAction(formData: FormData) {
  await requireAdminMember();
  const memberId = readText(formData, "memberId");
  const tagName = normalizeTagName(readText(formData, "tagName"));
  const color = readTagColor(formData);

  if (!memberId) {
    redirect("/admin/members");
  }

  if (!tagName) {
    redirect(memberPath(memberId));
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    const tagRows = await tx
      .insert(memberTags)
      .values({ name: tagName, color })
      .onConflictDoUpdate({
        target: memberTags.name,
        set: {
          color,
          updatedAt: new Date(),
        },
      })
      .returning();
    const tag = tagRows[0];

    await tx
      .insert(memberTagAssignments)
      .values({ memberId, tagId: tag.id })
      .onConflictDoNothing();
  });

  revalidateMember(memberId);
  redirect(memberPath(memberId));
}

export async function assignExistingMemberTagAction(formData: FormData) {
  await requireAdminMember();
  const memberId = readText(formData, "memberId");
  const tagId = readText(formData, "tagId");

  if (!memberId) {
    redirect("/admin/members");
  }

  if (!tagId) {
    redirect(memberPath(memberId));
  }

  const db = getDb();
  await db
    .insert(memberTagAssignments)
    .values({ memberId, tagId })
    .onConflictDoNothing();

  revalidateMember(memberId);
  redirect(memberPath(memberId));
}

export async function removeMemberTagAction(formData: FormData) {
  await requireAdminMember();
  const memberId = readText(formData, "memberId");
  const tagId = readText(formData, "tagId");

  if (!memberId) {
    redirect("/admin/members");
  }

  if (!tagId) {
    redirect(memberPath(memberId));
  }

  const db = getDb();
  await db
    .delete(memberTagAssignments)
    .where(
      and(
        eq(memberTagAssignments.memberId, memberId),
        eq(memberTagAssignments.tagId, tagId),
      ),
    );

  revalidateMember(memberId);
  redirect(memberPath(memberId));
}

function revalidateMember(memberId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath(memberPath(memberId));
}

function memberPath(memberId: string): string {
  return `/admin/members/${encodeURIComponent(memberId)}`;
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readTagColor(formData: FormData): (typeof tagColors)[number] {
  const value = readText(formData, "color");

  return tagColors.includes(value as (typeof tagColors)[number])
    ? (value as (typeof tagColors)[number])
    : "gray";
}

function normalizeTagName(value: string): string {
  return value.replace(/\s+/g, " ").slice(0, 48);
}

export async function toggleMemberStatusAction(formData: FormData) {
  const admin = await requireAdminMember();
  const memberId = readText(formData, "memberId");
  const targetStatus = readText(formData, "targetStatus");

  if (!memberId || !targetStatus || !["member", "not_member"].includes(targetStatus)) {
    redirect("/admin/members");
  }

  if (memberId === admin.id) {
    redirect("/admin/members");
  }

  const db = getDb();
  await db
    .update(members)
    .set({ groupStatus: targetStatus as "member" | "not_member", updatedAt: new Date() })
    .where(eq(members.id, memberId));

  audit({
    memberId,
    actorId: admin.id,
    action: targetStatus === "member" ? "member_reactivated" : "member_deactivated",
    detail: `groupStatus=${targetStatus}`,
  }).catch(() => {});

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  redirect(`/admin/members/${memberId}`);
}

function normalizeEmail(value: string): string | null {
  return value ? value.toLowerCase() : null;
}
