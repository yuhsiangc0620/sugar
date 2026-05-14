export const soundLabels = [
  "keyboard_typing",
  "mouse_clicking",
  "speech",
  "silence",
  "notification_sound",
  "writing",
  "paper_rustle",
  "drinkware",
  "desk_movement",
  "door_or_drawer",
  "footsteps",
  "cough_sneeze",
  "music",
  "fan_or_ac",
  "printer_or_device",
  "kitchen_appliance",
  "pet_sound",
  "environment_noise",
] as const;

export type SoundLabel = (typeof soundLabels)[number];
export type SoundLogSource = "browser_mediapipe" | "demo" | "device_api";

export type CandyEventType = "dispensed" | "returned";

export type SoundLog = {
  timestamp: string;
  endedAt?: string;
  durationSeconds: number;
  label: SoundLabel;
  rawLabel?: string;
  confidence: number;
  sessionId: string;
  source: SoundLogSource;
};

export type CandyEvent = {
  timestamp: string;
  type: CandyEventType;
  deviceId: string;
};

export type SoundProportion = {
  label: SoundLabel;
  count: number;
  durationSeconds: number;
  ratio: number;
};

export type DailyAggregate = {
  date: string;
  soundLogCount: number;
  soundProportions: SoundProportion[];
  topSoundLabel: SoundLabel | null;
  workDurationMinutes: number;
  dispensedCount: number;
  returnedCount: number;
  acceptedCount: number;
  acceptanceRate: number;
};

export type DailySummary = {
  date: string;
  aiSummary: string;
  userFeedback?: string;
  correctedSummary?: string;
  accepted?: boolean;
  aggregate: DailyAggregate;
  flavor: CandyFlavor;
};

export type CandyFlavor = {
  name: string;
  color: string;
  note: string;
};

export type DeviceCommand = {
  action: "dispense" | "idle";
  commandId?: string;
};
