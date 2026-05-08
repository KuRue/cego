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
} from "@cego/db";
import { requireAdminMember, requireCurrentMember } from "@/lib/session";
import { parseSurveySchema, type SurveyQuestion, type SurveySchema } from "@/lib/surveys";

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
  const surveyRows = await db
    .select({ schemaJson: surveys.schemaJson })
    .from(surveys)
    .where(eq(surveys.id, surveyId))
    .limit(1);
  const previousSchema = surveyRows[0] ? parseSurveySchema(surveyRows[0].schemaJson) : undefined;

  await db
    .update(surveys)
    .set({ ...parseSurveyForm(formData, previousSchema), updatedAt: new Date() })
    .where(eq(surveys.id, surveyId));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin");
}

export async function deleteSurveyAction(formData: FormData) {
  await requireAdminMember();
  const surveyId = readText(formData, "surveyId");

  if (!surveyId) {
    redirect("/admin");
  }

  const db = getDb();
  const surveyRows = await db
    .select({ status: surveys.status })
    .from(surveys)
    .where(eq(surveys.id, surveyId))
    .limit(1);

  if (!surveyRows[0] || surveyRows[0].status !== "closed") {
    redirect("/admin");
  }

  await db.delete(surveys).where(eq(surveys.id, surveyId));

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
      .select({ id: rsvps.id, checkedInAt: rsvps.checkedInAt })
      .from(rsvps)
      .where(
        and(
          eq(rsvps.memberId, member.id),
          eq(rsvps.eventId, survey.eventId),
          inArray(rsvps.status, ["confirmed", "waitlisted"]),
        ),
      )
      .limit(1);

    if (!eligibleRows[0] || eligibleRows[0].checkedInAt) {
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

  const returnTo = readReturnPath(formData, "returnTo") ?? "/dashboard";
  revalidatePath(returnTo);
  redirect(returnTo);
}

function parseSurveyForm(formData: FormData, previousSchema?: SurveySchema) {
  const questions = parseQuestions(readText(formData, "questions"), previousSchema);

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

function parseQuestions(value: string, previousSchema?: SurveySchema): SurveyQuestion[] {
  const previousQuestions = previousSchema?.questions ?? [];
  const usedPreviousIds = new Set<string>();
  const drafts = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const required = line.startsWith("*");
      const label = required ? line.slice(1).trim() : line;

      const selectMatch = label.match(/^(.+?)\s*\[([^\]]+)\]$/);
      if (selectMatch) {
        const options = selectMatch[2]
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
        if (options.length >= 2) {
          return {
            label: selectMatch[1].trim(),
            required,
            type: "select" as const,
            options,
          };
        }
      }

      return {
        label,
        required,
        type: "text" as const,
      };
    });

  return drafts.map((draft, index) => {
    const previousBySignature = previousQuestions.find(
      (question) => !usedPreviousIds.has(question.id) && questionSignature(question) === questionSignature(draft),
    );
    const previousByIndex =
      previousQuestions[index] && !usedPreviousIds.has(previousQuestions[index].id)
        ? previousQuestions[index]
        : null;
    const previous = previousBySignature ?? previousByIndex;
    const id = previous?.id ?? `q${index + 1}_${slugify(draft.label).slice(0, 32)}`;

    usedPreviousIds.add(id);

    return {
      id,
      ...draft,
    };
  });
}

function questionSignature(question: Omit<SurveyQuestion, "id">): string {
  return JSON.stringify({
    label: question.label.trim().toLowerCase(),
    required: question.required,
    type: question.type,
    options: question.options?.map((option) => option.trim().toLowerCase()) ?? [],
  });
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string): string | null {
  return readText(formData, key) || null;
}

function readReturnPath(formData: FormData, key: string): string | null {
  const value = readText(formData, key);

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
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
