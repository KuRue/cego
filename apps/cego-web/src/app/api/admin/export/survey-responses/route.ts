import { eq, getDb, members, surveyResponses, surveys } from "@cego/db";
import { NextResponse } from "next/server";
import { requireAdminMember } from "@/lib/session";
import { parseSurveySchema } from "@/lib/surveys";
import { csvEscape } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireAdminMember();

  const url = new URL(request.url);
  const surveyId = url.searchParams.get("surveyId");
  if (!surveyId) {
    return NextResponse.json({ ok: false, error: "Missing surveyId" }, { status: 400 });
  }

  const db = getDb();
  const [surveyRow] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  if (!surveyRow) {
    return NextResponse.json({ ok: false, error: "Survey not found" }, { status: 404 });
  }

  const schema = parseSurveySchema(surveyRow.schemaJson);
  const questionLabels = schema.questions.map((q) => q.label);

  const rows = await db
    .select({
      response: surveyResponses,
      member: {
        telegramDisplayName: members.telegramDisplayName,
        telegramUsername: members.telegramUsername,
      },
    })
    .from(surveyResponses)
    .innerJoin(members, eq(surveyResponses.memberId, members.id))
    .where(eq(surveyResponses.surveyId, surveyId))
    .orderBy(surveyResponses.submittedAt);

  const header = ["Name", "Username", "Submitted", ...questionLabels].map(csvEscape).join(",");

  const lines = rows.map(({ response: r, member: m }) => {
    const answers = schema.questions.map((q) => {
      const raw = (r.answersJson as Record<string, unknown>)?.[q.id];
      return raw != null ? String(raw) : "";
    });
    const cols = [
      m.telegramDisplayName ?? "",
      m.telegramUsername ? `@${m.telegramUsername}` : "",
      r.submittedAt ? new Date(r.submittedAt).toISOString() : "",
      ...answers,
    ];
    return cols.map((c) => csvEscape(c)).join(",");
  });

  const csv = [header, ...lines].join("\n");
  const filename = `${surveyRow.title.replace(/[^a-zA-Z0-9]/g, "_")}_responses.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
