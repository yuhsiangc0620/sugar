import { Client } from "@notionhq/client";
import { getTaipeiDate } from "./aggregate";
import { soundLabels, type SoundLabel } from "./types";
import type { CandyEvent, DailySummary, SoundLog } from "./types";

type CreatePageArgs = Parameters<Client["pages"]["create"]>[0];
type CreateDatabaseArgs = Parameters<Client["databases"]["create"]>[0];

let notionClient: Client | null = null;

export function getNotionClient(): Client | null {
  if (!process.env.NOTION_TOKEN) {
    return null;
  }

  if (!notionClient) {
    notionClient = new Client({ auth: process.env.NOTION_TOKEN });
  }

  return notionClient;
}

export function getNotionStatus() {
  return {
    soundLogs: Boolean(process.env.NOTION_TOKEN && process.env.NOTION_SOUND_LOGS_DATA_SOURCE_ID),
    candyEvents: Boolean(process.env.NOTION_TOKEN && process.env.NOTION_CANDY_EVENTS_DATA_SOURCE_ID),
    dailySummary: Boolean(
      process.env.NOTION_TOKEN && process.env.NOTION_DAILY_SUMMARY_DATA_SOURCE_ID,
    ),
  };
}

export async function writeSoundLogToNotion(log: SoundLog): Promise<boolean> {
  const client = getNotionClient();
  const dataSourceId = process.env.NOTION_SOUND_LOGS_DATA_SOURCE_ID;

  if (!client || !dataSourceId) {
    return false;
  }

  await client.pages.create(soundLogPage(dataSourceId, log));
  return true;
}

export async function writeCandyEventToNotion(event: CandyEvent): Promise<boolean> {
  const client = getNotionClient();
  const dataSourceId = process.env.NOTION_CANDY_EVENTS_DATA_SOURCE_ID;

  if (!client || !dataSourceId) {
    return false;
  }

  await client.pages.create(candyEventPage(dataSourceId, event));
  return true;
}

export async function writeDailySummaryToNotion(summary: DailySummary): Promise<boolean> {
  const client = getNotionClient();
  const dataSourceId = process.env.NOTION_DAILY_SUMMARY_DATA_SOURCE_ID;

  if (!client || !dataSourceId) {
    return false;
  }

  await client.pages.create(dailySummaryPage(dataSourceId, summary));
  return true;
}

export function soundLogPage(dataSourceId: string, log: SoundLog): CreatePageArgs {
  const endedAt =
    log.endedAt ??
    new Date(new Date(log.timestamp).getTime() + log.durationSeconds * 1_000).toISOString();

  return {
    parent: { data_source_id: dataSourceId },
    properties: {
      Name: title(`Sound ${log.label}`),
      date: { date: { start: getTaipeiDate(new Date(log.timestamp)) } },
      started_at: { date: { start: log.timestamp } },
      ended_at: { date: { start: endedAt } },
      duration_seconds: { number: log.durationSeconds },
      category: { select: { name: log.label } },
      raw_category: richText(log.rawLabel ?? log.label),
      confidence: { number: log.confidence },
      session_id: richText(log.sessionId),
      user_name: richText(log.userName),
      source: { select: { name: log.source } },
    },
  };
}

export function candyEventPage(dataSourceId: string, event: CandyEvent): CreatePageArgs {
  return {
    parent: { data_source_id: dataSourceId },
    properties: {
      Name: title(`Candy ${event.type}`),
      time: { date: { start: event.timestamp } },
      type: { select: { name: event.type } },
      device_id: richText(event.deviceId),
      user_name: richText(event.userName),
    },
  };
}

