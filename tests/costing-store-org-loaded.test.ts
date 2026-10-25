import { useCostingStore } from "@/store/costingStore";

function respond(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

describe("costingStore orgLoaded", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    useCostingStore.setState({ orgLoaded: false, modules: { ahu: false } });
  });

  it("starts false so tours wait for the real org caps", () => {
    expect(useCostingStore.getState().orgLoaded).toBe(false);
  });

  it("turns true together with the loaded modules", async () => {
    global.fetch = jest.fn((url: string) =>
      url === "/api/me"
        ? respond({ isOperator: false })
        : respond({ modules: { ahu: true }, role: "admin" })
    ) as unknown as typeof fetch;
    await useCostingStore.getState().loadOrgModules();
    const s = useCostingStore.getState();
    expect(s.orgLoaded).toBe(true);
    expect(s.modules.ahu).toBe(true);
  });

  it("turns true even when settings fail, so tours are not blocked forever", async () => {
    global.fetch = jest.fn(() => respond({ error: "x" }, false)) as unknown as typeof fetch;
    await expect(useCostingStore.getState().loadOrgModules()).rejects.toThrow();
    expect(useCostingStore.getState().orgLoaded).toBe(true);
  });
});
