# Vercel Environment Variables

Add these in Vercel Project Settings -> Environment Variables for Production, Preview, and Development unless you intentionally want different databases per environment.

## Required for Notion Storage

```bash
NOTION_TOKEN=secret_...
NOTION_SOUND_LOGS_DATA_SOURCE_ID=...
NOTION_CANDY_EVENTS_DATA_SOURCE_ID=...
NOTION_DAILY_SUMMARY_DATA_SOURCE_ID=...
```

## Required Only for Setup Script

`NOTION_PARENT_PAGE_ID` is used by `npm run setup:notion` to create the Notion databases under a parent page. The deployed API does not need it after the three data source IDs are set.

```bash
NOTION_PARENT_PAGE_ID=...
```

## Optional for AI Summary

Without `OPENAI_API_KEY`, SUGAR still runs and uses a local fallback daily summary.

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
```

## Recommended Flow

1. Create a Notion integration and copy its internal integration secret into `NOTION_TOKEN`.
2. Share the parent Notion page with that integration.
3. Set `NOTION_TOKEN` and `NOTION_PARENT_PAGE_ID` locally in `.env.local`.
4. Run `npm run setup:notion`.
5. Copy the three printed `NOTION_*_DATA_SOURCE_ID` values into `.env.local` and Vercel.
6. Deploy on Vercel.

Do not commit `.env.local`; it is ignored by git.
