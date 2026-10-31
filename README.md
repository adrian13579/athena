# Athena

A React + TypeScript learning workspace with Studies and an interactive Knowledge Graph. Its NestJS API uses TypeORM and PostgreSQL to persist studies. Loading and creation require an API connection.

## Local development

1. Install dependencies with `npm install`.
2. Start PostgreSQL with `docker compose up -d db`.
3. Copy `.env.example` to `.env`.
4. Start the API and Vite with `npm run dev`.

The web app runs at `http://localhost:5173`; Vite forwards `/api` requests to the API on port 3001. TypeORM runs versioned migrations at API startup. Studies start empty; browser data is never imported. The Compose database uses a named volume, so its data remains after the container stops.

The API exposes `GET /api/health`, `GET /api/studies`, `POST /api/studies`, and `POST /api/chat/study`. StudyChat uses a LangGraph flow and the LangChain OpenRouter integration. Add an OpenRouter key as `OPENROUTER_API_KEY` in the API server's `.env`; optionally set `OPENROUTER_MODEL` to any model ID supported by OpenRouter. The default is `openai/gpt-6-luna`. The API key stays on the server and is never sent to the browser.

## Diagram explanations with Excalidraw

The study guide can use the [official Excalidraw MCP App](https://github.com/excalidraw/excalidraw-mcp) to illustrate explanations. Use an OpenRouter model that supports tool calling, open a study, and ask, for example, **“Explain how DNS works with a diagram.”** The agent reads Excalidraw's drawing instructions, creates a diagram, and returns an interactive canvas alongside its explanation.

Choose **Expand to edit** to draw on the canvas. Pause for about two seconds after editing so Excalidraw can sync your changes, return with **Done** or Escape, then ask the guide to explain or update them. The next turn can read the current checkpoint and preserve your edits. **Open in Excalidraw** in the canvas offers an optional export; it asks before uploading the diagram.

`EXCALIDRAW_MCP_URL` defaults to `https://mcp.excalidraw.com`. Set it to a compatible Streamable HTTP endpoint to use your own Excalidraw MCP server. Set `EXCALIDRAW_MCP_ENABLED=false` to turn diagrams off. No Excalidraw API key is needed for the official endpoint. Diagram contents are sent to the configured MCP server; chat text is sent to the configured OpenRouter model. Model credentials stay on Athena's API server.

Athena hosts the MCP App in nested sandboxed iframes with an opaque origin and an HTTP Content Security Policy derived from the app's resource metadata. Browser tool calls are restricted to export and the diagram's issued checkpoints; app-only tools are hidden from the model. The API exposes `GET /api/mcp/excalidraw/resource`, `GET /api/mcp/excalidraw/sandbox`, and `POST /api/mcp/excalidraw/tools/call` for this bridge. The web host must proxy these routes and permit the sandbox's iframe/CSP headers.

Conversations and diagram attachments currently live in browser memory. Checkpoint access expires after four hours, an API restart, or eviction from the 256-view session cache; provider retention also applies. Reloading the page clears the conversation. Export a diagram if you want to keep it. If Excalidraw is unavailable, the guide can continue with text and the canvas provides a retry action.

## VS Code debugging

After copying `.env.example` to `.env`, stop any app servers already running in a terminal, then open **Run and Debug** and choose **Debug Athena (full stack)**. The compound configuration starts PostgreSQL, compiles and launches the API with Node breakpoints enabled, waits for Vite, then opens the app in Chrome. Set API breakpoints in `api/src/` and frontend breakpoints in `src/`. See [VS Code debugging](docs/debugging.md) for details.

## Production build

```sh
npm run build
npm run start:api
```

The production web assets are in `dist/`; serve those from your web host and proxy `/api` to the API process.

## Study storage upgrade

Deploy the updated API and client together. The one-time `ResetStudies1790460800000` migration deletes existing studies and their concept links and removes the notes column. Concepts and learning evidence remain; evidence Study references become null. Schema rollback cannot recover deleted data. Subsequent startups preserve new studies.

The client removes the legacy `athena-studies` browser cache without importing it. Notes and example studies are no longer available. The retired bulk sync route returns HTTP 410 so older clients cannot restore stale data.

## Persistence tests

Run `npm run test:studies` with PostgreSQL available. Set `TEST_DATABASE_URL` to a PostgreSQL administration connection (defaults to the local Compose credentials). The suite creates a uniquely named temporary database, tests migrations and HTTP routes, reconnects to verify persistence, and drops only that test database afterward. The database user needs permission to create databases.

Run `npm run test:client` for frontend interaction tests covering load failures, online-only creation, duplicate submission prevention, lost-response retries, and reconnection.
