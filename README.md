# SUGAR

SUGAR is a human-in-the-loop data enabled candy machine. The web MVP listens locally, stores only derived sound labels, simulates candy-machine events, and turns a day of traces into a soft daily reflection.

## Stack

- Next.js App Router + TypeScript
- MediaPipe Audio Classifier in a browser worker
- Notion data sources for Sound Logs, Candy Events, and Daily Summary
- OpenAI Responses API for daily interpretation, with a local fallback when no key is configured
- Vitest + Playwright for unit/API and browser flow coverage

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app works without Notion or OpenAI credentials by using in-memory storage and deterministic fallback summaries. Microphone audio is classified locally in the browser; only derived sound windows are sent to the server:

```json
{
  "timestamp": "2026-05-15T09:00:00.000+08:00",
  "endedAt": "2026-05-15T09:00:05.000+08:00",
  "durationSeconds": 5,
  "label": "keyboard_typing",
  "rawLabel": "Computer keyboard",
  "confidence": 0.74,
  "sessionId": "sugar-session-id",
  "source": "browser_mediapipe"
}
```

See `docs/sound-data-model.md` for the work-from-home sound taxonomy and the Notion Sound Events schema.

## Notion Setup

Create a Notion integration token, share a parent page with the integration, set `NOTION_TOKEN` and `NOTION_PARENT_PAGE_ID`, then run:

```bash
npm run setup:notion
```

The script creates or validates the three Notion data sources and prints the data source IDs to place in `.env.local`.

For deployment, copy the same Notion variables into Vercel Project Settings. See `docs/vercel-env.md`.

## API Contract

- `POST /api/sound-log`
- `POST /api/device/event`
- `GET /api/device/command?device_id=sugar-demo-device`
- `POST /api/daily-summary/run`
- `POST /api/daily-summary/feedback`

## Verification

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```
