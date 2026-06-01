import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CostingSidebarFilters = {
  search: string;
  statusFilter: "all" | "draft" | "finalized";
  monthFilter: string;
  dateFilter: string;
  collapsed: boolean;
};

export type DocumentationListFilters = {
  listSearch: string;
  listStatusFilter: "all" | "draft" | "final" | "approved";
  listMonthFilter: string;
  listDateFilter: string;
};

type UiWorkflowState = {
  costing: {
    sidebar: CostingSidebarFilters;
    openSegmentsByProject: Record<string, Record<string, boolean>>;
    openCatsByProject: Record<string, Record<string, boolean>>;
    projectSummaryOpenByProject: Record<string, boolean>;
    manualOpenCatsByProject: Record<
      string,
      Record<string, Record<string, boolean>>
    >;
    mainScrollByProject: Record<string, number>;
  };
  database: {
    activeTab: string;
    ahuSection: string;
    customFolderId: string | null;
    customFileId: string | null;
    ahuFolderId: string | null;
    ahuFileId: string | null;
  };
  documentation: DocumentationListFilters & {
    screen: "list" | "editor";
    selectedId: string | null;
    previewMode: "quotation" | "detailed" | "internal";
  };

  setCostingSidebar: (patch: Partial<CostingSidebarFilters>) => void;
  setCostingOpenSegments: (
    projectId: string,
    segments: Record<string, boolean>
  ) => void;
  patchCostingOpenSegment: (
    projectId: string,
    segmentId: string,
    open: boolean
  ) => void;
  setCostingOpenCats: (projectId: string, cats: Record<string, boolean>) => void;
  patchCostingOpenCat: (
    projectId: string,
    key: string,
    open: boolean
  ) => void;
  patchCostingProjectSummaryOpen: (projectId: string, open: boolean) => void;
  setManualOpenCats: (
    projectId: string,
    segmentId: string,
    groups: Record<string, boolean>
  ) => void;
  patchManualOpenCat: (
    projectId: string,
    segmentId: string,
    groupId: string,
    open: boolean
  ) => void;
  setCostingMainScroll: (projectId: string, scrollTop: number) => void;

  setDatabaseActiveTab: (tab: string) => void;
  setDatabaseAhuSection: (tab: string) => void;
  setDatabaseCustomNav: (patch: {
    customFolderId?: string | null;
    customFileId?: string | null;
  }) => void;
  setDatabaseAhuNav: (patch: {
    ahuFolderId?: string | null;
    ahuFileId?: string | null;
  }) => void;

  setDocumentationUi: (
    patch: Partial<
      DocumentationListFilters & {
        screen: "list" | "editor";
        selectedId: string | null;
        previewMode: "quotation" | "detailed" | "internal";
      }
    >
  ) => void;
};

const defaultCostingSidebar: CostingSidebarFilters = {
  search: "",
  statusFilter: "all",
  monthFilter: "",
  dateFilter: "",
  collapsed: false,
};

const defaultDocumentation: UiWorkflowState["documentation"] = {
  ...{
    listSearch: "",
    listStatusFilter: "all",
    listMonthFilter: "",
    listDateFilter: "",
  },
  screen: "list",
  selectedId: null,
  previewMode: "quotation",
};

export const EMPTY_BOOL_MAP: Record<string, boolean> = Object.freeze({});