export function dailySummaryPage(dataSourceId: string, summary: DailySummary): CreatePageArgs {
  return {
    parent: { data_source_id: dataSourceId },
    properties: {
      Name: title(`SUGAR ${summary.date}`),
      date: { date: { start: summary.date } },
      user_name: richText(summary.userName),
      ai_summary: richText(summary.aiSummary),
      user_feedback: richText(summary.userFeedback ?? ""),
      corrected_summary: richText(summary.correctedSummary ?? ""),
      accepted: { checkbox: summary.accepted ?? false },
      flavor: richText(summary.flavor.name),
      aggregate_json: richText(JSON.stringify(summary.aggregate)),
    },
  };
}

export function soundLogsDatabase(parentPageId: string): CreateDatabaseArgs {
  return {
    parent: { type: "page_id", page_id: parentPageId },
    title: richTextArray("SUGAR Sound Logs"),
    is_inline: true,
    initial_data_source: {
      properties: {
        Name: { title: {} },
        date: { date: {} },
        started_at: { date: {} },
        ended_at: { date: {} },
        duration_seconds: { number: { format: "number" } },
        category: {
          select: {
            options: soundLabels.map((label) => option(label, soundLabelColor(label))),
          },
        },
        raw_category: { rich_text: {} },
        confidence: { number: { format: "percent" } },
        session_id: { rich_text: {} },
        user_name: { rich_text: {} },
        source: {
          select: {
            options: [
              option("browser_mediapipe", "blue"),
              option("demo", "pink"),
              option("device_api", "purple"),
            ],
          },
        },
      },
    },
  };
}

export function candyEventsDatabase(parentPageId: string): CreateDatabaseArgs {
  return {
    parent: { type: "page_id", page_id: parentPageId },
    title: richTextArray("SUGAR Candy Events"),
    is_inline: true,
    initial_data_source: {
      properties: {
        Name: { title: {} },
        time: { date: {} },
        type: {
          select: {
            options: [option("dispensed", "red"), option("returned", "purple")],
          },
        },
        device_id: { rich_text: {} },
        user_name: { rich_text: {} },
      },
    },
  };
}

export function dailySummaryDatabase(parentPageId: string): CreateDatabaseArgs {
  return {
    parent: { type: "page_id", page_id: parentPageId },
    title: richTextArray("SUGAR Daily Summary"),
    is_inline: true,
    initial_data_source: {
      properties: {
        Name: { title: {} },
        date: { date: {} },
        user_name: { rich_text: {} },
        ai_summary: { rich_text: {} },
        user_feedback: { rich_text: {} },
        corrected_summary: { rich_text: {} },
        accepted: { checkbox: {} },
        flavor: { rich_text: {} },
        aggregate_json: { rich_text: {} },
      },
    },
  };
}

export async function querySoundLogsFromNotion(date: string): Promise<SoundLog[]> {
  const client = getNotionClient();
  const dataSourceId = process.env.NOTION_SOUND_LOGS_DATA_SOURCE_ID;

  if (!client || !dataSourceId) {
    return [];
  }

  const response = await client.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 100,
    filter: notionDateFilter("started_at", date),
    sorts: [{ property: "started_at", direction: "ascending" }],
  });

  return response.results.flatMap((page) => notionPageToSoundLog(page));
}

export async function queryCandyEventsFromNotion(date: string): Promise<CandyEvent[]> {
  const client = getNotionClient();
  const dataSourceId = process.env.NOTION_CANDY_EVENTS_DATA_SOURCE_ID;

  if (!client || !dataSourceId) {
    return [];
  }

  const response = await client.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 100,
    filter: notionDateFilter("time", date),
    sorts: [{ property: "time", direction: "ascending" }],
  });

  return response.results.flatMap((page) => notionPageToCandyEvent(page));
}

function notionDateFilter(property: string, date: string) {
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    and: [
      { property, date: { on_or_after: start.toISOString() } },
      { property, date: { before: end.toISOString() } },
    ],
  };
}

