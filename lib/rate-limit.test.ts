import {
  checkRateLimit,
  enforceRateLimit,
  rateLimitKey,
  resetRateLimitMemory,
} from "./rate-limit";

const ENV_KEYS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;
const env = process.env as Record<string, string | undefined>;
const savedEnv: Record<string, string | undefined> = {};
const realFetch = global.fetch;

function upstashReply(count: number, pttl: number) {
  return {
    ok: true,
    status: 200,
    json: async () => [{ result: count }, { result: 1 }, { result: pttl }],
  };
}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = env[k];
    delete env[k];
  }
  resetRateLimitMemory();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete env[k];
    else env[k] = savedEnv[k];
  }
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe("rateLimitKey", () => {
  it("joins defined parts", () => {
    expect(rateLimitKey(["org", undefined, "bucket"])).toBe("org:bucket");
  });
});

describe("checkRateLimit (in-memory)", () => {
  it("allows up to the limit then blocks with Retry-After", async () => {
    expect(await checkRateLimit("k", 2, 60_000)).toEqual({ ok: true });
    expect(await checkRateLimit("k", 2, 60_000)).toEqual({ ok: true });
    const blocked = await checkRateLimit("k", 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks keys independently", async () => {
    await checkRateLimit("a", 1, 60_000);
    expect(await checkRateLimit("b", 1, 60_000)).toEqual({ ok: true });
  });
});

describe("checkRateLimit (Upstash)", () => {
  beforeEach(() => {
    env.UPSTASH_REDIS_REST_URL = "https://redis.example.test/";
    env.UPSTASH_REDIS_REST_TOKEN = "tok";
  });

  it("uses the shared counter and sends auth + namespaced key", async () => {
    const fetchMock = jest.fn().mockResolvedValue(upstashReply(1, 59_000));
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await checkRateLimit("org:x", 5, 60_000)).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://redis.example.test/pipeline");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)[0]).toEqual(["INCR", "rl:org:x"]);
  });

  it("blocks over the limit and derives Retry-After from PTTL", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(upstashReply(6, 12_300)) as unknown as typeof fetch;
    const res = await checkRateLimit("org:x", 5, 60_000);
    expect(res).toEqual({ ok: false, retryAfterSec: 13 });
  });

  it("repairs a counter that has no expiry", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(upstashReply(1, -1))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ result: 1 }] });
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await checkRateLimit("org:x", 5, 60_000)).toEqual({ ok: true });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual([
      ["PEXPIRE", "rl:org:x", 60_000],
    ]);
  });

  it("falls back to in-memory limiting when Upstash fails", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    expect(await checkRateLimit("k", 1, 60_000)).toEqual({ ok: true });
    expect((await checkRateLimit("k", 1, 60_000)).ok).toBe(false);
  });

  it("falls back on a non-2xx response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    expect(await checkRateLimit("k", 1, 60_000)).toEqual({ ok: true });
  });
});

describe("enforceRateLimit", () => {
  it("returns null under the limit and a 429 with Retry-After over it", async () => {
    const opts = { orgId: "org-a", bucket: "b", limit: 1, windowMs: 60_000 };
    expect(await enforceRateLimit(opts)).toBeNull();

    const res = await enforceRateLimit({ ...opts, message: "Slow down" });
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await res?.json()).toEqual({ error: "Slow down" });
  });

  it("scopes limits per organization", async () => {
    const base = { bucket: "b", limit: 1, windowMs: 60_000 };
    await enforceRateLimit({ ...base, orgId: "org-a" });
    expect(await enforceRateLimit({ ...base, orgId: "org-b" })).toBeNull();
  });
});
