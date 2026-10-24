"use client";

import {
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import {
  ExplorerRow,
  ExplorerRows,
  ExplorerSidebarItem,
  ExplorerToolbar,
} from "@/components/file-explorer";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AhuDatasetKind, DatabaseScope, FolderSummary } from "@/lib/database-folders";
import { cn } from "@/lib/utils";
import { DatabaseShell } from "./database-shell";
import { formatDayMonth } from "@/lib/utils/format";

/** Set when a file is opened so closing it returns to the folder, not the folder list (mobile). */
let resumeFolderView = false;

type FileRow = {
  id: string;
  name: string;
  updatedAt: string;
  rowsCount: number;
  columnsCount?: number;
};

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Permintaan gagal";
}

export type DatabaseExplorerProps = {
  scope: DatabaseScope;
  ahuKind?: AhuDatasetKind;
  activeFolderId: string | null;
  activeFileId: string | null;
  onFolderSelect: (folderId: string) => void;
  onFileOpen: (fileId: string) => void;
  show: (type: "success" | "error", message: string) => void;
  toolbarExtra?: React.ReactNode;
  emptyFileTitle?: string;
  emptyFileDescription?: string;
  newFileDialogContent?: React.ReactNode;
  onCreateFile?: (name: string) => Promise<boolean>;
  createFileLabel?: string;
  /** Root (custom) explorer only: the "SISTEM > AHU Database" sidebar entry. */
  ahuEntry?: {
    selected: boolean;
    onSelect: () => void;
    onOpen: (kind: AhuDatasetKind) => void;
    datasets: { key: AhuDatasetKind; label: string; Icon: LucideIcon }[];
  };
};