function notionPageToSoundLog(page: unknown): SoundLog[] {
  const properties = getProperties(page);
  const timestamp = readDate(properties.started_at) ?? readDate(properties.time);
  const endedAt = readDate(properties.ended_at) ?? undefined;
  const label = (readSelect(properties.category) ?? readSelect(properties.label)) as
    | SoundLabel
    | null;
  const confidence = readNumber(properties.confidence);
  const sessionId = readRichText(properties.session_id);
  const durationSeconds = readNumber(properties.duration_seconds) ?? 5;
  const rawLabel = readRichText(properties.raw_category) ?? undefined;
  const userName = readRichText(properties.user_name) ?? "sugar-user";
  const source = readSelect(properties.source);

  if (!timestamp || !label || confidence === null || !sessionId) {
    return [];
  }

  return [
    {
      timestamp,
      endedAt,
      durationSeconds,
      label,
      rawLabel,
      confidence,
      sessionId,
      userName,
      source: source === "demo" || source === "device_api" ? source : "browser_mediapipe",
    },
  ];
}

function notionPageToCandyEvent(page: unknown): CandyEvent[] {
  const properties = getProperties(page);
  const timestamp = readDate(properties.time);
  const type = readSelect(properties.type);
  const deviceId = readRichText(properties.device_id);
  const userName = readRichText(properties.user_name) ?? "sugar-user";

  if (!timestamp || (type !== "dispensed" && type !== "returned") || !deviceId) {
    return [];
  }

  return [{ timestamp, type, deviceId, userName }];
}

function getProperties(page: unknown): Record<string, unknown> {
  if (typeof page !== "object" || page === null || !("properties" in page)) {
    return {};
  }

  const properties = (page as { properties?: unknown }).properties;
  return typeof properties === "object" && properties !== null
    ? (properties as Record<string, unknown>)
    : {};
}

function readDate(property: unknown): string | null {
  if (!hasType(property, "date")) {
    return null;
  }

  const date = property.date as { start?: unknown } | null;
  return typeof date?.start === "string" ? date.start : null;
}

function readSelect(property: unknown): string | null {
  if (!hasType(property, "select")) {
    return null;
  }

  const select = property.select as { name?: unknown } | null;
  return typeof select?.name === "string" ? select.name : null;
}

function readNumber(property: unknown): number | null {
  if (!hasType(property, "number")) {
    return null;
  }

  return typeof property.number === "number" ? property.number : null;
}

function readRichText(property: unknown): string | null {
  if (!hasType(property, "rich_text")) {
    return null;
  }

  const items = property.rich_text;
  if (!Array.isArray(items)) {
    return null;
  }

  return items
    .map((item) => {
      if (typeof item !== "object" || item === null || !("plain_text" in item)) {
        return "";
      }

      return typeof item.plain_text === "string" ? item.plain_text : "";
    })
    .join("");
}

function hasType<T extends string>(property: unknown, type: T): property is { type: T } & Record<
  T,
  unknown
> {
  return (
    typeof property === "object" &&
    property !== null &&
    "type" in property &&
    property.type === type
  );
}

function title(content: string) {
  return { title: richTextArray(content) };
}

function richText(content: string) {
  return { rich_text: richTextArray(content) };
}

function richTextArray(content: string) {
  return [{ type: "text" as const, text: { content } }];
}

function option(
  name: string,
  color: "blue" | "gray" | "green" | "orange" | "pink" | "purple" | "red" | "yellow",
) {
  return { name, color };
}

function soundLabelColor(label: SoundLabel) {
  if (label === "keyboard_typing" || label === "notification_sound") {
    return "red";
  }

  if (label === "mouse_clicking" || label === "writing" || label === "kitchen_appliance") {
    return "orange";
  }

  if (label === "speech" || label === "cough_sneeze" || label === "pet_sound") {
    return "pink";
  }

  if (label === "silence" || label === "door_or_drawer" || label === "music") {
    return "purple";
  }

  if (label === "drinkware" || label === "fan_or_ac" || label === "printer_or_device") {
    return "blue";
  }

  if (label === "footsteps") {
    return "green";
  }

  if (label === "paper_rustle" || label === "desk_movement") {
    return "yellow";
  }

  return "gray";
}
