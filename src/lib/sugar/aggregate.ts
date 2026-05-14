import {
  soundLabels,
  type CandyEvent,
  type CandyFlavor,
  type DailyAggregate,
  type SoundLabel,
  type SoundLog,
} from "./types";

const FIVE_SECONDS_IN_MINUTES = 5 / 60;
const DEFAULT_SOUND_LOG_DURATION_SECONDS = 5;

export function getTaipeiDate(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function getTaipeiDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00+08:00`);
  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

export function isWithinTaipeiDate(timestamp: string, date: string): boolean {
  const value = new Date(timestamp);
  const { start, end } = getTaipeiDayRange(date);
  return value >= start && value < end;
}

export function aggregateDay(
  date: string,
  soundLogs: SoundLog[],
  candyEvents: CandyEvent[],
): DailyAggregate {
  const dailyLogs = soundLogs.filter((log) => isWithinTaipeiDate(log.timestamp, date));
  const dailyCandyEvents = candyEvents.filter((event) =>
    isWithinTaipeiDate(event.timestamp, date),
  );
  const counts = Object.fromEntries(soundLabels.map((label) => [label, 0])) as Record<
    SoundLabel,
    number
  >;
  const durations = Object.fromEntries(soundLabels.map((label) => [label, 0])) as Record<
    SoundLabel,
    number
  >;

  for (const log of dailyLogs) {
    counts[log.label] += 1;
    durations[log.label] += soundLogDurationSeconds(log);
  }

  const totalDurationSeconds = dailyLogs.reduce(
    (total, log) => total + soundLogDurationSeconds(log),
    0,
  );

  const soundProportions = soundLabels.map((label) => ({
    label,
    count: counts[label],
    durationSeconds: round(durations[label]),
    ratio: totalDurationSeconds === 0 ? 0 : round(durations[label] / totalDurationSeconds),
  }));

  const topSoundLabel =
    soundProportions.reduce<SoundLabel | null>((topLabel, current) => {
      if (!topLabel) {
        return current.durationSeconds > 0 ? current.label : null;
      }

      return current.durationSeconds > durations[topLabel] ? current.label : topLabel;
    }, null) ?? null;

  const times = dailyLogs.map((log) => new Date(log.timestamp).getTime()).sort();
  const workDurationMinutes =
    times.length === 0
      ? 0
      : Math.max(
          totalDurationSeconds / 60,
          (times[times.length - 1] - times[0]) / 60_000 + FIVE_SECONDS_IN_MINUTES,
        );

  const dispensedCount = dailyCandyEvents.filter((event) => event.type === "dispensed").length;
  const returnedCount = dailyCandyEvents.filter((event) => event.type === "returned").length;
  const acceptedCount = Math.max(0, dispensedCount - returnedCount);
  const acceptanceRate = dispensedCount === 0 ? 0 : acceptedCount / dispensedCount;

  return {
    date,
    soundLogCount: dailyLogs.length,
    soundProportions,
    topSoundLabel,
    workDurationMinutes: round(workDurationMinutes),
    dispensedCount,
    returnedCount,
    acceptedCount,
    acceptanceRate: round(acceptanceRate),
  };
}

function soundLogDurationSeconds(log: SoundLog): number {
  if (Number.isFinite(log.durationSeconds) && log.durationSeconds > 0) {
    return log.durationSeconds;
  }

  if (log.endedAt) {
    const diff = (new Date(log.endedAt).getTime() - new Date(log.timestamp).getTime()) / 1_000;
    if (Number.isFinite(diff) && diff > 0) {
      return diff;
    }
  }

  return DEFAULT_SOUND_LOG_DURATION_SECONDS;
}

export function pickFlavor(aggregate: DailyAggregate): CandyFlavor {
  if (aggregate.returnedCount > aggregate.acceptedCount) {
    return {
      name: "淡紫回聲糖",
      color: "#cfc9f2",
      note: "今天的獎勵沒有急著被收下。",
    };
  }

  if (aggregate.topSoundLabel === "speech") {
    return {
      name: "柔粉對話糖",
      color: "#eaa0c8",
      note: "你的今天留下了很多被說出的痕跡。",
    };
  }

  if (aggregate.topSoundLabel === "keyboard_typing") {
    return {
      name: "糖果紅節奏糖",
      color: "#ff7e79",
      note: "一顆帶著密集節奏的糖。",
    };
  }

  if (aggregate.topSoundLabel === "silence") {
    return {
      name: "奶油安靜糖",
      color: "#fff6df",
      note: "安靜也有重量。",
    };
  }

  return {
    name: "蜜桃漂浮糖",
    color: "#f8a65d",
    note: "今天的聲音輕輕混在一起。",
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
