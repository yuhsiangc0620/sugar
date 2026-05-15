import { describe, expect, it } from "vitest";
import { candyEventPage, dailySummaryPage, soundLogPage } from "./notion";
import { aggregateDay, pickFlavor } from "./aggregate";

describe("Notion payload builders", () => {
  it("builds a Sound Logs page without raw audio", () => {
    const payload = soundLogPage("ds-sound", {
      timestamp: "2026-05-15T01:00:00.000+08:00",
      endedAt: "2026-05-15T01:00:05.000+08:00",
      durationSeconds: 5,
      label: "speech",
      rawLabel: "Speech",
      confidence: 0.81,
      sessionId: "session-test",
      userName: "test-user",
      source: "browser_mediapipe",
    });

    expect(payload.parent).toEqual({ data_source_id: "ds-sound" });
    expect(JSON.stringify(payload)).not.toContain("audio");
    expect(payload.properties?.category).toEqual({ select: { name: "speech" } });
    expect(payload.properties?.duration_seconds).toEqual({ number: 5 });
  });

  it("builds Candy Events and Daily Summary pages", () => {
    const candyPayload = candyEventPage("ds-candy", {
      timestamp: "2026-05-15T01:00:00.000+08:00",
      type: "returned",
      deviceId: "device-test",
      userName: "test-user",
    });
    const aggregate = aggregateDay("2026-05-15", [], []);
    const summaryPayload = dailySummaryPage("ds-daily", {
      date: "2026-05-15",
      userName: "test-user",
      aiSummary: "今天的理解很柔軟。",
      aggregate,
      flavor: pickFlavor(aggregate),
    });

    expect(candyPayload.properties?.type).toEqual({ select: { name: "returned" } });
    expect(summaryPayload.properties?.ai_summary).toBeTruthy();
    expect(summaryPayload.properties?.aggregate_json).toBeTruthy();
  });
});
