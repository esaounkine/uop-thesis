# Backend

The Backend is built using Node.js, written in plain JavaScript.

It follows an MVC architecture.

The services can be accessed via CLI or the RESTful endpoints.

There's no user authentication.

The Backend uses SQLite for all DB/cache needs.

## Data

- Storage: one SQLite file at the location defined by the env var `DB_FILE` (by default `db-data/thesis.sqlite`). This holds both the structured tables and the unstructured `cache` table (arbitrary text payload).
- Schema: declared in `src/db/schema.js`, should not mix with the rest of the code.
- Config: all env constants and paths live in `src/config/env.js`.
- Change the schema:
  1. Edit `src/db/schema.js`.
  2. `yarn db:generate` - writes a new migration to `src/db/migrations/`.
  3. `yarn db:migrate` - applies pending migrations to the DB file.
- Migrations are append-only. Commit them. Do not edit an applied migration.

## Run

Needs Node.js 25.7.0. 

Run `yarn install`.

Copy `env.example` to `.env`.

- `yarn start` - serve the API (and the built web, if present) on `PORT` (default 3000).
- `yarn cli` - run the pipeline from the terminal. Pass `--help` for the flags.
- `yarn test` - Jest unit and integration tests.
- `yarn lint` / `yarn lint:fix` - ESLint.

## Structure

Structurally composed after Spring MVC.

- `server.js` - HTTP entry (Express). `cli.js` - terminal entry.
- `app.js` - wiring. `wire()` builds one provider bundle per data source.
- `controllers/` - HTTP layer, one class per resource.
- `services/` - the logic: classification, author, publication, jobs, tree.
- `connectors/` - one per provider (OpenAlex, Semantic Scholar) behind a shared interface.
- `repositories/` - data access over the DB.
- `db/` - schema, client, migrations.
- `config/` env, `constants/` shared enums, `lib/` helpers.

Providers run side by side. Their data are stored tagged per provider and never merge.

Fast calls (search) answer inline. Slow calls (fetching citation metrics) run as a async jobs: `POST /jobs` returns a `requestId`, `GET /jobs/:id` reports progress and the result (can be polled regularly).