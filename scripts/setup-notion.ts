import { loadEnvConfig } from "@next/env";
import { Client } from "@notionhq/client";
import {
  candyEventsDatabase,
  dailySummaryDatabase,
  soundLogsDatabase,
} from "../src/lib/sugar/notion";

loadEnvConfig(process.cwd());

const token = process.env.NOTION_TOKEN;
const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

if (!token) {
  throw new Error("Missing NOTION_TOKEN");
}

if (!parentPageId) {
  throw new Error("Missing NOTION_PARENT_PAGE_ID");
}

const notion = new Client({ auth: token });
const notionParentPageId = parentPageId;

async function main() {
  const existing = {
    sound: process.env.NOTION_SOUND_LOGS_DATA_SOURCE_ID,
    candy: process.env.NOTION_CANDY_EVENTS_DATA_SOURCE_ID,
    daily: process.env.NOTION_DAILY_SUMMARY_DATA_SOURCE_ID,
  };

  if (existing.sound && existing.candy && existing.daily) {
    await Promise.all([
      notion.dataSources.retrieve({ data_source_id: existing.sound }),
      notion.dataSources.retrieve({ data_source_id: existing.candy }),
      notion.dataSources.retrieve({ data_source_id: existing.daily }),
    ]);
    console.log("Existing SUGAR Notion data sources are reachable.");
    return;
  }

  const [sound, candy, daily] = await Promise.all([
    notion.databases.create(soundLogsDatabase(notionParentPageId)),
    notion.databases.create(candyEventsDatabase(notionParentPageId)),
    notion.databases.create(dailySummaryDatabase(notionParentPageId)),
  ]);

  console.log("Created SUGAR Notion databases. Add these to .env.local:");
  console.log(`NOTION_SOUND_LOGS_DATA_SOURCE_ID=${readDataSourceId(sound)}`);
  console.log(`NOTION_CANDY_EVENTS_DATA_SOURCE_ID=${readDataSourceId(candy)}`);
  console.log(`NOTION_DAILY_SUMMARY_DATA_SOURCE_ID=${readDataSourceId(daily)}`);
}

function readDataSourceId(database: unknown): string {
  if (
    typeof database === "object" &&
    database !== null &&
    "data_sources" in database &&
    Array.isArray(database.data_sources) &&
    typeof database.data_sources[0]?.id === "string"
  ) {
    return database.data_sources[0].id;
  }

  throw new Error("Notion did not return a data source ID for a created database");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
