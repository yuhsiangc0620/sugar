import { NextRequest, NextResponse } from "next/server";
import { aggregateDay, getTaipeiDate, pickFlavor } from "@/lib/sugar/aggregate";
import { getMemoryStore } from "@/lib/sugar/memory-store";
import { getNotionStatus } from "@/lib/sugar/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? getTaipeiDate();
  const store = getMemoryStore();
  const aggregate = aggregateDay(date, store.soundLogs, store.candyEvents);

  return NextResponse.json({
    date,
    aggregate,
    flavor: pickFlavor(aggregate),
    notion: getNotionStatus(),
    recentSoundLogs: store.soundLogs.slice(-12),
    recentCandyEvents: store.candyEvents.slice(-12),
    dailySummary: store.dailySummaries.get(date) ?? null,
  });
}
