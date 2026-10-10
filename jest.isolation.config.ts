import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

// Integration tests against a real LOCAL Postgres (see tests/isolation).
// Kept out of the default `npm test` run, which has no database requirement.
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/costing_dev?schema=public";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/isolation/**/*.isolation.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testTimeout: 30_000,
};

export default createJestConfig(config);
