import { configDefaults, defineConfig } from "vitest/config";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
const databaseIntegrationTests = "**/*.integration.test.ts";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: hasDatabaseUrl
      ? configDefaults.exclude
      : [
          ...configDefaults.exclude,
          // GitHub's unit-test job has no PostgreSQL service or DATABASE_URL.
          // Keep database-backed endpoint coverage for environments that do.
          databaseIntegrationTests,
        ],
  },
});
