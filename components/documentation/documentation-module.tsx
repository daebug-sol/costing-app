"use client";

import { useI18n } from "@/components/i18n-provider";
import { Loader2, RefreshCw } from "lucide-react";
import { DocumentationListView } from "@/components/documentation/documentation-list-view";
import { Button } from "@/components/ui/button";
import { DocumentationHeader } from "./documentation-header";
import { DocumentationForm } from "./documentation-form";
import { DocumentationPreview } from "./documentation-preview";
import { DocumentationExportDialog } from "./documentation-export-dialog";
import { useDocumentationEditor, type EditorCtx } from "./use-documentation-editor";

export function DocumentationModule() {
  const { t } = useI18n();
  const ed = useDocumentationEditor();
  const {
    confirmDialog,
    setDocumentationUi,
    screen,
    listSearch,
    listStatusFilter,
    listMonthFilter,
    listDateFilter,
    loading,
    setLoading,
    loadError,
    setLoadError,
    creating,
    settings,
    selectMode,
    setSelectMode,
    selectedIds,
    setSelectedIds,
    deletingBulk,
    expandedId,
    availableMonths,
    filteredListQuotations,
    customerFolders,
    loadSettings,
    handleCreate,
    handleToggleSelect,
    handleBulkDelete,
    handleToggleExpand,
    openLatestStage,
  } = ed;

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-muted/40">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 bg-muted/40 px-4">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {loadError ?? "Gagal memuat pengaturan aplikasi."}
        </p>
        <Button
          type="button"
          className="gap-2"
          onClick={() => {
            setLoading(true);
            setLoadError(null);
            void loadSettings().finally(() => setLoading(false));
          }}
        >
          <RefreshCw className="size-4" />
          Coba lagi
        </Button>
      </div>
    );
  }

  if (screen === "list") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-muted/40">
        <DocumentationListView
          folders={customerFolders}
          expandedId={expandedId}
          onToggleExpand={handleToggleExpand}
          onOpenLatest={openLatestStage}
          onCreate={() => void handleCreate()}
          creating={creating}
          selectMode={selectMode}
          onSelectModeChange={(v) => {
            setSelectMode(v);
            if (!v) setSelectedIds(new Set());
          }}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={() =>
            setSelectedIds(new Set(filteredListQuotations.map((q) => q.id)))
          }
          onDeleteSelected={() => void handleBulkDelete()}
          deleting={deletingBulk}
          search={listSearch}
          onSearchChange={(v) => setDocumentationUi({ listSearch: v })}
          statusFilter={listStatusFilter}
          onStatusFilterChange={(v) =>
            setDocumentationUi({ listStatusFilter: v })
          }
          monthFilter={listMonthFilter}
          onMonthFilterChange={(v) =>
            setDocumentationUi({ listMonthFilter: v })
          }
          availableMonths={availableMonths}
          dateFilter={listDateFilter}
          onDateFilterChange={(v) =>
            setDocumentationUi({ listDateFilter: v })
          }
        />
      </div>
    );
  }

  const company = settings.companyName;
  const addrLine = [settings.companyAddress, `${settings.companyPhone} | ${settings.companyEmail}`]
    .filter(Boolean)
    .join(" ");
  const presetSigned = settings.presetSignedByName?.trim() || "—";
  const presetChecked = settings.presetCheckedByName?.trim() || "—";
  const presetApproved = settings.presetApprovedByName?.trim() || "—";

  const ctx: EditorCtx = { ...ed, settings, company, addrLine, presetSigned, presetChecked, presetApproved };

  return (
    <div className="bg-muted relative flex h-[calc(100vh-3.5rem)] min-h-0 flex-col overflow-hidden">
      {confirmDialog}
      <h1 className="sr-only">{t("documentation.editorTitle")}</h1>
      <DocumentationHeader ed={ctx} />


      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 overflow-hidden px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,34%)_minmax(0,66%)] lg:px-8 lg:py-6">
        <DocumentationForm ed={ctx} />

        <DocumentationPreview ed={ctx} />
      </div>

      <DocumentationExportDialog ed={ctx} />
    </div>
  );
}
