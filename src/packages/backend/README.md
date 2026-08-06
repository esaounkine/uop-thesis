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