export function DatabaseExplorer({
  scope,
  ahuKind,
  activeFolderId,
  activeFileId,
  onFolderSelect,
  onFileOpen,
  show,
  toolbarExtra,
  emptyFileTitle = "Belum ada file di folder ini",
  emptyFileDescription = "Buat file baru untuk mulai mengisi data.",
  newFileDialogContent,
  onCreateFile,
  createFileLabel = "Buat file",
  ahuEntry,
}: DatabaseExplorerProps) {
  const { t } = useI18n();
  const layout = scope === "custom" ? "root" : "embedded";
  const [mobileOpen, setMobileOpen] = useState(() => {
    const resume = resumeFolderView;
    resumeFolderView = false;
    return resume;
  });
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [search, setSearch] = useState("");

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolder, setRenameFolder] = useState<FolderSummary | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderSummary | null>(null);

  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [renameFile, setRenameFile] = useState<FileRow | null>(null);
  const [renameFileName, setRenameFileName] = useState("");
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileRow | null>(null);

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId) ?? null,
    [folders, activeFolderId]
  );

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const r = await fetch(`/api/database/folders?scope=${scope}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await readErr(r));
      const data = (await r.json()) as FolderSummary[];
      setFolders(data);
      if (data.length > 0 && !activeFolderId) {
        onFolderSelect(data[0].id);
      }
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat folder");
    } finally {
      setLoadingFolders(false);
    }
  }, [scope, activeFolderId, onFolderSelect, show]);

  const loadFiles = useCallback(async () => {
    if (!activeFolderId) {
      setFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const params = new URLSearchParams({
        scope,
        folderId: activeFolderId,
      });
      if (scope === "ahu" && ahuKind) params.set("kind", ahuKind);
      const r = await fetch(`/api/database/files?${params}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await readErr(r));
      const data = (await r.json()) as FileRow[];
      setFiles(data);
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal memuat file");
    } finally {
      setLoadingFiles(false);
    }
  }, [activeFolderId, scope, ahuKind, show]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const r = await fetch("/api/database/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, name }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      show("success", "Folder dibuat");
      setNewFolderOpen(false);
      setNewFolderName("");
      await loadFolders();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal membuat folder");
    }
  };

  const saveFolderRename = async () => {
    if (!renameFolder) return;
    const name = renameFolderName.trim();
    if (!name) return;
    try {
      const r = await fetch(`/api/database/folders/${renameFolder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      show("success", "Folder diperbarui");
      setRenameFolder(null);
      await loadFolders();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal mengubah folder");
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      const r = await fetch(`/api/database/folders/${deleteFolderTarget.id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(await readErr(r));
      show("success", "Folder dihapus");
      if (activeFolderId === deleteFolderTarget.id) {
        onFolderSelect(folders.find((f) => f.id !== deleteFolderTarget.id)?.id ?? "");
      }
      setDeleteFolderTarget(null);
      await loadFolders();
      await loadFiles();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal menghapus folder");
    }
  };

  const createFile = async () => {
    const name = newFileName.trim();
    if (!name || !activeFolderId) return;
    if (onCreateFile) {
      const ok = await onCreateFile(name);
      if (ok) {
        setNewFileOpen(false);
        setNewFileName("");
        await loadFiles();
      }
      return;
    }
    try {
      const body: Record<string, string> = { scope, folderId: activeFolderId, name };
      if (scope === "ahu" && ahuKind) body.kind = ahuKind;
      const r = await fetch("/api/database/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await readErr(r));
      show("success", "File dibuat");
      setNewFileOpen(false);
      setNewFileName("");
      await loadFiles();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal membuat file");
    }
  };

  const saveFileRename = async () => {
    if (!renameFile) return;
    const name = renameFileName.trim();
    if (!name) return;
    try {
      const r = await fetch(`/api/database/files/${renameFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scope }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      show("success", "File diperbarui");
      setRenameFile(null);
      await loadFiles();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal mengubah file");
    }
  };

  const confirmDeleteFile = async () => {
    if (!deleteFileTarget) return;
    try {
      const q = scope === "ahu" ? "?scope=ahu" : "?scope=custom";
      const r = await fetch(`/api/database/files/${deleteFileTarget.id}${q}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(await readErr(r));
      show("success", "File dihapus");
      if (activeFileId === deleteFileTarget.id) {
        onFileOpen("");
      }
      setDeleteFileTarget(null);
      await loadFiles();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Gagal menghapus file");
    }
  };

  const dialogs = (
    <>
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder baru</DialogTitle>
            <DialogDescription>Beri nama folder untuk mengelompokkan file database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-folder-name">Nama folder</Label>
            <Input
              id="new-folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="contoh: Proyek 2026"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
              Batal
            </Button>
            <Button type="button" onClick={() => void createFolder()}>
              Buat folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFolder != null} onOpenChange={(o) => !o && setRenameFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah nama folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-folder-name">Nama folder</Label>
            <Input
              id="rename-folder-name"
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameFolder(null)}>
              Batal
            </Button>
            <Button type="button" onClick={() => void saveFolderRename()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteFolderTarget != null}
        onOpenChange={(o) => !o && setDeleteFolderTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus folder?</DialogTitle>
            <DialogDescription>
              Folder &quot;{deleteFolderTarget?.name}&quot; hanya bisa dihapus jika kosong. Tindakan
              ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteFolderTarget(null)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDeleteFolder()}>
              Hapus folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File baru</DialogTitle>
            <DialogDescription>
              File akan dibuat di folder yang sedang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-file-name">Nama file</Label>
            <Input
              id="new-file-name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="contoh: Material utama"
            />
          </div>
          {newFileDialogContent}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewFileOpen(false)}>
              Batal
            </Button>
            <Button type="button" onClick={() => void createFile()}>
              {createFileLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFile != null} onOpenChange={(o) => !o && setRenameFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah nama file</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-file-name">Nama file</Label>
            <Input
              id="rename-file-name"
              value={renameFileName}
              onChange={(e) => setRenameFileName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameFile(null)}>
              Batal
            </Button>
            <Button type="button" onClick={() => void saveFileRename()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteFileTarget != null} onOpenChange={(o) => !o && setDeleteFileTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus file?</DialogTitle>
            <DialogDescription>
              File &quot;{deleteFileTarget?.name}&quot; dan seluruh isinya akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteFileTarget(null)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDeleteFile()}>
              Hapus file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (loadingFolders) {
    const loadingBox = (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        {t("database.explorer.loadingFolders")}
      </div>
    );
    return layout === "root" ? <DatabaseShell>{loadingBox}</DatabaseShell> : loadingBox;
  }

  const ahuSelected = ahuEntry?.selected === true;
  const showItemsMobile = mobileOpen || search.trim() !== "";
  const pickFolder = (id: string) => {
    onFolderSelect(id);
    setMobileOpen(true);
  };
  const pickAhu = () => {
    ahuEntry?.onSelect();
    setMobileOpen(true);
  };
  const openFile = (id: string) => {
    resumeFolderView = true;
    onFileOpen(id);
  };
  const toRoot = () => setMobileOpen(false);

  const folderMenu = activeFolder ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`${t("database.explorer.folderActions")} ${activeFolder.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuItem
          onClick={() => {
            setRenameFolder(activeFolder);
            setRenameFolderName(activeFolder.name);
          }}
        >
          <Pencil className="size-3.5" />
          Ubah nama
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setDeleteFolderTarget(activeFolder)}
        >
          <Trash2 className="size-3.5" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const fileRows =
    loadingFiles ? (
      <div className="p-4 text-sm text-muted-foreground">Memuat file…</div>
    ) : !activeFolderId ? (
      <EmptyState
        icon={Folder}
        title="Pilih folder"
        description="Pilih folder untuk melihat file di dalamnya."
      />
    ) : filteredFiles.length === 0 ? (
      <EmptyState
        icon={FolderOpen}
        title={emptyFileTitle}
        description={emptyFileDescription}
        actionLabel={createFileLabel}
        onAction={() => setNewFileOpen(true)}
      />
    ) : (
      <ExplorerRows>
        {filteredFiles.map((f) => (
          <ExplorerRow
            key={f.id}
            icon={<FileSpreadsheet className="size-5" aria-hidden />}
            title={f.name}
            meta={
              <>
                <span>{f.rowsCount} baris</span>
                {scope === "custom" && f.columnsCount != null ? (
                  <span>{f.columnsCount} kolom</span>
                ) : null}
                <span>{formatDayMonth(f.updatedAt)}</span>
              </>
            }
            onClick={() => openFile(f.id)}
            trailing={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Aksi file ${f.name}`}
                    className="text-muted-foreground hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-md"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameFile(f);
                      setRenameFileName(f.name);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Ubah nama
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteFileTarget(f)}
                  >
                    <Trash2 className="size-3.5" />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        ))}
      </ExplorerRows>
    );

  const newFileButton = (
    <Button
      type="button"
      size="sm"
      className="h-8 gap-1.5"
      onClick={() => setNewFileOpen(true)}
      disabled={!activeFolderId}
    >
      <Plus className="size-4" />
      {t("database.explorer.newFile")}
    </Button>
  );

  const datasetRows = ahuEntry ? (
    <ExplorerRows>
      {ahuEntry.datasets.map((d) => (
        <ExplorerRow
          key={d.key}
          icon={<d.Icon className="size-5" aria-hidden />}
          title={d.label}
          meta={<span>{t("database.explorer.ahuDataset")}</span>}
          onClick={() => ahuEntry.onOpen(d.key)}
        />
      ))}
    </ExplorerRows>
  ) : null;

  if (layout === "embedded") {
    return (
      <div className="flex flex-col gap-3">
        <ExplorerToolbar
          placeholder={t("database.explorer.searchFile")}
          search={search}
          onSearchChange={setSearch}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activeFolderId ?? undefined}
            onValueChange={(v) => onFolderSelect(v)}
          >
            <SelectTrigger className="h-8 w-48" aria-label="Folder">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} ({f.filesCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {folderMenu}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setNewFolderOpen(true)}
          >
            <Plus className="size-4" />
            {t("database.explorer.newFolder")}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {toolbarExtra}
            {newFileButton}
          </div>
        </div>
        <div className="bg-card border-border overflow-hidden rounded-xl border">
          {fileRows}
        </div>
        {dialogs}
      </div>
    );
  }

  const shellActions = !ahuSelected ? (
    <>
      <Button
        type="button"
        className="hidden gap-2 sm:inline-flex"
        disabled={!activeFolderId}
        onClick={() => setNewFileOpen(true)}
      >
        <Plus className="size-4" />
        {t("database.explorer.newFile")}
      </Button>
      <Button
        type="button"
        size="icon"
        className="size-10 rounded-full sm:hidden"
        disabled={!activeFolderId}
        onClick={() => setNewFileOpen(true)}
        aria-label={t("database.explorer.newFile")}
      >
        <Plus className="size-5" />
      </Button>
    </>
  ) : null;

  return (
    <DatabaseShell actions={shellActions}>
      <ExplorerToolbar
        placeholder={t("database.explorer.searchFile")}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <nav
          aria-label={t("database.explorer.folders")}
          className="bg-card border-border hidden flex-col gap-0.5 rounded-xl border p-2 lg:flex"
        >
          {ahuEntry ? (
            <>
              <p className="text-muted-foreground px-3 pt-1 pb-1 text-xs font-medium tracking-wide uppercase">
                {t("database.explorer.system")}
              </p>
              <ExplorerSidebarItem
                active={ahuSelected}
                icon={<Database className="size-4" />}
                label={t("database.explorer.ahu")}
                count={ahuEntry.datasets.length}
                onClick={pickAhu}
              />
            </>
          ) : null}
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("database.explorer.myFolders")}
            </p>
            <button
              type="button"
              className="text-muted-foreground hover:text-primary text-xs font-medium"
              onClick={() => setNewFolderOpen(true)}
              aria-label={t("database.explorer.newFolder")}
            >
              + {t("database.explorer.new")}
            </button>
          </div>
          {folders.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              Belum ada folder. Buat folder untuk mulai.
            </p>
          ) : null}
          {folders.map((f) => (
            <ExplorerSidebarItem
              key={f.id}
              active={!ahuSelected && f.id === activeFolderId}
              icon={<Folder className="size-4" />}
              label={f.name}
              count={f.filesCount}
              onClick={() => onFolderSelect(f.id)}
            />
          ))}
        </nav>

        {/* Mobile folder list (first screen) */}
        {!showItemsMobile ? (
          <div className="flex flex-col gap-3 lg:hidden">
            {ahuEntry ? (
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  {t("database.explorer.system")}
                </p>
                <div className="bg-card border-border overflow-hidden rounded-xl border">
                  <ul>
                    <ExplorerRow
                      icon={<Database className="size-5" />}
                      title={t("database.explorer.ahu")}
                      meta={`${ahuEntry.datasets.length} dataset`}
                      onClick={pickAhu}
                    />
                  </ul>
                </div>
              </div>
            ) : null}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t("database.explorer.myFolders")}
                </p>
                <button
                  type="button"
                  className="text-primary text-xs font-medium"
                  onClick={() => setNewFolderOpen(true)}
                  aria-label={t("database.explorer.newFolder")}
                >
                  + {t("database.explorer.new")}
                </button>
              </div>
              <div className="bg-card border-border overflow-hidden rounded-xl border">
                <ul>
                  {folders.map((f) => (
                    <ExplorerRow
                      key={f.id}
                      icon={<Folder className="size-5" />}
                      title={f.name}
                      meta={`${f.filesCount} file`}
                      onClick={() => pickFolder(f.id)}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {/* List panel */}
        <section
          aria-label={ahuSelected ? t("database.explorer.ahu") : (activeFolder?.name ?? "File")}
          className={cn(
            "flex min-w-0 flex-col gap-3",
            !showItemsMobile && "hidden lg:flex",
          )}
        >
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
            <nav
              aria-label={t("explorer.location")}
              className="flex min-w-0 items-center gap-1.5"
            >
              <ChevronLeft className="size-4 shrink-0 lg:hidden" aria-hidden />
              <button
                type="button"
                onClick={toRoot}
                className="hover:text-foreground shrink-0"
              >
                {t("explorer.allFolders")}
              </button>
              <ChevronRight className="size-4 shrink-0" aria-hidden />
              <span className="text-foreground truncate font-medium">
                {ahuSelected
                  ? t("database.explorer.ahu")
                  : (activeFolder?.name ?? "—")}
              </span>
            </nav>
            <div className="flex items-center gap-2 text-xs">
              {ahuSelected ? (
                <span>{ahuEntry?.datasets.length} dataset</span>
              ) : (
                <>
                  <span>{filteredFiles.length} file</span>
                  {toolbarExtra}
                  {folderMenu}
                </>
              )}
            </div>
          </div>
          <div className="bg-card border-border overflow-hidden rounded-xl border">
            {ahuSelected ? datasetRows : fileRows}
          </div>
        </section>
      </div>

      {dialogs}
    </DatabaseShell>
  );
}
