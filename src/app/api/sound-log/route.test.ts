import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStore, getMemoryStore } from "@/lib/sugar/memory-store";
import { POST } from "./route";

describe("POST /api/sound-log", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("validates and stores derived sound logs", async () => {
    const response = await POST(
      new Request("http://localhost/api/sound-log", {
        method: "POST",
        body: JSON.stringify({
          timestamp: "2026-05-15T01:00:00.000+08:00",
          label: "keyboard_typing",
          confidence: 0.74,
          sessionId: "session-test",
          userName: "test-user",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.persistedToNotion).toBe(false);
    expect(getMemoryStore().soundLogs).toHaveLength(1);
    expect(getMemoryStore().soundLogs[0]).toMatchObject({
      durationSeconds: 5,
      userName: "test-user",
      source: "browser_mediapipe",
    });
  });

  it("rejects invalid labels", async () => {
    const response = await POST(
      new Request("http://localhost/api/sound-log", {
        method: "POST",
        body: JSON.stringify({
          timestamp: "2026-05-15T01:00:00.000+08:00",
          label: "raw_audio_blob",
          confidence: 0.74,
          sessionId: "session-test",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