export const useUiWorkflowStore = create<UiWorkflowState>()(
  persist(
    (set) => ({
      costing: {
        sidebar: { ...defaultCostingSidebar },
        openSegmentsByProject: {},
        openCatsByProject: {},
        projectSummaryOpenByProject: {},
        manualOpenCatsByProject: {},
        mainScrollByProject: {},
      },
      database: {
        activeTab: "ahu",
        ahuSection: "materials",
        customFolderId: null,
        customFileId: null,
        ahuFolderId: null,
        ahuFileId: null,
      },
      documentation: { ...defaultDocumentation },

      setCostingSidebar: (patch) =>
        set((s) => ({
          costing: {
            ...s.costing,
            sidebar: { ...s.costing.sidebar, ...patch },
          },
        })),

      setCostingOpenSegments: (projectId, segments) =>
        set((s) => ({
          costing: {
            ...s.costing,
            openSegmentsByProject: {
              ...s.costing.openSegmentsByProject,
              [projectId]: segments,
            },
          },
        })),

      patchCostingOpenSegment: (projectId, segmentId, open) =>
        set((s) => {
          const cur = s.costing.openSegmentsByProject[projectId] ?? {};
          return {
            costing: {
              ...s.costing,
              openSegmentsByProject: {
                ...s.costing.openSegmentsByProject,
                [projectId]: { ...cur, [segmentId]: open },
              },
            },
          };
        }),

      setCostingOpenCats: (projectId, cats) =>
        set((s) => ({
          costing: {
            ...s.costing,
            openCatsByProject: {
              ...s.costing.openCatsByProject,
              [projectId]: cats,
            },
          },
        })),

      patchCostingOpenCat: (projectId, key, open) =>
        set((s) => {
          const cur = s.costing.openCatsByProject[projectId] ?? {};
          return {
            costing: {
              ...s.costing,
              openCatsByProject: {
                ...s.costing.openCatsByProject,
                [projectId]: { ...cur, [key]: open },
              },
            },
          };
        }),

      patchCostingProjectSummaryOpen: (projectId, open) =>
        set((s) => ({
          costing: {
            ...s.costing,
            projectSummaryOpenByProject: {
              ...(s.costing.projectSummaryOpenByProject ?? {}),
              [projectId]: open,
            },
          },
        })),

      setManualOpenCats: (projectId, segmentId, groups) =>
        set((s) => {
          const bySeg = s.costing.manualOpenCatsByProject[projectId] ?? {};
          return {
            costing: {
              ...s.costing,
              manualOpenCatsByProject: {
                ...s.costing.manualOpenCatsByProject,
                [projectId]: { ...bySeg, [segmentId]: groups },
              },
            },
          };
        }),

      patchManualOpenCat: (projectId, segmentId, groupId, open) =>
        set((s) => {
          const bySeg = s.costing.manualOpenCatsByProject[projectId] ?? {};
          const cur = bySeg[segmentId] ?? {};
          return {
            costing: {
              ...s.costing,
              manualOpenCatsByProject: {
                ...s.costing.manualOpenCatsByProject,
                [projectId]: {
                  ...bySeg,
                  [segmentId]: { ...cur, [groupId]: open },
                },
              },
            },
          };
        }),

      setCostingMainScroll: (projectId, scrollTop) =>
        set((s) => ({
          costing: {
            ...s.costing,
            mainScrollByProject: {
              ...s.costing.mainScrollByProject,
              [projectId]: scrollTop,
            },
          },
        })),

      setDatabaseActiveTab: (tab) =>
        set((s) => ({
          database: { ...s.database, activeTab: tab },
        })),
      setDatabaseAhuSection: (tab) =>
        set((s) => ({
          database: {
            ...s.database,
            ahuSection: tab,
            ahuFileId: null,
          },
        })),

      setDatabaseCustomNav: (patch) =>
        set((s) => ({
          database: {
            ...s.database,
            ...(patch.customFolderId !== undefined
              ? { customFolderId: patch.customFolderId }
              : {}),
            ...(patch.customFileId !== undefined
              ? { customFileId: patch.customFileId }
              : {}),
          },
        })),

      setDatabaseAhuNav: (patch) =>
        set((s) => ({
          database: {
            ...s.database,
            ...(patch.ahuFolderId !== undefined ? { ahuFolderId: patch.ahuFolderId } : {}),
            ...(patch.ahuFileId !== undefined ? { ahuFileId: patch.ahuFileId } : {}),
          },
        })),

      setDocumentationUi: (patch) =>
        set((s) => ({
          documentation: { ...s.documentation, ...patch },
        })),
    }),
    {
      name: "costing-app-ui-workflow",
      storage: createJSONStorage(() => sessionStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<UiWorkflowState> | undefined;
        if (!p) return current;
        const persistedCosting = p.costing;
        return {
          ...current,
          ...p,
          costing: {
            ...current.costing,
            ...persistedCosting,
            sidebar: {
              ...current.costing.sidebar,
              ...persistedCosting?.sidebar,
            },
            openSegmentsByProject:
              persistedCosting?.openSegmentsByProject ??
              current.costing.openSegmentsByProject,
            openCatsByProject:
              persistedCosting?.openCatsByProject ??
              current.costing.openCatsByProject,
            projectSummaryOpenByProject:
              persistedCosting?.projectSummaryOpenByProject ??
              current.costing.projectSummaryOpenByProject,
            manualOpenCatsByProject:
              persistedCosting?.manualOpenCatsByProject ??
              current.costing.manualOpenCatsByProject,
            mainScrollByProject:
              persistedCosting?.mainScrollByProject ??
              current.costing.mainScrollByProject,
          },
          database: { ...current.database, ...p.database },
          documentation: { ...current.documentation, ...p.documentation },
        };
      },
      partialize: (state) => ({
        costing: {
          sidebar: state.costing.sidebar,
          openSegmentsByProject: state.costing.openSegmentsByProject,
          openCatsByProject: state.costing.openCatsByProject,
          projectSummaryOpenByProject:
            state.costing.projectSummaryOpenByProject,
          manualOpenCatsByProject: state.costing.manualOpenCatsByProject,
          mainScrollByProject: state.costing.mainScrollByProject,
        },
        database: state.database,
        documentation: {
          listSearch: state.documentation.listSearch,
          listStatusFilter: state.documentation.listStatusFilter,
          listMonthFilter: state.documentation.listMonthFilter,
          listDateFilter: state.documentation.listDateFilter,
          screen: state.documentation.screen,
          selectedId: state.documentation.selectedId,
          previewMode: state.documentation.previewMode,
        },
      }),
    }
  )
);

export function mergeOpenSegmentsForProject(
  stored: Record<string, boolean> | undefined,
  segmentIds: string[]
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const id of segmentIds) {
    next[id] = stored?.[id] ?? true;
  }
  return next;
}
