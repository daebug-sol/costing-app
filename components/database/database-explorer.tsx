"use client";

import {
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AhuDatasetKind, DatabaseScope, FolderSummary } from "@/lib/database-folders";
import { cn } from "@/lib/utils";

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
}: DatabaseExplorerProps) {
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

  if (loadingFolders) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Memuat folder…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama file…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card pl-8"
            aria-label="Cari file"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          <Button type="button" variant="outline" onClick={() => setNewFolderOpen(true)}>
            <Plus className="size-4" />
            Folder baru
          </Button>
          <Button
            type="button"
            onClick={() => setNewFileOpen(true)}
            disabled={!activeFolderId}
          >
            <Plus className="size-4" />
            File baru
          </Button>
        </div>
      </div>

      <div className="grid min-h-[24rem] gap-4 lg:grid-cols-[minmax(11rem,16rem)_1fr]">
        <nav
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-label="Daftar folder"
        >
          <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Folder
          </div>
          <div className="h-[22rem] overflow-y-auto">
            <ul className="p-1" role="listbox" aria-label="Folder database">
              {folders.map((f) => {
                const selected = f.id === activeFolderId;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        selected
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/60"
                      )}
                      onClick={() => onFolderSelect(f.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onFolderSelect(f.id);
                        }
                      }}
                    >
                      {selected ? (
                        <FolderOpen className="size-4 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{f.filesCount}</span>
                    </button>
                    <div className="flex justify-end gap-0.5 px-1 pb-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Ubah nama folder ${f.name}`}
                        onClick={() => {
                          setRenameFolder(f);
                          setRenameFolderName(f.name);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Hapus folder ${f.name}`}
                        onClick={() => setDeleteFolderTarget(f)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <section
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-label="Daftar file dalam folder"
        >
          {loadingFiles ? (
            <div className="p-4 text-sm text-muted-foreground">Memuat file…</div>
          ) : !activeFolderId ? (
            <EmptyState
              icon={Folder}
              title="Pilih folder"
              description="Pilih folder di panel kiri untuk melihat file di dalamnya."
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
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="px-4 py-2.5 text-left">Nama file</th>
                  <th className="px-4 py-2.5 text-left">Baris</th>
                  {scope === "custom" ? (
                    <th className="px-4 py-2.5 text-left">Kolom</th>
                  ) : null}
                  <th className="px-4 py-2.5 text-left">Diperbarui</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f) => (
                  <tr
                    key={f.id}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50 focus-within:bg-muted/50"
                    tabIndex={0}
                    onDoubleClick={() => onFileOpen(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onFileOpen(f.id);
                      }
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium">{f.name}</td>
                    <td className="px-4 py-2.5">{f.rowsCount}</td>
                    {scope === "custom" ? (
                      <td className="px-4 py-2.5">{f.columnsCount ?? "—"}</td>
                    ) : null}
                    <td className="px-4 py-2.5">
                      {new Date(f.updatedAt).toLocaleString("id-ID")}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Ubah nama ${f.name}`}
                        onClick={() => {
                          setRenameFile(f);
                          setRenameFileName(f.name);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Hapus ${f.name}`}
                        onClick={() => setDeleteFileTarget(f)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

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
    </div>
  );
}
