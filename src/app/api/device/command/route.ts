import { NextRequest, NextResponse } from "next/server";
import { consumeDeviceCommand } from "@/lib/sugar/memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deviceId =
    request.nextUrl.searchParams.get("device_id") ??
    request.nextUrl.searchParams.get("deviceId") ??
    "sugar-demo-device";
  return NextResponse.json(consumeDeviceCommand(deviceId));
}
