import { NextResponse } from "next/server";
import { rememberSoundLog } from "@/lib/sugar/memory-store";
import { soundLogSchema } from "@/lib/sugar/validation";
import { writeSoundLogToNotion } from "@/lib/sugar/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = soundLogSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sound log", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const log = rememberSoundLog(parsed.data);
  let persistedToNotion = false;

  try {
    persistedToNotion = await writeSoundLogToNotion(log);
  } catch (error) {
    console.warn("SUGAR notion sound-log write failed", error);
  }

  return NextResponse.json({ log, persistedToNotion }, { status: 201 });
}
