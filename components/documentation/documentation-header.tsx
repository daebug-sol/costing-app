"use client";

import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    setExportOpen,
    loadList,
    loadQuotation,
    backToList,
    save,
  } = ed;

  return (
    <>
      <div className="bg-card/95 border-border z-30 flex shrink-0 flex-col gap-2 border-b px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 shrink-0 text-muted-foreground"
            onClick={() => backToList()}
          >
            <ArrowLeft className="size-4" />
            Kembali
          </Button>
          <Input
            value={form.perihal}
            onChange={(e) => setForm((f) => ({ ...f, perihal: e.target.value }))}
            placeholder="Nama penawaran"
            className="border-input h-9 min-w-[10rem] flex-1 sm:max-w-md"
            aria-label="Nama penawaran"
          />
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger className="h-9 w-[130px] shrink-0">
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
          {(quotation?.revision ?? 0) > 0 ? (
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
              Rev {quotation?.revision}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!quotation || saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Simpan"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!quotation || o2cBusy}
            onClick={() => {
              void (async () => {
                if (!quotation) return;
                setO2cBusy(true);
                try {
                  const r = await fetch(`/api/quotations/${quotation.id}/revise`, {
                    method: "POST",
                  });
                  if (!r.ok) throw new Error(await readErr(r));
                  const created = (await r.json()) as QuotationApi;
                  toastSuccess("Revisi quotation dibuat");
                  await loadList();
                  router.replace(`/documentation?id=${created.id}`);
                  await loadQuotation(created.id);
                } catch (e) {
                  toastError(
                    e instanceof Error ? e.message : "Gagal membuat revisi"
                  );
                } finally {
                  setO2cBusy(false);
                }
              })();
            }}
          >
            Buat revisi
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={
              !quotation ||
              o2cBusy ||
              Boolean(quotation.convertedSoId) ||
              !["won", "approved", "finalized", "final"].includes(
                form.status.toLowerCase()
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
                    }
                  );
                  if (!r.ok) throw new Error(await readErr(r));
                  const so = (await r.json()) as { id: string; soNumber: string };
                  toastSuccess(`Sales Order ${so.soNumber} dibuat`);
                  router.push(`/sales-orders?id=${so.id}`);
                } catch (e) {
                  toastError(
                    e instanceof Error ? e.message : "Gagal konversi ke SO"
                  );
                } finally {
                  setO2cBusy(false);
                }
              })();
            }}
          >
            Ke Sales Order
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border bg-card text-foreground"
            onClick={() => setExportOpen("pdf")}
          >
            Export PDF <ChevronDown className="ml-1 size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border bg-card text-foreground"
            onClick={() => setExportOpen("excel")}
          >
            Export Excel <ChevronDown className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
