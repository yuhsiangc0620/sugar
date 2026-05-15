import { NextResponse } from "next/server";
import { aggregateDay, pickFlavor } from "@/lib/sugar/aggregate";
import { generateDailyInterpretation } from "@/lib/sugar/ai";
import {
  getMemoryStore,
  getPromptMemory,
  rememberDailySummary,
} from "@/lib/sugar/memory-store";
import {
  queryCandyEventsFromNotion,
  querySoundLogsFromNotion,
  writeDailySummaryToNotion,
} from "@/lib/sugar/notion";
import { dailySummaryRunSchema } from "@/lib/sugar/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = dailySummaryRunSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid daily summary request", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const store = getMemoryStore();
  let soundLogs = store.soundLogs;
  let candyEvents = store.candyEvents;

  try {
    const notionSoundLogs = await querySoundLogsFromNotion(parsed.data.date);
    const notionCandyEvents = await queryCandyEventsFromNotion(parsed.data.date);

    if (notionSoundLogs.length > 0 || notionCandyEvents.length > 0) {
      soundLogs = [...soundLogs, ...notionSoundLogs];
      candyEvents = [...candyEvents, ...notionCandyEvents];
    }
  } catch (error) {
    console.warn("SUGAR notion query failed; using memory store", error);
  }

  const aggregate = aggregateDay(parsed.data.date, soundLogs, candyEvents);
  const flavor = pickFlavor(aggregate);
  const aiSummary = await generateDailyInterpretation(aggregate, getPromptMemory());
  const summary = rememberDailySummary({
    date: parsed.data.date,
    userName: parsed.data.userName,
    aiSummary,
    aggregate,
    flavor,
  });

  const notion = await writeDailySummaryToNotion(summary);

  if (!notion.ok) {
    console.warn("SUGAR notion daily-summary write failed", notion);
  }

  return NextResponse.json({
    date: summary.date,
    aiSummary,
    aggregate,
    flavor,
    persistedToNotion: notion.ok,
    notion,
  });
}
