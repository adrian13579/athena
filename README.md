# Athena

A React + TypeScript learning workspace with Studies and an interactive Knowledge Graph. Its NestJS API uses TypeORM and PostgreSQL to persist studies and notes, with a browser cache for offline use.

## Local development

1. Install dependencies with `npm install`.
2. Start PostgreSQL with `docker compose up -d db`.
3. Copy `.env.example` to `.env`.
4. Start the API and Vite with `npm run dev`.

The web app runs at `http://localhost:5173`; Vite forwards `/api` requests to the API on port 3001. TypeORM runs versioned migrations at API startup and imports any studies already saved in the browser when the database is empty. The Compose database uses a named volume, so its data remains after the container stops.

The API exposes `GET /api/health`, `GET /api/studies`, and `PUT /api/studies/sync`. Set `DATABASE_URL` and optionally `API_PORT` in `.env` to connect to another PostgreSQL instance. See [API and database](docs/api.md) for the routes and persistence setup.

## VS Code debugging

After copying `.env.example` to `.env`, stop any app servers already running in a terminal, then open **Run and Debug** and choose **Debug Athena (full stack)**. The compound configuration starts PostgreSQL, compiles and launches the API with Node breakpoints enabled, waits for Vite, then opens the app in Chrome. Set API breakpoints in `api/src/` and frontend breakpoints in `src/`. See [VS Code debugging](docs/debugging.md) for details.

## Production build

```sh
npm run build
npm run start:api
```

The production web assets are in `dist/`; serve those from your web host and proxy `/api` to the API process.
