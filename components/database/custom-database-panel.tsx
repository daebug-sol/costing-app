"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { DatabaseExplorer } from "./database-explorer";
import { PAGE_SIZE, FORMULA_REF_TONES } from "./custom-database-shared";
import { CustomDatabaseToolbar } from "./custom-database-toolbar";
import { CustomDatabaseTable } from "./custom-database-table";
import { CustomDatabasePagination } from "./custom-database-pagination";
import { CustomDatabaseContextMenu } from "./custom-database-context-menu";
import { CustomDatabaseImportDialog } from "./custom-database-import-dialog";
import { CustomDatabaseAddColumnDialog } from "./custom-database-add-column-dialog";
import { useCustomDatabase, type PanelCtx } from "./use-custom-database";

export function CustomDatabasePanel({
  show,
}: {
  show: (t: "success" | "error", m: string) => void;
}) {
  const { t } = useI18n();
  const ed = useCustomDatabase({ show });
  const {
    table,
    customFolderId,
    setDatabaseCustomNav,
    activeFileId,
    loading,
    insertRef,
    importRef,
    openFile,
    activeFormulaRefs,
    createCustomFile,
    onImportFile,
    customColumnSchema,
  } = ed;

  if (loading) return <div className="rounded-lg border p-4 text-sm">{t("database.custom.loading")}</div>;

  if (!activeFileId || !table) {
    return (
      <>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={onImportFile}
        />
        <DatabaseExplorer
          scope="custom"
          activeFolderId={customFolderId}
          activeFileId={activeFileId}
          onFolderSelect={(id) =>
            setDatabaseCustomNav({ customFolderId: id || null, customFileId: null })
          }
          onFileOpen={(id) => void openFile(id)}
          show={show}
          emptyFileTitle="Belum ada custom database"
          emptyFileDescription="Buat file baru di folder ini atau impor Excel."
          createFileLabel="Buat file"
          onCreateFile={createCustomFile}
          newFileDialogContent={customColumnSchema}
          toolbarExtra={
            <Button type="button" variant="outline" onClick={() => importRef.current?.click()}>
              Import Excel
            </Button>
          }
        />
      </>
    );
  }

  const ctx: PanelCtx = { ...ed, table, activeFileId };

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-0 flex-col gap-3 overflow-hidden">
      <CustomDatabaseToolbar ed={ctx} />

      <CustomDatabaseTable ed={ctx} />

      <CustomDatabasePagination ed={ctx} />

      {insertRef ? (
        <p className="text-xs text-muted-foreground">
          Rumus: ketik `=` lalu klik sel lain atau header kolom pada baris yang sama untuk menyisipkan nama
          variabel (tanpa harus mengetik). Bisa juga mengetik manual; nama mengikuti header
          (mis. &quot;Panjang mm&quot; → <code className="rounded bg-muted px-1">panjang_mm</code>).
        </p>
      ) : null}
      {activeFormulaRefs ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeFormulaRefs.keys.map((key, i) => (
            <span
              key={key}
              className={`rounded px-2 py-1 font-mono ${
                FORMULA_REF_TONES[i % FORMULA_REF_TONES.length].cell
              }`}
            >
              {key}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Kolom `Code`, `Name`, `UOM`, dan `Price` terkunci. Semua sel mendukung rumus dengan awalan `=`. Tarik dari
        pojok kanan bawah sel (cursor +) ke segala arah untuk menyalin nilai/rumus ke persegi yang dipilih (hanya
        baris di halaman ini). Lebih dari {PAGE_SIZE} baris: navigasi halaman.
      </p>

      <CustomDatabaseContextMenu ed={ctx} />

      <CustomDatabaseImportDialog ed={ctx} />

      <CustomDatabaseAddColumnDialog ed={ctx} />
    </div>
  );
}
