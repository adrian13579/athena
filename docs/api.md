# API and database

Athena's API uses NestJS with the Fastify adapter. TypeORM connects to PostgreSQL and runs versioned migrations during startup. The existing study API contract is:

| Method | Path                | Purpose                             |
| ------ | ------------------- | ----------------------------------- |
| `GET`  | `/api/health`       | Check API and database connectivity |
| `GET`  | `/api/studies`      | Load saved studies                  |
| `PUT`  | `/api/studies/sync` | Upsert a batch of studies and notes |
| `GET`  | `/api/concepts` | List shared concepts |
| `POST` | `/api/concepts` | Create a concept with optional parent, domain, granularity, and metadata |
| `GET`  | `/api/knowledge-graph` | Read concepts and relationships; optionally filter with `?studyId=...` |
| `POST` | `/api/concept-relationships` | Create or update a typed relationship between concepts |
| `PUT`  | `/api/studies/:studyId/concepts` | Replace the concepts and learning targets linked to a study |
| `POST` | `/api/learning-evidence` | Append evidence and refresh the learner's derived concept state |
| `GET`  | `/api/learner/concepts` | Read derived concept states; optionally filter with `?learnerId=...` |
| `GET`  | `/api/misconceptions` | List misconceptions and optional learner status |
| `POST` | `/api/misconceptions` | Define a misconception for a concept |
| `POST` | `/api/learner/misconceptions` | Record or update a learner's misconception status |

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
