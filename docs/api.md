# API and database

Athena's API uses NestJS with the Fastify adapter. TypeORM connects to PostgreSQL and runs versioned migrations during startup. The existing study API contract is:

| Method | Path                | Purpose                             |
| ------ | ------------------- | ----------------------------------- |
| `GET`  | `/api/health`       | Check API and database connectivity |
| `GET`  | `/api/studies`      | Load saved studies                  |
| `PUT`  | `/api/studies/sync` | Upsert a batch of studies and notes |

Set `DATABASE_URL` in `.env` to select the PostgreSQL database. The local Compose service uses `postgres://athena:athena@localhost:5432/athena` and persists data in the `athena-postgres` volume. Schema changes belong in a new migration under `api/src/database/`.

Run `npm run dev` to start the API with TypeScript watch mode and the Vite client. Run `npm run build` to compile the API and build the client.
