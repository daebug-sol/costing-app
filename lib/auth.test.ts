import { isAuthBypassed } from "./auth";

const KEYS = ["VERCEL", "AUTH_BYPASS", "NODE_ENV", "CLERK_SECRET_KEY"] as const;
const saved: Record<string, string | undefined> = {};
const env = process.env as Record<string, string | undefined>;

function setEnv(vars: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) delete env[k];
  Object.assign(env, vars);
}

describe("isAuthBypassed", () => {
  beforeEach(() => {
    for (const k of KEYS) saved[k] = env[k];
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete env[k];
      else env[k] = saved[k];
    }
  });

  it("never bypasses on a Vercel deployment, even with AUTH_BYPASS=true", () => {
    setEnv({ VERCEL: "1", AUTH_BYPASS: "true", NODE_ENV: "production" });
    expect(isAuthBypassed()).toBe(false);
    setEnv({ VERCEL: "1", AUTH_BYPASS: "true", NODE_ENV: "development" });
    expect(isAuthBypassed()).toBe(false);
    setEnv({ VERCEL: "1", NODE_ENV: "test" });
    expect(isAuthBypassed()).toBe(false);
  });

  it("honours explicit AUTH_BYPASS=true off Vercel (CI runs next start)", () => {
    setEnv({ AUTH_BYPASS: "true", NODE_ENV: "production" });
    expect(isAuthBypassed()).toBe(true);
  });

  it("bypasses under jest (NODE_ENV=test)", () => {
    setEnv({ NODE_ENV: "test" });
    expect(isAuthBypassed()).toBe(true);
  });

  it("implicit bypass only in development without a Clerk key", () => {
    setEnv({ NODE_ENV: "development" });
    expect(isAuthBypassed()).toBe(true);
    setEnv({ NODE_ENV: "development", CLERK_SECRET_KEY: "sk_test_x" });
    expect(isAuthBypassed()).toBe(false);
  });

  it("does not bypass in production or unknown NODE_ENV without the flag", () => {
    setEnv({ NODE_ENV: "production" });
    expect(isAuthBypassed()).toBe(false);
    setEnv({ NODE_ENV: "staging" });
    expect(isAuthBypassed()).toBe(false);
    setEnv({});
    expect(isAuthBypassed()).toBe(false);
  });
});
