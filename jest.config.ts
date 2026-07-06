import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

// Postgres URL for modules that import prisma at load time (auth bypass in tests).
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/costing_test?schema=public";
process.env.AUTH_BYPASS ??= "true";
process.env.TEST_ORG_ID ??= "org_seed_a";
process.env.TEST_USER_ID ??= "test-user";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
