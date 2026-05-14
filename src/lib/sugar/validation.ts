import { z } from "zod";
import { soundLabels } from "./types";

const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected an ISO timestamp",
});

export const soundLogSchema = z.object({
  timestamp: isoDateTime,
  endedAt: isoDateTime.optional(),
  durationSeconds: z.number().positive().max(300).default(5),
  label: z.enum(soundLabels),
  rawLabel: z.string().min(1).max(160).optional(),
  confidence: z.number().min(0).max(1),
  sessionId: z.string().min(3).max(120),
  source: z.enum(["browser_mediapipe", "demo", "device_api"]).default("browser_mediapipe"),
});

export const candyEventSchema = z.object({
  device_id: z.string().min(1).max(120),
  event_type: z.enum(["dispensed", "returned"]),
  timestamp: isoDateTime.optional(),
});

export const dailySummaryRunSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const dailySummaryFeedbackSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accepted: z.boolean(),
  feedback: z.string().max(2_000).optional(),
});
