import type {
  CostingLineItem,
  CostingProject,
  CostingSection,
  CostingSegment,
  ManualCostingGroup,
  ManualCostingItem,
} from "@prisma/client";
import { create } from "zustand";

export type CostingSectionWithLines = CostingSection & {
  lineItems: CostingLineItem[];
};

export type ManualGroupWithItems = ManualCostingGroup & {
  items: ManualCostingItem[];
};

export type CostingSegmentDetail = CostingSegment & {
  sections: CostingSectionWithLines[];
  manualGroups: ManualGroupWithItems[];
};

export type CostingProjectDetail = CostingProject & {
  segments?: CostingSegmentDetail[];
};

export type CostingProjectListItem = Pick<
  CostingProject,
  "id" | "name" | "status" | "qty" | "totalHPP" | "totalSelling" | "updatedAt" | "createdAt"
> & {
  segmentCount: number;
  previewAhuModel: string | null;
  previewFlowCMH: number | null;
};

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string; detail?: string };
    if (j?.error) {
      return j.detail ? `${j.error} (${j.detail})` : j.error;
    }
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

/** Deep-clone JSON fields so fetch body is valid and Prisma accepts nested objects. */
function prepareSegmentPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const out = { ...patch };
  if (out.ahuRecalcParams !== undefined && out.ahuRecalcParams !== null) {
    out.ahuRecalcParams = JSON.parse(
      JSON.stringify(out.ahuRecalcParams)
    ) as unknown;
  }
  return out;
}

function normalizeProject(json: unknown): CostingProjectDetail {
  const p = json as CostingProjectDetail;
  return {
    ...p,
    segments: (p.segments ?? []).map((seg) => ({
      ...seg,
      sections: (seg.sections ?? []).map((s) => ({
        ...s,
        lineItems: s.lineItems ?? [],
      })),
      manualGroups: (seg.manualGroups ?? []).map((g) => ({
        ...g,
        items: g.items ?? [],
      })),
    })),
  };
}

export interface CostingStore {
  projects: CostingProjectListItem[];
  currentProject: CostingProjectDetail | null;
  isCalculating: boolean;
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (name: string) => Promise<void>;
  updateProject: (patch: Partial<CostingProject>) => Promise<void>;
  updateSegment: (
    segmentId: string,
    patch: Record<string, unknown>
  ) => Promise<void>;
  addSegment: (type: "ahu" | "manual") => Promise<void>;
  deleteSegment: (segmentId: string) => Promise<void>;
  reorderSegments: (orderedSegmentIds: string[]) => Promise<void>;
  recalculateSegment: (
    segmentId: string,
    body?: Record<string, unknown>
  ) => Promise<void>;
  overrideItem: (itemId: string, qty: number) => Promise<void>;
  resetItem: (itemId: string) => Promise<void>;
  updateMargins: (margins: Partial<CostingProject>) => Promise<void>;
}

