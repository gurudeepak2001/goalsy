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
          // Keep local unit-test runs fast when a database is not configured.
          // CI sets DATABASE_URL and runs these saved-data integration suites.
          databaseIntegrationTests,
        ],
  },
});
