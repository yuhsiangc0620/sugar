import { NextResponse } from "next/server";
import {
  appendPromptMemory,
  getMemoryStore,
  rememberDailySummary,
} from "@/lib/sugar/memory-store";
import { dailySummaryFeedbackSchema } from "@/lib/sugar/validation";
import { writeDailySummaryToNotion } from "@/lib/sugar/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = dailySummaryFeedbackSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = getMemoryStore().dailySummaries.get(parsed.data.date);

  if (!existing) {
    return NextResponse.json({ error: "Daily summary not found" }, { status: 404 });
  }

  const correctedSummary =
    parsed.data.accepted || !parsed.data.feedback?.trim()
      ? existing.aiSummary
      : `${existing.aiSummary}\n\n使用者補充：${parsed.data.feedback.trim()}`;

  if (!parsed.data.accepted && parsed.data.feedback) {
    appendPromptMemory(parsed.data.feedback);
  }

  const summary = rememberDailySummary({
    ...existing,
    accepted: parsed.data.accepted,
    userFeedback: parsed.data.feedback,
    correctedSummary,
  });

  const notion = await writeDailySummaryToNotion(summary);

  if (!notion.ok) {
    console.warn("SUGAR notion feedback write failed", notion);
  }

  return NextResponse.json({
    correctedSummary,
    memoryUpdated: Boolean(!parsed.data.accepted && parsed.data.feedback?.trim()),
    persistedToNotion: notion.ok,
    notion,
  });
}
