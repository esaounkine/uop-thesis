import { defineConfig } from 'drizzle-kit';
import { schemaFile, migrationsDir } from './src/config/env.js';

export default defineConfig({
  dialect: 'sqlite',
  schema: schemaFile,
  out: migrationsDir,
});
