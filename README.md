# Athena

A React + TypeScript learning workspace with Studies and an interactive Knowledge Graph. Its NestJS API uses TypeORM and PostgreSQL to persist studies. Loading and creation require an API connection.

## Local development

1. Install dependencies with `npm install`.
2. Start PostgreSQL with `docker compose up -d db`.
3. Copy `.env.example` to `.env`.
4. Start the API and Vite with `npm run dev`.

The web app runs at `http://localhost:5173`; Vite forwards `/api` requests to the API on port 3001. TypeORM runs versioned migrations at API startup. Studies start empty; browser data is never imported. The Compose database uses a named volume, so its data remains after the container stops.

The API exposes `GET /api/health`, `GET /api/studies`, and `POST /api/studies`. Set `DATABASE_URL` and optionally `API_PORT` in `.env` to connect to another PostgreSQL instance. See [API and database](docs/api.md) for the routes and persistence setup.

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
