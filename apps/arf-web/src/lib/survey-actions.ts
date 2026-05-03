"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  and,
  eq,
  getDb,
  inArray,
  rsvps,
  surveyResponses,
  surveys,
  surveyStatuses,
  type SurveyStatus,
} from "@arf/db";
import { requireAdminMember, requireCurrentMember } from "@/lib/session";
import { parseSurveySchema, type SurveyQuestion } from "@/lib/surveys";

export async function createSurveyAction(formData: FormData) {
  await requireAdminMember();
  const db = getDb();

  await db.insert(surveys).values(parseSurveyForm(formData));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin");
}

export async function updateSurveyAction(formData: FormData) {
  await requireAdminMember();
  const surveyId = readText(formData, "surveyId");

  if (!surveyId) {
    redirect("/admin");
  }

  const db = getDb();
  await db
    .update(surveys)
    .set({ ...parseSurveyForm(formData), updatedAt: new Date() })
    .where(eq(surveys.id, surveyId));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin");
}

export async function submitSurveyResponseAction(formData: FormData) {
  const member = await requireCurrentMember();
  const surveyId = readText(formData, "surveyId");

  if (!surveyId || member.groupStatus !== "member") {
    redirect("/dashboard");
  }

  const db = getDb();
  const surveyRows = await db
    .select()
    .from(surveys)
    .where(eq(surveys.id, surveyId))
    .limit(1);
  const survey = surveyRows[0];

  if (!survey || survey.status !== "published") {
    redirect("/dashboard");
  }

  if (survey.eventId) {
    const eligibleRows = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(
        and(
          eq(rsvps.memberId, member.id),
          eq(rsvps.eventId, survey.eventId),
          inArray(rsvps.status, ["confirmed", "waitlisted"]),
        ),
      )
      .limit(1);

    if (!eligibleRows[0]) {
      redirect("/dashboard");
    }
  }

  const schema = parseSurveySchema(survey.schemaJson);
  const answers = Object.fromEntries(
    schema.questions.map((question) => [
      question.id,
      readText(formData, `answer:${question.id}`),
    ]),
  );

  await db
    .insert(surveyResponses)
    .values({
      surveyId: survey.id,
      memberId: member.id,
      eventId: survey.eventId,
      answersJson: answers,
    })
    .onConflictDoUpdate({
      target: [surveyResponses.surveyId, surveyResponses.memberId],
      set: {
        eventId: survey.eventId,
        answersJson: answers,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard");
}

function parseSurveyForm(formData: FormData) {
  const questions = parseQuestions(readText(formData, "questions"));

  if (questions.length === 0) {
    throw new Error("At least one survey question is required.");
  }

  return {
    eventId: readOptionalText(formData, "eventId"),
    title: readText(formData, "title"),
    description: readOptionalText(formData, "description"),
    status: readEnum(formData, "status", surveyStatuses) satisfies SurveyStatus,
    schemaJson: {
      questions,
    },
  };
}

function parseQuestions(value: string): SurveyQuestion[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const required = line.startsWith("*");
      const label = required ? line.slice(1).trim() : line;

      return {
        id: `q${index + 1}_${slugify(label).slice(0, 32)}`,
        label,
        required,
        type: "text",
      };
    });
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string): string | null {
  return readText(formData, key) || null;
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[],
): T {
  const value = readText(formData, key);

  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${key}.`);
  }

  return value as T;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