export const useCostingStore = create<CostingStore>((set, get) => ({
  projects: [],
  currentProject: null,
  isCalculating: false,
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const r = await fetch("/api/projects", { cache: "no-store" });
      if (!r.ok) throw new Error(await readErr(r));
      const list = (await r.json()) as CostingProjectListItem[];
      set({ projects: list });
    } finally {
      set({ isLoading: false });
    }
  },

  loadProject: async (id: string) => {
    set({ isLoading: true });
    try {
      const r = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await readErr(r));
      const raw = await r.json();
      const p = normalizeProject(raw);
      set({ currentProject: p });
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (name: string) => {
    const rs = await fetch("/api/settings", { cache: "no-store" });
    if (!rs.ok) throw new Error(await readErr(rs));
    const s = (await rs.json()) as {
      defaultOverhead: number;
      defaultContingency: number;
      defaultMargin: number;
      defaultEskalasi: number;
      defaultAsuransi: number;
      defaultMobilisasi: number;
    };
    const r = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        overhead: s.defaultOverhead,
        contingency: s.defaultContingency,
        margin: s.defaultMargin,
        eskalasi: s.defaultEskalasi,
        asuransi: s.defaultAsuransi,
        mobilisasi: s.defaultMobilisasi,
      }),
    });
    if (!r.ok) throw new Error(await readErr(r));
    const created = (await r.json()) as { id: string };
    await get().loadProjects();
    await get().loadProject(created.id);
  },

  updateProject: async (patch) => {
    const cur = get().currentProject;
    if (!cur) return;
    const r = await fetch(`/api/projects/${cur.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error(await readErr(r));
    const p = normalizeProject(await r.json());
    set({ currentProject: p });
    await get().loadProjects();
  },

  updateSegment: async (segmentId, patch) => {
    const cur = get().currentProject;
    if (!cur) {
      throw new Error("Tidak ada proyek aktif. Buka proyek costing terlebih dahulu.");
    }
    const r = await fetch(
      `/api/projects/${cur.id}/segments/${segmentId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepareSegmentPatch(patch)),
        cache: "no-store",
      }
    );
    if (!r.ok) throw new Error(await readErr(r));
    const p = normalizeProject(await r.json());
    set({ currentProject: p });
    await get().loadProjects();
  },

  addSegment: async (type) => {
    const cur = get().currentProject;
    if (!cur) return;
    const r = await fetch(`/api/projects/${cur.id}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!r.ok) throw new Error(await readErr(r));
    const p = normalizeProject(await r.json());
    set({ currentProject: p });
    await get().loadProjects();
  },

  deleteSegment: async (segmentId) => {
    const cur = get().currentProject;
    if (!cur) return;
    const r = await fetch(
      `/api/projects/${cur.id}/segments/${segmentId}`,
      { method: "DELETE" }
    );
    if (!r.ok) throw new Error(await readErr(r));
    const p = normalizeProject(await r.json());
    set({ currentProject: p });
    await get().loadProjects();
  },

  reorderSegments: async (orderedSegmentIds) => {
    const cur = get().currentProject;
    if (!cur) return;
    const r = await fetch(`/api/projects/${cur.id}/segments/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentIds: orderedSegmentIds }),
    });
    if (!r.ok) throw new Error(await readErr(r));
    const p = normalizeProject(await r.json());
    set({ currentProject: p });
    await get().loadProjects();
  },

  recalculateSegment: async (segmentId, body = {}) => {
    const cur = get().currentProject;
    if (!cur) {
      throw new Error("Tidak ada proyek aktif. Buka proyek costing terlebih dahulu.");
    }
    set({ isCalculating: true });
    try {
      const r = await fetch(
        `/api/projects/${cur.id}/segments/${segmentId}/recalculate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        }
      );
      if (!r.ok) throw new Error(await readErr(r));
      const p = normalizeProject(await r.json());
      set({ currentProject: p });
      await get().loadProjects();
    } finally {
      set({ isCalculating: false });
    }
  },

  overrideItem: async (itemId: string, qty: number) => {
    const cur = get().currentProject;
    if (!cur) return;
    const r = await fetch(`/api/projects/${cur.id}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty }),
    });
    if (!r.ok) throw new Error(await readErr(r));
    await get().loadProject(cur.id);
    await get().loadProjects();
  },

  resetItem: async (itemId: string) => {
    const cur = get().currentProject;
    if (!cur) return;
    const r = await fetch(`/api/projects/${cur.id}/items/${itemId}`, {
      method: "DELETE",
    });
    if (!r.ok) throw new Error(await readErr(r));
    await get().loadProject(cur.id);
    await get().loadProjects();
  },

  updateMargins: async (margins) => {
    const cur = get().currentProject;
    if (!cur) return;
    const r = await fetch(`/api/projects/${cur.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(margins),
    });
    if (!r.ok) throw new Error(await readErr(r));
    const p = normalizeProject(await r.json());
    set({ currentProject: p });
    await get().loadProjects();
  },
}));
