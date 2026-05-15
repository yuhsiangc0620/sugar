import { describe, expect, it } from "vitest";
import { aggregateDay, getTaipeiDayRange, pickFlavor } from "./aggregate";
import type { CandyEvent, SoundLog } from "./types";

const date = "2026-05-15";

describe("aggregateDay", () => {
  it("computes proportions, duration, and acceptance rate", () => {
    const logs: SoundLog[] = [
      sound("2026-05-15T01:00:00.000+08:00", "keyboard_typing"),
      sound("2026-05-15T01:00:05.000+08:00", "keyboard_typing"),
      sound("2026-05-15T01:00:10.000+08:00", "speech"),
    ];
    const events: CandyEvent[] = [
      candy("2026-05-15T02:00:00.000+08:00", "dispensed"),
      candy("2026-05-15T02:02:00.000+08:00", "dispensed"),
      candy("2026-05-15T02:03:00.000+08:00", "returned"),
    ];

    const aggregate = aggregateDay(date, logs, events);

    expect(aggregate.soundLogCount).toBe(3);
    expect(aggregate.topSoundLabel).toBe("keyboard_typing");
    expect(aggregate.workDurationMinutes).toBe(0.25);
    expect(aggregate.dispensedCount).toBe(2);
    expect(aggregate.returnedCount).toBe(1);
    expect(aggregate.acceptedCount).toBe(1);
    expect(aggregate.acceptanceRate).toBe(0.5);
    expect(aggregate.soundProportions.find((item) => item.label === "keyboard_typing")?.ratio).toBe(
      0.67,
    );
  });

  it("uses Taipei day boundaries", () => {
    const { start, end } = getTaipeiDayRange(date);

    expect(start.toISOString()).toBe("2026-05-14T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-15T16:00:00.000Z");
  });

  it("selects reflective flavors from the aggregate", () => {
    const aggregate = aggregateDay(date, [], [candy("2026-05-15T02:00:00.000+08:00", "returned")]);

    expect(pickFlavor(aggregate).name).toBe("淡紫回聲糖");
  });
});

function sound(timestamp: string, label: SoundLog["label"]): SoundLog {
  return {
    timestamp,
    durationSeconds: 5,
    label,
    rawLabel: label,
    confidence: 0.8,
    sessionId: "session-test",
    userName: "test-user",
    source: "demo",
  };
}

function candy(timestamp: string, type: CandyEvent["type"]): CandyEvent {
  return { timestamp, type, deviceId: "device-test", userName: "test-user" };
}
