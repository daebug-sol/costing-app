"use client";

import { FileStack, FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_QUOTATION_INTRO } from "@/lib/merge-quotation-doc";
import { formatIDR } from "@/lib/utils/format";
import type { EditorCtx } from "./use-documentation-editor";

export function DocumentationPreview({ ed }: { ed: EditorCtx }) {
  const {
    setDocumentationUi,
    previewMode,
    settings,
    form,
    previewBreakdowns,
    previewTotals,
    effectiveTtdPrepared,
    effectiveTtdReviewed,
    effectiveTtdApproved,
    company,
    addrLine,
    presetSigned,
    presetChecked,
    presetApproved,
  } = ed;

  return (
    <>
        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant={previewMode === "quotation" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() =>
                setDocumentationUi({ previewMode: "quotation" })
              }
            >
              <FileText className="size-3.5" />
              Quotation
            </Button>
            <Button
              type="button"
              variant={previewMode === "detailed" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() =>
                setDocumentationUi({ previewMode: "detailed" })
              }
            >
              <PenLine className="size-3.5" />
              Detailed costing
            </Button>
            <Button
              type="button"
              variant={previewMode === "internal" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() =>
                setDocumentationUi({ previewMode: "internal" })
              }
            >
              <FileStack className="size-3.5" />
              Internal costing
            </Button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 sm:p-4 lg:p-5">
            <div
              className={`relative z-0 mx-auto box-border w-full max-w-[min(100%,56rem)] rounded-md bg-white p-6 shadow-md sm:p-8 ${
                form.status === "draft"
                  ? "ring-2 ring-inset ring-red-500/75"
                  : "border border-border"
              }`}
            >
            {form.status === "draft" ? (
              <div
                className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-6xl font-bold text-red-500/15"
                style={{ transform: "rotate(-28deg)" }}
              >
                DRAFT
              </div>
            ) : null}
            <div className="relative z-[1] text-sm leading-relaxed">
              <div className="flex gap-4">
                {settings.companyLogo?.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.companyLogo}
                    alt=""
                    className="h-14 w-28 object-contain"
                  />
                ) : (
                  <div className="h-14 w-28 bg-muted" />
                )}
                <div>
                  <div className="font-bold uppercase">{company}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{addrLine}</div>
                </div>
              </div>
              <div className="my-4 border-t border-border" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div>Kepada Yth.</div>
                  <div className="font-medium">{form.clientCompany || form.clientName || "—"}</div>
                  {form.clientName && form.clientCompany ? (
                    <div>Up. {form.clientName}</div>
                  ) : null}
                  <div className="text-muted-foreground mt-2 whitespace-pre-wrap text-xs">
                    {form.clientAddress || "—"}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div>
                    No : <span className="font-medium">{form.noSurat || "—"}</span>
                  </div>
                  <div>
                    Tgl:{" "}
                    {form.tanggal
                      ? new Date(form.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                Perihal: <span className="font-medium">{form.perihal || "—"}</span>
              </div>
              <div className="mt-4 whitespace-pre-wrap">
                {form.introText.trim()
                  ? form.introText
                  : DEFAULT_QUOTATION_INTRO}
              </div>

              <table className="mt-4 w-full table-fixed border-collapse border border-border text-xs">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="min-w-0 w-[30%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[23%]" />
                  <col className="w-[23%]" />
                </colgroup>
                <thead>
                  <tr className="bg-muted/40">
                    <th className="border border-border px-1 py-1 text-center">No</th>
                    <th className="border border-border px-1 py-1 text-center">Deskripsi</th>
                    <th className="border border-border px-1 py-1 text-center">Qty</th>
                    <th className="border border-border px-1 py-1 text-center">UOM</th>
                    <th className="border border-border px-1 py-1 text-center">Harga Sat.</th>
                    <th className="border border-border px-1 py-1 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-border px-2 py-3 text-center text-muted-foreground">
                        Belum ada item
                      </td>
                    </tr>
                  ) : (
                    form.items.map((it, i) => (
                      <tr key={it.localId}>
                        <td className="border border-border px-1 py-1 text-center align-top">
                          {i + 1}
                        </td>
                        <td className="border border-border px-1 py-1 align-top break-words">
                          <div className="break-words">{it.description}</div>
                          {it.spec ? (
                            <div className="text-muted-foreground mt-1 text-2xs whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                              {it.spec}
                            </div>
                          ) : null}
                        </td>
                        <td className="border border-border px-1 py-1 text-center align-top tabular-nums">
                          {it.qty}
                        </td>
                        <td className="border border-border px-1 py-1 text-center align-top break-words">
                          {it.uom}
                        </td>
                        <td className="border border-border px-1 py-1 text-right align-top tabular-nums whitespace-normal break-all">
                          {formatIDR(it.unitPrice)}
                        </td>
                        <td className="border border-border px-1 py-1 text-right align-top tabular-nums whitespace-normal break-all">
                          {formatIDR(it.qty * it.unitPrice)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {previewMode === "detailed" && previewBreakdowns.length > 0 ? (
                <div className="mt-6 border-t border-border pt-4 text-xs">
                  <div className="font-semibold text-foreground">Rincian per kategori</div>
                  {previewBreakdowns.map((cb) => (
                    <div key={cb.project.name} className="mt-3">
                      <div className="text-foreground font-medium">{cb.project.name}</div>
                      <div className="text-muted-foreground mt-1 space-y-0.5 pl-2">
                        {cb.sections.map((sec, si) => (
                          <div
                            key={`${cb.project.name}-${si}-${sec.category}`}
                            className="flex justify-between gap-4"
                          >
                            <span className="min-w-0 break-words">{sec.category}</span>
                            <span className="tabular-nums shrink-0">
                              {formatIDR(sec.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {previewMode === "internal" && previewBreakdowns.length > 0 ? (
                <div className="mt-6 border-t border-dashed border-border pt-4 text-xs">
                  <div className="font-semibold text-foreground">Internal — ringkasan biaya per proyek</div>
                  {previewBreakdowns.map((cb) => (
                    <div key={cb.project.name} className="mt-3">
                      <div className="text-foreground font-medium">{cb.project.name}</div>
                      <div className="text-muted-foreground mt-1 space-y-0.5 pl-2">
                        {cb.sections.map((sec, si) => (
                          <div
                            key={`${cb.project.name}-int-${si}-${sec.category}`}
                            className="flex justify-between gap-4"
                          >
                            <span className="min-w-0 break-words">{sec.category}</span>
                            <span className="tabular-nums shrink-0">
                              {formatIDR(sec.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 space-y-1 text-right text-xs">
                <div>
                  Subtotal : {formatIDR(previewTotals.totalBeforeDisc)}
                </div>
                {form.discountEnabled ? (
                  <div>
                    Diskon {form.discount}% : -
                    {formatIDR(
                      Math.max(
                        0,
                        previewTotals.totalBeforeDisc - previewTotals.totalAfterDisc
                      )
                    )}
                  </div>
                ) : (
                  <div>Diskon : {formatIDR(0)}</div>
                )}
                {form.pphEnabled ? (
                  <div>
                    PPH {form.pphRate}% : {formatIDR(previewTotals.totalPPH)}
                  </div>
                ) : null}
                {form.ppnEnabled ? (
                  <div>
                    PPN {form.ppn}% : {formatIDR(previewTotals.totalPPN)}
                  </div>
                ) : (
                  <div>PPN : {formatIDR(0)}</div>
                )}
                <div className="text-base font-bold text-emerald-800">
                  Grand Total: {formatIDR(previewTotals.grandTotal)}
                </div>
              </div>

              {form.notes ? (
                <div className="mt-6 text-xs">
                  <div className="font-medium">Catatan:</div>
                  <div className="whitespace-pre-wrap">{form.notes}</div>
                </div>
              ) : null}

              <div className="mt-6 text-xs">
                <div className="font-medium">Syarat &amp; Ketentuan:</div>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>Pembayaran : {form.paymentTerms || "—"}</li>
                  <li>Pengiriman : {form.deliveryTerms || "—"}</li>
                  <li>Garansi : {form.warrantyTerms || "—"}</li>
                  <li>Validitas : {form.validityDays} hari</li>
                </ul>
                {form.termsConditions ? (
                  <p className="mt-2 whitespace-pre-wrap">{form.termsConditions}</p>
                ) : null}
              </div>

              <div className="mt-10 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="relative">
                  <div>Dibuat oleh,</div>
                  {effectiveTtdPrepared?.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveTtdPrepared}
                      alt=""
                      className="mx-auto mt-2 max-h-14 object-contain"
                    />
                  ) : (
                    <div className="mt-10" />
                  )}
                  <div className="mt-2 font-medium">{presetSigned}</div>
                </div>
                <div className="relative">
                  <div>Diperiksa,</div>
                  {effectiveTtdReviewed?.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveTtdReviewed}
                      alt=""
                      className="mx-auto mt-2 max-h-14 object-contain"
                    />
                  ) : (
                    <div className="mt-10" />
                  )}
                  <div className="mt-2 font-medium">{presetChecked}</div>
                </div>
                <div className="relative">
                  <div>Disetujui,</div>
                  <div className="relative mx-auto mt-2 flex min-h-[4rem] items-center justify-center">
                    {effectiveTtdApproved?.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={effectiveTtdApproved}
                        alt=""
                        className="relative z-10 max-h-14 object-contain"
                      />
                    ) : (
                      <div className="h-14 w-full max-w-[120px]" />
                    )}
                    {form.status === "approved" && form.stampPath?.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.stampPath}
                        alt=""
                        className="pointer-events-none absolute left-1/2 top-1/2 z-20 max-h-[4.5rem] w-auto -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] object-contain opacity-50"
                      />
                    ) : null}
                  </div>
                  <div className="relative z-[1] mt-2 font-medium">{presetApproved}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
