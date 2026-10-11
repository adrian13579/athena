# API and database

Athena's API uses NestJS with the Fastify adapter. TypeORM connects to PostgreSQL and runs versioned migrations during startup. The existing study API contract is:

| Method | Path                             | Purpose                                                                  |
| ------ | -------------------------------- | ------------------------------------------------------------------------ |
| `GET`  | `/api/health`                    | Check API and database connectivity                                      |
| `GET`  | `/api/studies`                   | Load saved studies                                                       |
| `POST` | `/api/studies`                   | Create a study; safe to retry with the same ID                           |
| `PUT`  | `/api/studies/sync`              | Retired; always returns HTTP 410                                         |
| `GET`  | `/api/concepts`                  | List shared concepts                                                     |
| `POST` | `/api/concepts`                  | Create a concept with optional parent, domain, granularity, and metadata |
| `GET`  | `/api/knowledge-graph`           | Read concepts and relationships; optionally filter with `?studyId=...`   |
| `POST` | `/api/concept-relationships`     | Create or update a typed relationship between concepts                   |
| `PUT`  | `/api/studies/:studyId/concepts` | Replace the concepts and learning targets linked to a study              |
| `POST` | `/api/learning-evidence`         | Append evidence and refresh the learner's derived concept state          |
| `GET`  | `/api/learner/concepts`          | Read derived concept states; optionally filter with `?learnerId=...`     |
| `GET`  | `/api/misconceptions`            | List misconceptions and optional learner status                          |
| `POST` | `/api/misconceptions`            | Define a misconception for a concept                                     |
| `POST` | `/api/learner/misconceptions`    | Record or update a learner's misconception status                        |

The knowledge graph uses PostgreSQL tables created by a versioned migration. Concepts are shared; study links hold importance and required mastery, while learner evidence is append-only and mastery/confidence are recalculated from that evidence. The default single-user learner ID is `local`. Relationship types are `PREREQUISITE`, `PART_OF`, `BUILDS_ON`, `RELATED_TO`, `CONTRASTS_WITH`, `APPLIES`, `GENERALIZES`, and `SPECIALIZES`.

Create a concept with `POST /api/concepts`:

```json
{
  "name": "Virtual memory",
  "domain": "Computer systems",
  "granularity": 1,
  "description": "Abstraction that gives processes isolated address spaces."
}
```

Add it to a study with `PUT /api/studies/{studyId}/concepts` and a body such as `{"concepts":[{"conceptId":"...","importance":0.9,"requiredMastery":0.8,"sequenceHint":1}]}`. Record learner evidence with `POST /api/learning-evidence`, supplying `conceptId`, `evidenceType`, and a `result` from 0 to 1; difficulty and confidence are optional values in the same range.

Set `DATABASE_URL` in `.env` to select the PostgreSQL database. The local Compose service uses `postgres://athena:athena@localhost:5432/athena` and persists data in the `athena-postgres` volume. Schema changes belong in a new migration under `api/src/database/`.

Run `npm run dev` to start the API with TypeScript watch mode and the Vite client. Run `npm run build` to compile the API and build the client.

## Study creation

`POST /api/studies` accepts `id` (UUID v4), `title` (nonblank, at most 90 characters), `description` (string, at most 220 characters), `learningGoals` (optional array of up to 10 nonblank strings, each at most 180 characters), and `color` (`lavender`, `green`, `peach`, `blue`, or `pink`). Omitted descriptions and learning goals default to empty values. Titles, descriptions, and goals are trimmed; IDs are normalized to lowercase. Learning goals are stored separately from the description in the PostgreSQL `learning_goals` text-array column.

For example, a computer networks study can be created with:

```json
{
  "id": "eb19ae1c-51db-41e4-a265-f5fcac240c65",
  "title": "Computer Networks",
  "description": "An introduction to how devices exchange data across local and global networks.",
  "learningGoals": [
    "Explain how packets carry data across a network.",
    "Describe the roles of routers, switches, and DNS.",
    "Compare TCP and UDP."
  ],
  "color": "blue"
}
```

The server assigns category `Personal`, zero sources, the UTC calendar date, and `updatedAt`.

Creation returns HTTP 201 and the saved record. Retrying the same ID with identical normalized content returns the same record with HTTP 201; different content returns 409. Invalid requests return 400. Notes and server-owned fields are rejected in creation requests. Listing returns all studies ordered by date descending, then ID ascending. There are no edit or delete routes.

The reset migration removes existing studies and notes once. Foreign keys delete study concept links and null evidence study references; other knowledge data remains. It does not seed examples. The browser keeps no persistent Study cache and never imports legacy data. Failed creation keeps the form in memory; uncertain outcomes are retried using the exact same ID and payload.
