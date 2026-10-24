import {
  loadProgress,
  readLocalProgress,
  saveProgress,
} from "@/lib/tour/progress-client";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const fetchMock = jest.fn();

beforeEach(() => {
  (globalThis as { window?: unknown }).window = {};
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

describe("tour progress client", () => {
  it("keeps local status when PUT fails", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(saveProgress("welcome", "skipped")).resolves.toBeUndefined();
    expect(readLocalProgress()).toEqual({ welcome: "skipped" });
  });

  it("keeps local status when the network is down", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await saveProgress("costing", "done");
    expect(readLocalProgress()).toEqual({ costing: "done" });
  });

  it("removes a key when status is null", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await saveProgress("welcome", "done");
    await saveProgress("welcome", null);
    expect(readLocalProgress()).toEqual({});
  });

  it("loadProgress merges server over local and refreshes the mirror", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    await saveProgress("costing", "done");
    fetchMock.mockResolvedValue(
      Response.json({ progress: { welcome: "done" }, displayName: "Rina" })
    );
    const result = await loadProgress();
    expect(result).toEqual({
      progress: { costing: "done", welcome: "done" },
      displayName: "Rina",
    });
    expect(readLocalProgress()).toEqual({ costing: "done", welcome: "done" });
  });

  it("loadProgress returns null when the server refuses", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 403 }));
    expect(await loadProgress()).toBeNull();
  });

  it("ignores a corrupt mirror", () => {
    localStorage.setItem("costing-tour-progress", "{not json");
    expect(readLocalProgress()).toEqual({});
  });
});
