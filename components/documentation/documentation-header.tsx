"use client";

import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Loader2,
  Save,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastError, toastSuccess } from "@/store/toastStore";
import { readErr, QuotationApi } from "./documentation-shared";
import type { EditorCtx } from "./use-documentation-editor";

export function DocumentationHeader({ ed }: { ed: EditorCtx }) {
  const {
    router,
    saving,
    quotation,
    o2cBusy,
    setO2cBusy,
    form,
    setForm,
    previewMode,
    setDocumentationUi,
    previewOpen,
    setPreviewOpen,
    runExport,
    loadList,
    loadQuotation,
    backToList,
    save,
  } = ed;

  const iconBtn = "size-9 shrink-0";

  return (
    <div className="bg-card/95 border-border z-30 flex shrink-0 flex-col gap-2 border-b px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${iconBtn} text-muted-foreground`}
          aria-label="Kembali ke daftar penawaran"
          title="Kembali"
          onClick={() => backToList()}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Input
          value={form.perihal}
          onChange={(e) => setForm((f) => ({ ...f, perihal: e.target.value }))}
          placeholder="Nama penawaran"
          className="border-input h-9 min-w-0 flex-1 sm:max-w-md"
          aria-label="Nama penawaran"
        />
        {(quotation?.revision ?? 0) > 0 ? (
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
            Rev {quotation?.revision}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
        >
          <SelectTrigger
            className="h-9 w-[7.5rem] shrink-0"
            aria-label="Status penawaran"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Terkirim</SelectItem>
            <SelectItem value="won">Menang</SelectItem>
            <SelectItem value="lost">Kalah</SelectItem>
            <SelectItem value="approved">Disetujui (lama)</SelectItem>
            <SelectItem value="final">Final (lama)</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={previewMode}
          onValueChange={(v) =>
            setDocumentationUi({
              previewMode: v as "quotation" | "detailed" | "internal",
            })
          }
        >
          <SelectTrigger
            className="h-9 w-[10.5rem] shrink-0"
            aria-label="Jenis dokumen"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quotation">Quotation</SelectItem>
            <SelectItem value="detailed">Detailed costing</SelectItem>
            <SelectItem value="internal">Internal costing</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            className={iconBtn}
            aria-label="Simpan"
            title="Simpan"
            disabled={!quotation || saving}
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={iconBtn}
            aria-label="Buat revisi"
            title="Buat revisi"
            disabled={!quotation || o2cBusy}
            onClick={() => {
              void (async () => {
                if (!quotation) return;
                setO2cBusy(true);
                try {
                  const r = await fetch(
                    `/api/quotations/${quotation.id}/revise`,
                    {
                      method: "POST",
                    },
                  );
                  if (!r.ok) throw new Error(await readErr(r));
                  const created = (await r.json()) as QuotationApi;
                  toastSuccess("Revisi quotation dibuat");
                  await loadList();
                  router.replace(`/documentation?id=${created.id}`);
                  await loadQuotation(created.id);
                } catch (e) {
                  toastError(
                    e instanceof Error ? e.message : "Gagal membuat revisi",
                  );
                } finally {
                  setO2cBusy(false);
                }
              })();
            }}
          >
            <FilePlus2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={iconBtn}
            aria-label="Ke Sales Order"
            title="Ke Sales Order"
            disabled={
              !quotation ||
              o2cBusy ||
              Boolean(quotation.convertedSoId) ||
              !["won", "approved", "finalized", "final"].includes(
                form.status.toLowerCase(),
              )
            }
            onClick={() => {
              void (async () => {
                if (!quotation) return;
                setO2cBusy(true);
                try {
                  await save();
                  const r = await fetch(
                    `/api/quotations/${quotation.id}/convert-to-so`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    },
                  );
                  if (!r.ok) throw new Error(await readErr(r));
                  const so = (await r.json()) as {
                    id: string;
                    soNumber: string;
                  };
                  toastSuccess(`Sales Order ${so.soNumber} dibuat`);
                  router.push(`/sales-orders?id=${so.id}`);
                } catch (e) {
                  toastError(
                    e instanceof Error ? e.message : "Gagal konversi ke SO",
                  );
                } finally {
                  setO2cBusy(false);
                }
              })();
            }}
          >
            <ShoppingCart className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={previewOpen ? "secondary" : "outline"}
            className={iconBtn}
            aria-label={
              previewOpen ? "Sembunyikan pratinjau" : "Tampilkan pratinjau"
            }
            aria-pressed={previewOpen}
            title={
              previewOpen ? "Sembunyikan pratinjau" : "Tampilkan pratinjau"
            }
            onClick={() => setPreviewOpen((v) => !v)}
          >
            {previewOpen ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1"
                aria-label="Export"
                disabled={!quotation}
              >
                <FileUp className="size-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-40">
              <DropdownMenuItem
                onSelect={() => void runExport("pdf", previewMode)}
              >
                <FileText className="text-destructive size-4" />
                <span className="text-destructive">PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void runExport("excel", previewMode)}
              >
                <FileSpreadsheet className="text-success size-4" />
                <span className="text-success">Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
