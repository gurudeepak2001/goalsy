import { configDefaults, defineConfig } from "vitest/config";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: hasDatabaseUrl
      ? configDefaults.exclude
      : [
          ...configDefaults.exclude,
          "**/missions-collision.integration.test.ts",
        ],
  },
});
