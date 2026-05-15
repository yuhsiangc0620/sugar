import { NextResponse } from "next/server";
import { rememberCandyEvent } from "@/lib/sugar/memory-store";
import { candyEventSchema } from "@/lib/sugar/validation";
import { writeCandyEventToNotion } from "@/lib/sugar/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = candyEventSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid candy event", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const event = rememberCandyEvent({
    deviceId: parsed.data.device_id,
    type: parsed.data.event_type,
    timestamp: parsed.data.timestamp ?? new Date().toISOString(),
    userName: parsed.data.user_name ?? "sugar-user",
  });
  const notion = await writeCandyEventToNotion(event);

  if (!notion.ok) {
    console.warn("SUGAR notion candy-event write failed", notion);
  }

  return NextResponse.json(
    {
      event: {
        device_id: event.deviceId,
        event_type: event.type,
        timestamp: event.timestamp,
        user_name: event.userName,
      },
      persistedToNotion: notion.ok,
      notion,
    },
    { status: 201 },
  );
}
