import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  // Tables live next to their repository adapters (and shared/server for audit).
  schema: './libs/**/src/**/*.table.ts',
  out: './apps/api/migrations',
  casing: 'snake_case',
});
