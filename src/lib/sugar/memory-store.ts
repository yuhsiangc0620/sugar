import type { CandyEvent, DailySummary, DeviceCommand, SoundLog } from "./types";

type SugarMemoryStore = {
  soundLogs: SoundLog[];
  candyEvents: CandyEvent[];
  dailySummaries: Map<string, DailySummary>;
  deviceCommands: Map<string, DeviceCommand[]>;
  promptMemory: string[];
};

declare global {
  var sugarMemoryStore: SugarMemoryStore | undefined;
}

export function getMemoryStore(): SugarMemoryStore {
  if (!globalThis.sugarMemoryStore) {
    globalThis.sugarMemoryStore = {
      soundLogs: [],
      candyEvents: [],
      dailySummaries: new Map(),
      deviceCommands: new Map(),
      promptMemory: [],
    };
  }

  return globalThis.sugarMemoryStore;
}

export function resetMemoryStore(): void {
  globalThis.sugarMemoryStore = undefined;
}

export function rememberSoundLog(log: SoundLog): SoundLog {
  getMemoryStore().soundLogs.push(log);
  return log;
}

export function rememberCandyEvent(event: CandyEvent): CandyEvent {
  getMemoryStore().candyEvents.push(event);
  return event;
}

export function rememberDailySummary(summary: DailySummary): DailySummary {
  getMemoryStore().dailySummaries.set(summary.date, summary);
  return summary;
}

export function getPromptMemory(): string[] {
  return getMemoryStore().promptMemory.slice(-8);
}

export function appendPromptMemory(memory: string): void {
  const trimmed = memory.trim();
  if (!trimmed) {
    return;
  }

  const store = getMemoryStore();
  store.promptMemory.push(trimmed);
  store.promptMemory = store.promptMemory.slice(-12);
}

export function enqueueDeviceCommand(deviceId: string, command: DeviceCommand): void {
  const queue = getMemoryStore().deviceCommands.get(deviceId) ?? [];
  queue.push(command);
  getMemoryStore().deviceCommands.set(deviceId, queue);
}

export function consumeDeviceCommand(deviceId: string): DeviceCommand {
  const queue = getMemoryStore().deviceCommands.get(deviceId) ?? [];
  const next = queue.shift();
  getMemoryStore().deviceCommands.set(deviceId, queue);
  return next ?? { action: "idle" };
}
