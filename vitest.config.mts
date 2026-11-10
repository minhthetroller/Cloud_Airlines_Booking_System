import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // Server modules are imported directly by the integration tests
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      DATABASE_URL: "postgres://cabs:cabs@localhost:5433/cabs_test",
      REDIS_URL: "redis://localhost:6379/1",
      STRIPE_SECRET_KEY: "sk_test_placeholder",
    },
  },
})
